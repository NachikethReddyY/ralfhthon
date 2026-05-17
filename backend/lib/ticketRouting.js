const db = require('../db');
const { recommendRouteWithOpenAI } = require('./openaiClient');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

function loadScore(admin) {
  return admin.p1_count * 3 + admin.p2_count * 2 + admin.p3_count;
}

async function getAdminWorkloads(client = db) {
  const result = await client.query(
    `SELECT u.id,
            u.email,
            u.first_name,
            u.last_name,
            COALESCE(SUM(CASE WHEN t.priority = 'P1' AND t.status IN ('assigned', 'in_progress', 'open') THEN 1 ELSE 0 END), 0)::int AS p1_count,
            COALESCE(SUM(CASE WHEN t.priority = 'P2' AND t.status IN ('assigned', 'in_progress', 'open') THEN 1 ELSE 0 END), 0)::int AS p2_count,
            COALESCE(SUM(CASE WHEN t.priority = 'P3' AND t.status IN ('assigned', 'in_progress', 'open') THEN 1 ELSE 0 END), 0)::int AS p3_count,
            COALESCE(SUM(CASE WHEN t.priority = 'P4' AND t.status IN ('assigned', 'in_progress', 'open') THEN 1 ELSE 0 END), 0)::int AS p4_count,
            COALESCE(COUNT(CASE WHEN t.status IN ('assigned', 'in_progress', 'open') THEN 1 END), 0)::int AS total_open
     FROM users u
     LEFT JOIN ticket_assignment ta
       ON ta.assigned_to = u.id
      AND ta.is_active = TRUE
     LEFT JOIN tickets t
       ON t.id = ta.ticket_id
     WHERE u.role = 'admin' AND u.status = 'active'
     GROUP BY u.id, u.email, u.first_name, u.last_name
     ORDER BY u.first_name, u.last_name`
  );

  return result.rows.map((row) => ({
    ...row,
    load_score: loadScore(row),
  }));
}

function deterministicRoute(ticket, admins) {
  if (!admins.length) {
    return {
      assignedAdminId: null,
      reasoning: 'No active admins are available, so the ticket remains pending routing.',
      source: 'rules',
    };
  }

  const maxP1 = 5;
  const maxTotal = 15;
  let candidates = admins.slice();

  if (ticket.priority === 'P1') {
    candidates.sort((a, b) => a.load_score - b.load_score || a.total_open - b.total_open);
  } else if (ticket.priority === 'P2') {
    candidates = candidates.filter((admin) => admin.p1_count < maxP1);
    if (!candidates.length) candidates = admins.slice();
    candidates.sort((a, b) => a.load_score - b.load_score || a.total_open - b.total_open);
  } else {
    const available = candidates.filter((admin) => admin.total_open < maxTotal);
    candidates = available.length ? available : admins.slice();
    candidates.sort((a, b) => a.load_score - b.load_score || a.total_open - b.total_open);
  }

  const chosen = candidates[0];
  return {
    assignedAdminId: chosen.id,
    reasoning: `Selected ${chosen.first_name} ${chosen.last_name} because they currently have the lowest weighted load (${chosen.load_score}).`,
    source: 'rules',
  };
}

async function routeWithGemini(ticket, admins) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured');
  }

  const prompt = [
    'You are Lumina ticket routing assistant.',
    'Pick exactly one admin id from the provided admins.',
    'Prefer lower weighted workloads.',
    'P1 is most urgent, then P2, then P3, then P4.',
    'Return JSON only with keys: assigned_admin_id, reasoning.',
    JSON.stringify({ ticket, admins }, null, 2),
  ].join('\n\n');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini routing request failed (${response.status})`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
  if (!text) {
    throw new Error('Gemini returned an empty routing response');
  }

  const parsed = JSON.parse(text);
  const match = admins.find((admin) => admin.id === parsed.assigned_admin_id);
  if (!match) {
    throw new Error('Gemini selected an unknown admin');
  }

  return {
    assignedAdminId: match.id,
    reasoning: String(parsed.reasoning || 'Assigned by Gemini based on workload and priority.'),
    source: 'gemini',
  };
}

async function chooseAssignee(ticket, admins) {
  if (!admins.length) {
    return deterministicRoute(ticket, admins);
  }

  try {
    const openAiRouting = await recommendRouteWithOpenAI(
      {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        category: ticket.type,
        priority: ticket.priority,
        labels: ticket.metadata?.labels || [],
        story_points: ticket.metadata?.story_points || null,
      },
      admins.map((admin) => ({
        id: admin.id,
        name: `${admin.first_name} ${admin.last_name}`,
        email: admin.email,
        availability: admin.availability || 'available',
        workload: {
          priority_1_count: admin.p1_count,
          priority_2_count: admin.p2_count,
          priority_3_count: admin.p3_count,
          priority_4_count: admin.p4_count,
          total_open: admin.total_open,
          load_score: admin.load_score,
        },
      }))
    );
    const match = admins.find((admin) => admin.id === openAiRouting.developer_id);
    if (!match) throw new Error('OpenAI selected an unknown admin');

    return {
      assignedAdminId: match.id,
      reasoning: openAiRouting.reason,
      source: 'openai',
      confidence: openAiRouting.confidence,
      fallbackDeveloperId: openAiRouting.fallback_developer_id,
      riskNotes: openAiRouting.risk_notes,
    };
  } catch (error) {
    if (error.code !== 'OPENAI_NOT_CONFIGURED') {
      console.warn(`OpenAI routing fallback: ${error.message}`);
    }
  }

  try {
    return await routeWithGemini(
      {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        category: ticket.type,
        priority: ticket.priority,
      },
      admins.map((admin) => ({
        id: admin.id,
        name: `${admin.first_name} ${admin.last_name}`,
        priority_1_count: admin.p1_count,
        priority_2_count: admin.p2_count,
        priority_3_count: admin.p3_count,
        priority_4_count: admin.p4_count,
        total_open: admin.total_open,
        load_score: admin.load_score,
      }))
    );
  } catch (error) {
    const fallback = deterministicRoute(ticket, admins);
    return {
      ...fallback,
      reasoning: `${fallback.reasoning} Gemini fallback was used because: ${error.message}`,
      source: 'rules_fallback',
    };
  }
}

module.exports = {
  chooseAssignee,
  deterministicRoute,
  getAdminWorkloads,
};
