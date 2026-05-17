const crypto = require('crypto');
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  validateRatingBody,
  validateTicketAssignmentBody,
  validateTicketCreateBody,
  validateTicketStatusBody,
  validationError,
} = require('../lib/ticketValidation');
const { chooseAssignee, getAdminWorkloads } = require('../lib/ticketRouting');
const { answerTicketQuestionWithOpenAI } = require('../lib/openaiClient');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const values = [];
    const clauses = [];

    if (req.user.role === 'user') {
      values.push(req.user.id);
      clauses.push(`t.submitted_by = $${values.length}`);
    } else if (req.query.scope === 'assigned') {
      values.push(req.user.id);
      clauses.push(
        `EXISTS (
          SELECT 1
          FROM ticket_assignment ta
          WHERE ta.ticket_id = t.id AND ta.assigned_to = $${values.length} AND ta.is_active = TRUE
        )`
      );
    }

    if (req.query.status) {
      values.push(String(req.query.status));
      clauses.push(`t.status = $${values.length}::ticket_status`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT t.id, t.title, t.description, t.type, t.priority, t.status, t.created_at, t.replication_steps,
              t.metadata, c.id AS category_id, c.name AS category_name,
              submitter.id AS submitted_by_id, submitter.email AS submitted_by_email,
              submitter.avatar_url AS submitted_by_avatar_url,
              assignee.id AS assigned_to_id,
              assignee.avatar_url AS assigned_to_avatar_url,
              CONCAT(assignee.first_name, ' ', assignee.last_name) AS assigned_to_name
       FROM tickets t
       JOIN categories c ON c.id = t.category_id
       JOIN users submitter ON submitter.id = t.submitted_by
       LEFT JOIN ticket_assignment ta ON ta.ticket_id = t.id AND ta.is_active = TRUE
       LEFT JOIN users assignee ON assignee.id = ta.assigned_to
       ${where}
       ORDER BY t.created_at DESC`,
      values
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.get('/admin/workload', requireRole('admin', 'super_admin'), async (_req, res, next) => {
  try {
    const data = await getAdminWorkloads();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/activity', async (req, res, next) => {
  try {
    const ticketCheck = await db.query(
      `SELECT id, submitted_by FROM tickets WHERE id = $1`,
      [req.params.id]
    );
    const ticket = ticketCheck.rows[0];
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (req.user.role === 'user' && ticket.submitted_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Status-change audit events for this ticket
    const auditResult = await db.query(
      `SELECT a.id, a.action, a.metadata, a.created_at,
              u.id AS actor_id, u.first_name, u.last_name, u.email AS actor_email, u.role AS actor_role, u.avatar_url
       FROM audit_logs a
       JOIN users u ON u.id = a.actor_id
       WHERE a.metadata->>'ticket_id' = $1
       ORDER BY a.created_at ASC`,
      [req.params.id]
    );

    // Satisfaction rating if exists
    const ratingResult = await db.query(
      `SELECT sr.rating, sr.comment, sr.ticket_id,
              u.first_name, u.last_name, u.email, u.avatar_url
       FROM satisfaction_ratings sr
       JOIN users u ON u.id = sr.rated_by
       WHERE sr.ticket_id = $1`,
      [req.params.id]
    );

    res.json({
      events: auditResult.rows,
      rating: ratingResult.rows[0] || null,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/ask', async (req, res, next) => {
  const question = String(req.body?.question ?? '').trim();
  if (!question) return res.status(400).json({ error: 'question is required' });

  try {
    const [ticketResult, commentsResult, activityResult] = await Promise.all([
      db.query(
        `SELECT t.id, t.title, t.description, t.type, t.priority, t.status, t.created_at,
                t.replication_steps, t.metadata, c.name AS category_name,
                submitter.email AS submitted_by_email,
                CONCAT(assignee.first_name, ' ', assignee.last_name) AS assigned_to_name
         FROM tickets t
         JOIN categories c ON c.id = t.category_id
         JOIN users submitter ON submitter.id = t.submitted_by
         LEFT JOIN ticket_assignment ta ON ta.ticket_id = t.id AND ta.is_active = TRUE
         LEFT JOIN users assignee ON assignee.id = ta.assigned_to
         WHERE t.id = $1`,
        [req.params.id]
      ),
      db.query(
        `SELECT c.body, c.created_at, u.first_name, u.last_name, u.role
         FROM ticket_comments c
         JOIN users u ON u.id = c.author_id
         WHERE c.ticket_id = $1
         ORDER BY c.created_at DESC
         LIMIT 5`,
        [req.params.id]
      ),
      db.query(
        `SELECT a.action, a.metadata, a.created_at, u.first_name, u.last_name, u.role
         FROM audit_logs a
         JOIN users u ON u.id = a.actor_id
         WHERE a.metadata->>'ticket_id' = $1
         ORDER BY a.created_at DESC
         LIMIT 8`,
        [req.params.id]
      ),
    ]);
    const ticket = ticketResult.rows[0];
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (req.user.role === 'user' && ticket.submitted_by_email !== req.user.email) {
      return res.status(403).json({ error: 'Access denied' });
    }

    try {
      const answer = await answerTicketQuestionWithOpenAI({
        ticket,
        comments: commentsResult.rows,
        activity: activityResult.rows,
        question,
      });
      return res.json({ answer, source: 'openai' });
    } catch (error) {
      if (error.code !== 'OPENAI_NOT_CONFIGURED') {
        console.warn(`OpenAI ticket answer fallback: ${error.message}`);
      }
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'AI not configured' });
    const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const prompt = [
      'You are Lumina support AI. Answer the user question about the following support ticket concisely and helpfully.',
      'Use the ticket details, recent comments, and recent activity for context.',
      'Return plain text only, no markdown headings unless helpful.',
      '',
      'Ticket context:',
      JSON.stringify({ ticket, comments: commentsResult.rows, activity: activityResult.rows }, null, 2),
      '',
      `User question: ${question}`,
    ].join('\n');

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4 },
        }),
      }
    );
    if (!geminiRes.ok) return res.status(502).json({ error: 'AI request failed' });
    const data = await geminiRes.json();
    const answer = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    res.json({ answer, source: 'gemini' });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT t.id, t.title, t.description, t.type, t.priority, t.status, t.created_at, t.replication_steps,
              t.metadata, c.id AS category_id, c.name AS category_name,
              submitter.id AS submitted_by_id, submitter.email AS submitted_by_email,
              submitter.avatar_url AS submitted_by_avatar_url,
              assignee.id AS assigned_to_id,
              assignee.avatar_url AS assigned_to_avatar_url,
              CONCAT(assignee.first_name, ' ', assignee.last_name) AS assigned_to_name
       FROM tickets t
       JOIN categories c ON c.id = t.category_id
       JOIN users submitter ON submitter.id = t.submitted_by
       LEFT JOIN ticket_assignment ta ON ta.ticket_id = t.id AND ta.is_active = TRUE
       LEFT JOIN users assignee ON assignee.id = ta.assigned_to
       WHERE t.id = $1`,
      [req.params.id]
    );
    const ticket = result.rows[0];
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (req.user.role === 'user' && ticket.submitted_by_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not have access to this ticket' });
    }
    res.json(ticket);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  const parsed = validateTicketCreateBody(req.body);
  if (!parsed.ok) {
    return res.status(400).json(validationError(parsed.details));
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const category = await client.query(
      `SELECT id, name, is_active FROM categories WHERE id = $1`,
      [parsed.value.categoryId]
    );
    if (!category.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Selected category does not exist' });
    }
    if (!category.rows[0].is_active) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Selected category is not active' });
    }

    const ticketResult = await client.query(
      `INSERT INTO tickets (title, description, category_id, type, priority, status, submitted_by, replication_steps, metadata)
       VALUES ($1, $2, $3, $4::ticket_type, $5::ticket_priority, 'pending_routing'::ticket_status, $6, $7, $8::jsonb)
       RETURNING id, title, description, category_id, type, priority, status, submitted_by, replication_steps, metadata, created_at`,
      [
        parsed.value.title,
        parsed.value.description,
        parsed.value.categoryId,
        parsed.value.type,
        parsed.value.priority,
        req.user.id,
        parsed.value.replicationSteps,
        JSON.stringify({
          submitted_via: 'api',
          request_id: crypto.randomUUID(),
        }),
      ]
    );
    const ticket = ticketResult.rows[0];

    const admins = await getAdminWorkloads(client);
    const routing = await chooseAssignee(ticket, admins);

    let assignedUser = null;
    if (routing.assignedAdminId) {
      await client.query(
        `INSERT INTO ticket_assignment (ticket_id, assigned_to, assigned_by, is_active)
         VALUES ($1, $2, $3, TRUE)`,
        [ticket.id, routing.assignedAdminId, req.user.id]
      );
      await client.query(
        `UPDATE tickets
         SET status = 'assigned'::ticket_status,
             metadata = jsonb_set(
               COALESCE(metadata, '{}'::jsonb),
               '{routing}',
               $2::jsonb,
               true
             )
         WHERE id = $1`,
        [
          ticket.id,
          JSON.stringify({
            source: routing.source,
            assigned_admin_id: routing.assignedAdminId,
            reasoning: routing.reasoning,
          }),
        ]
      );
      const assignedResult = await client.query(
        `SELECT id, first_name, last_name, email FROM users WHERE id = $1`,
        [routing.assignedAdminId]
      );
      assignedUser = assignedResult.rows[0] || null;
    }

    await client.query(
      `INSERT INTO audit_logs (actor_id, action, metadata)
       VALUES ($1, 'ticket_created', $2::jsonb)`,
      [
        req.user.id,
        JSON.stringify({
          ticket_id: ticket.id,
          routing_source: routing.source,
          assigned_admin_id: routing.assignedAdminId,
          routing_reasoning: routing.reasoning,
        }),
      ]
    );

    await client.query('COMMIT');
    res.status(201).json({
      ...ticket,
      category_name: category.rows[0].name,
      assigned_to_id: assignedUser?.id || null,
      assigned_to_name: assignedUser ? `${assignedUser.first_name} ${assignedUser.last_name}` : null,
      routing,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

router.post('/:id/assign', requireRole('admin', 'super_admin'), async (req, res, next) => {
  const parsed = validateTicketAssignmentBody(req.body);
  if (!parsed.ok) {
    return res.status(400).json(validationError(parsed.details));
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const ticket = await client.query(`SELECT id FROM tickets WHERE id = $1`, [req.params.id]);
    if (!ticket.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const assignee = await client.query(
      `SELECT id, first_name, last_name FROM users
       WHERE id = $1 AND role IN ('admin', 'super_admin') AND status = 'active'`,
      [parsed.value.assignedTo]
    );
    if (!assignee.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Assignee must be an active admin user' });
    }

    await client.query(`UPDATE ticket_assignment SET is_active = FALSE WHERE ticket_id = $1 AND is_active = TRUE`, [
      req.params.id,
    ]);
    await client.query(
      `INSERT INTO ticket_assignment (ticket_id, assigned_to, assigned_by, is_active)
       VALUES ($1, $2, $3, TRUE)`,
      [req.params.id, parsed.value.assignedTo, req.user.id]
    );
    await client.query(`UPDATE tickets SET status = 'assigned'::ticket_status WHERE id = $1`, [req.params.id]);
    await client.query(
      `INSERT INTO audit_logs (actor_id, action, metadata)
       VALUES ($1, 'ticket_assigned', $2::jsonb)`,
      [
        req.user.id,
        JSON.stringify({
          ticket_id: req.params.id,
          assigned_to: parsed.value.assignedTo,
        }),
      ]
    );

    await client.query('COMMIT');
    res.json({
      ticketId: req.params.id,
      assignedToId: parsed.value.assignedTo,
      assignedToName: `${assignee.rows[0].first_name} ${assignee.rows[0].last_name}`,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

router.post('/:id/route', requireRole('admin', 'super_admin'), async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT id, title, description, type, priority, metadata
       FROM tickets
       WHERE id = $1`,
      [req.params.id]
    );
    const ticket = result.rows[0];
    if (!ticket) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const admins = await getAdminWorkloads(client);
    const routing = await chooseAssignee(ticket, admins);
    if (!routing.assignedAdminId) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'No admins are available for routing' });
    }

    await client.query(`UPDATE ticket_assignment SET is_active = FALSE WHERE ticket_id = $1 AND is_active = TRUE`, [
      ticket.id,
    ]);
    await client.query(
      `INSERT INTO ticket_assignment (ticket_id, assigned_to, assigned_by, is_active)
       VALUES ($1, $2, $3, TRUE)`,
      [ticket.id, routing.assignedAdminId, req.user.id]
    );
    await client.query(
      `UPDATE tickets
       SET status = 'assigned'::ticket_status,
           metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{routing}', $2::jsonb, true)
       WHERE id = $1`,
      [
        ticket.id,
        JSON.stringify({
          source: routing.source,
          assigned_admin_id: routing.assignedAdminId,
          reasoning: routing.reasoning,
        }),
      ]
    );
    await client.query(
      `INSERT INTO audit_logs (actor_id, action, metadata)
       VALUES ($1, 'ticket_rerouted', $2::jsonb)`,
      [
        req.user.id,
        JSON.stringify({
          ticket_id: ticket.id,
          assigned_admin_id: routing.assignedAdminId,
          source: routing.source,
          reasoning: routing.reasoning,
        }),
      ]
    );
    await client.query('COMMIT');
    res.json({ ticketId: ticket.id, routing });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

router.patch('/:id/status', async (req, res, next) => {
  const parsed = validateTicketStatusBody(req.body);
  if (!parsed.ok) {
    return res.status(400).json(validationError(parsed.details));
  }

  try {
    const result = await db.query(
      `SELECT t.id, t.submitted_by, ta.assigned_to
       FROM tickets t
       LEFT JOIN ticket_assignment ta ON ta.ticket_id = t.id AND ta.is_active = TRUE
       WHERE t.id = $1`,
      [req.params.id]
    );
    const ticket = result.rows[0];
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const canAdmin = ['admin', 'super_admin'].includes(req.user.role);
    const canAssignee = ticket.assigned_to === req.user.id;
    if (!canAdmin && !canAssignee) {
      return res.status(403).json({ error: 'You cannot change this ticket status' });
    }

    const updated = await db.query(
      `UPDATE tickets
       SET status = $2::ticket_status
       WHERE id = $1
       RETURNING id, status`,
      [req.params.id, parsed.value.status]
    );
    await db.query(
      `INSERT INTO audit_logs (actor_id, action, metadata)
       VALUES ($1, 'ticket_status_changed', $2::jsonb)`,
      [
        req.user.id,
        JSON.stringify({
          ticket_id: req.params.id,
          status: parsed.value.status,
        }),
      ]
    );
    res.json(updated.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/rating', async (req, res, next) => {
  const parsed = validateRatingBody(req.body);
  if (!parsed.ok) {
    return res.status(400).json(validationError(parsed.details));
  }

  try {
    const ticket = await db.query(`SELECT id, submitted_by, status FROM tickets WHERE id = $1`, [req.params.id]);
    const row = ticket.rows[0];
    if (!row) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (row.submitted_by !== req.user.id) {
      return res.status(403).json({ error: 'Only the ticket owner can leave a rating' });
    }
    if (!['resolved', 'closed'].includes(row.status)) {
      return res.status(400).json({ error: 'You can rate only resolved or closed tickets' });
    }

    const result = await db.query(
      `INSERT INTO satisfaction_ratings (ticket_id, rated_by, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (ticket_id)
       DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, rated_by = EXCLUDED.rated_by
       RETURNING id, ticket_id, rated_by, rating, comment`,
      [req.params.id, req.user.id, parsed.value.rating, parsed.value.comment]
    );
    await db.query(
      `INSERT INTO audit_logs (actor_id, action, metadata)
       VALUES ($1, 'ticket_rated', $2::jsonb)`,
      [
        req.user.id,
        JSON.stringify({
          ticket_id: req.params.id,
          rating: parsed.value.rating,
        }),
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
