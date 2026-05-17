const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

function isOpenAIConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function extractOutputText(data) {
  if (typeof data?.output_text === 'string') return data.output_text;

  const chunks = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') chunks.push(content.text);
    }
  }
  return chunks.join('');
}

async function createResponse({ instructions, input, schema, temperature = 0.2 }) {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error('OpenAI API key is not configured');
    error.code = 'OPENAI_NOT_CONFIGURED';
    throw error;
  }

  const body = {
    model: DEFAULT_MODEL,
    instructions,
    input,
    temperature,
  };

  if (schema) {
    body.text = {
      format: {
        type: 'json_schema',
        name: schema.name,
        strict: true,
        schema: schema.schema,
      },
    };
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    const error = new Error(`OpenAI request failed (${response.status}) ${errorText}`.trim());
    error.code = 'OPENAI_REQUEST_FAILED';
    throw error;
  }

  const data = await response.json();
  const outputText = extractOutputText(data);
  if (!outputText) {
    const error = new Error('OpenAI returned an empty response');
    error.code = 'OPENAI_EMPTY_RESPONSE';
    throw error;
  }

  return schema ? JSON.parse(outputText) : outputText;
}

async function recommendRouteWithOpenAI(ticket, developers) {
  return createResponse({
    instructions: [
      'You are Lumina, an AI issue routing assistant for software teams.',
      'Recommend exactly one developer from the provided list.',
      'Use severity, labels, story points, ownership fit, workload, availability, and active issue count.',
      'Keep recommendations advisory and explain them in practical engineering language.',
    ].join(' '),
    input: JSON.stringify({ ticket, developers }, null, 2),
    schema: {
      name: 'routing_recommendation',
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          developer_id: { type: 'string' },
          confidence: { type: 'number' },
          reason: { type: 'string' },
          fallback_developer_id: { type: 'string' },
          risk_notes: { type: 'array', items: { type: 'string' } },
        },
        required: ['developer_id', 'confidence', 'reason', 'fallback_developer_id', 'risk_notes'],
      },
    },
  });
}

async function analyzeIssueWithOpenAI(issueContext) {
  return createResponse({
    instructions: [
      'You are Lumina Codex, an advisory developer assistant.',
      'Analyze the issue and produce concise, developer-ready guidance.',
      'Do not claim code was changed. Do not suggest destructive action without human approval.',
    ].join(' '),
    input: JSON.stringify(issueContext, null, 2),
    schema: {
      name: 'issue_analysis',
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          summary: { type: 'string' },
          reproduction_steps: { type: 'array', items: { type: 'string' } },
          likely_root_cause: { type: 'string' },
          fix_plan: { type: 'array', items: { type: 'string' } },
          risks: { type: 'array', items: { type: 'string' } },
          verification_plan: { type: 'array', items: { type: 'string' } },
          approval_status: { type: 'string', enum: ['awaiting_go', 'approved', 'needs_more_info'] },
        },
        required: [
          'summary',
          'reproduction_steps',
          'likely_root_cause',
          'fix_plan',
          'risks',
          'verification_plan',
          'approval_status',
        ],
      },
    },
  });
}

async function answerTicketQuestionWithOpenAI({ ticket, comments, activity, question }) {
  return createResponse({
    instructions: [
      'You are Lumina support AI.',
      'Answer questions about the ticket using only the provided ticket, comments, and activity context.',
      'Be concise and actionable. If context is missing, say what is missing.',
    ].join(' '),
    input: JSON.stringify({ ticket, comments, activity, question }, null, 2),
    temperature: 0.3,
  });
}

module.exports = {
  analyzeIssueWithOpenAI,
  answerTicketQuestionWithOpenAI,
  isOpenAIConfigured,
  recommendRouteWithOpenAI,
};
