const crypto = require('crypto');
const express = require('express');
const { analyzeIssueWithOpenAI, recommendRouteWithOpenAI } = require('../lib/openaiClient');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const repositories = [
  {
    id: 'repo-web',
    provider: 'github',
    owner: 'northstar',
    name: 'lumina-web',
    url: 'https://github.com/northstar/lumina-web',
    defaultBranch: 'main',
    language: 'TypeScript',
    openIssues: 18,
    syncStatus: 'mock_ready',
    lastSyncedAt: null,
  },
  {
    id: 'repo-api',
    provider: 'github',
    owner: 'northstar',
    name: 'lumina-api',
    url: 'https://github.com/northstar/lumina-api',
    defaultBranch: 'main',
    language: 'Node.js',
    openIssues: 11,
    syncStatus: 'mock_ready',
    lastSyncedAt: null,
  },
  {
    id: 'repo-mobile',
    provider: 'github',
    owner: 'northstar',
    name: 'field-companion',
    url: 'https://github.com/northstar/field-companion',
    defaultBranch: 'main',
    language: 'React Native',
    openIssues: 7,
    syncStatus: 'mock_ready',
    lastSyncedAt: null,
  },
];

const developers = [
  {
    id: 'dev-cj',
    name: 'CJ',
    email: 'cj@ralfhton.test',
    githubLogin: 'cj',
    role: 'Full-stack developer',
    availability: 'available',
    workload: 4,
    specialties: ['React', 'Supabase', 'GitHub'],
  },
  {
    id: 'dev-chong-hao',
    name: 'Chong Hao',
    email: 'chonghao@ralfhton.test',
    githubLogin: 'chonghao',
    role: 'Backend and AI',
    availability: 'busy',
    workload: 7,
    specialties: ['API', 'Gemini', 'Routing'],
  },
];

let issues = [
  {
    id: 'LUM-124',
    source: 'lumina',
    repositoryId: 'repo-web',
    githubIssueNumber: null,
    githubUrl: null,
    title: 'Issue detail panel loses selected task after refresh',
    body: 'Refreshing the dashboard clears the selected issue and drops the user back to an empty detail state.',
    status: 'triaged',
    severity: 'high',
    labels: ['frontend', 'state', 'regression'],
    author: 'Mina Park',
    assigneeId: 'dev-cj',
    createdAt: '2026-05-15',
    updatedAt: '2026-05-15',
    storyPoints: 3,
    syncStatus: 'local_only',
    approvalStatus: 'awaiting_go',
    routingRecommendation: null,
    codexAnalysis: null,
  },
  {
    id: 'LUM-123',
    source: 'lumina',
    repositoryId: 'repo-api',
    githubIssueNumber: null,
    githubUrl: null,
    title: 'Routing endpoint returns stale workload after reassignment',
    body: 'The recommendation payload uses the old assignment count until the server process restarts.',
    status: 'blocked',
    severity: 'critical',
    labels: ['backend', 'routing', 'cache'],
    author: 'Evan Holt',
    assigneeId: 'dev-chong-hao',
    createdAt: '2026-05-14',
    updatedAt: '2026-05-14',
    storyPoints: 5,
    syncStatus: 'local_only',
    approvalStatus: 'needs_more_info',
    routingRecommendation: null,
    codexAnalysis: null,
  },
  {
    id: 'LUM-122',
    source: 'github',
    repositoryId: 'repo-web',
    githubIssueNumber: 82,
    githubUrl: 'https://github.com/northstar/lumina-web/issues/82',
    title: 'Create issue form should preserve labels when validation fails',
    body: 'Submitting without a title clears selected labels, which makes triage slower.',
    status: 'open',
    severity: 'medium',
    labels: ['forms', 'ux'],
    author: 'Nora Lee',
    createdAt: '2026-05-13',
    updatedAt: '2026-05-13',
    storyPoints: 2,
    syncStatus: 'synced',
    approvalStatus: 'awaiting_go',
    routingRecommendation: null,
    codexAnalysis: null,
  },
];

const syncEvents = [];
const auditEvents = [];

function nowDate() {
  return new Date().toISOString();
}

function nextIssueId() {
  const max = Math.max(...issues.map((issue) => Number(String(issue.id).replace('LUM-', '')) || 0), 100);
  return `LUM-${max + 1}`;
}

function parseRepositoryInput(input) {
  const value = String(input || '').trim();
  const match = value.match(/github\.com\/([^/]+)\/([^/#?]+)/i) || value.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (!match) return null;
  return {
    owner: match[1],
    name: match[2].replace(/\.git$/, ''),
  };
}

function deriveSeverity(labels = []) {
  const normalized = labels.map((label) => String(label).toLowerCase());
  if (normalized.some((label) => ['p0', 'p1', 'critical', 'sev1'].includes(label))) return 'critical';
  if (normalized.some((label) => ['high', 'p2', 'sev2'].includes(label))) return 'high';
  if (normalized.some((label) => ['low', 'p4'].includes(label))) return 'low';
  return 'medium';
}

function demoGithubIssues(repositoryId) {
  return [
    {
      number: 91,
      html_url: 'https://github.com/demo/repo/issues/91',
      title: 'Webhook retry banner stays visible after successful sync',
      body: 'After retrying a failed GitHub sync, the warning banner remains until refresh.',
      labels: [{ name: 'bug' }, { name: 'sync' }, { name: 'high' }],
      user: { login: 'demo-reporter' },
      state: 'open',
      created_at: '2026-05-16T10:00:00Z',
      updated_at: '2026-05-16T10:30:00Z',
      repositoryId,
    },
    {
      number: 92,
      html_url: 'https://github.com/demo/repo/issues/92',
      title: 'Bulk routing preview should show fallback owner',
      body: 'The preview table lacks fallback assignee data for low-confidence routes.',
      labels: [{ name: 'feature' }, { name: 'routing' }],
      user: { login: 'ops-lead' },
      state: 'open',
      created_at: '2026-05-16T11:00:00Z',
      updated_at: '2026-05-16T11:20:00Z',
      repositoryId,
    },
  ];
}

function githubToken() {
  if (process.env.LUMINA_GITHUB_MODE === 'mock') return '';
  return process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || '';
}

async function githubRequest(path, options = {}) {
  const token = githubToken();
  if (!token) {
    const error = new Error('GitHub token is not configured');
    error.code = 'GITHUB_NOT_CONFIGURED';
    throw error;
  }

  const response = await fetch(`https://api.github.com${path}`, {
    method: options.method || 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Lumina-MVP',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = body?.message || `GitHub request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

function issueSyncComment(issue, repository, assignee) {
  const analysis = issue.codexAnalysis;
  const routing = issue.routingRecommendation;
  const fixPlan = analysis?.fix_plan?.length
    ? analysis.fix_plan.map((step, index) => `${index + 1}. ${step}`).join('\n')
    : 'Run Lumina analysis before implementation for a fuller fix plan.';
  const verification = analysis?.verification_plan?.length
    ? analysis.verification_plan.map((step, index) => `${index + 1}. ${step}`).join('\n')
    : 'Verify reproduction, patch behavior, and confirm no visual regressions.';

  return [
    '## Lumina developer handoff',
    '',
    `Repository: ${repository.owner}/${repository.name}`,
    `Lumina issue: ${issue.id}`,
    `Status: ${issue.status}`,
    `Severity: ${issue.severity}`,
    `Assignee: ${assignee?.name || 'Unassigned'}`,
    routing ? `AI route: ${routing.developerName} (${Math.round(routing.confidence * 100)}%)` : 'AI route: not run yet',
    '',
    '### Suggested fix outline',
    fixPlan,
    '',
    '### Verification',
    verification,
    '',
    `Approval: ${issue.approvalStatus || 'awaiting_go'}`,
  ].join('\n');
}

function upsertGithubIssue(repositoryId, githubIssue) {
  const labels = (githubIssue.labels || []).map((label) => (typeof label === 'string' ? label : label.name)).filter(Boolean);
  const existing = issues.find(
    (issue) => issue.repositoryId === repositoryId && issue.githubIssueNumber === githubIssue.number
  );
  const patch = {
    source: 'github',
    repositoryId,
    githubIssueNumber: githubIssue.number,
    githubUrl: githubIssue.html_url,
    title: githubIssue.title,
    body: githubIssue.body || 'No GitHub issue body provided.',
    status: githubIssue.state === 'closed' ? 'resolved' : existing?.status || 'open',
    severity: deriveSeverity(labels),
    labels,
    author: githubIssue.user?.login || 'github-user',
    createdAt: String(githubIssue.created_at || nowDate()).slice(0, 10),
    updatedAt: String(githubIssue.updated_at || nowDate()).slice(0, 10),
    storyPoints: existing?.storyPoints || 2,
    syncStatus: 'synced',
    approvalStatus: existing?.approvalStatus || 'awaiting_go',
    routingRecommendation: existing?.routingRecommendation || null,
    codexAnalysis: existing?.codexAnalysis || null,
  };

  if (existing) {
    Object.assign(existing, patch);
    return { issue: existing, created: false };
  }

  const issue = { id: nextIssueId(), ...patch };
  issues = [issue, ...issues];
  return { issue, created: true };
}

async function fetchGithubIssues(repository) {
  if (!githubToken()) return { mode: 'mock', items: demoGithubIssues(repository.id) };

  const items = await githubRequest(
    `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}/issues?state=open&per_page=50`
  );
  return { mode: 'live', items: items.filter((item) => !item.pull_request) };
}

async function syncIssueToGithub(issue, repository) {
  if (!githubToken()) return { mode: 'mock', githubIssue: null, comment: null };

  const assignee = developers.find((developer) => developer.id === issue.assigneeId);
  const owner = encodeURIComponent(repository.owner);
  const repo = encodeURIComponent(repository.name);
  let githubIssue = null;

  if (issue.githubIssueNumber) {
    githubIssue = await githubRequest(`/repos/${owner}/${repo}/issues/${issue.githubIssueNumber}`, {
      method: 'PATCH',
      body: {
        state: issue.status === 'resolved' ? 'closed' : 'open',
        labels: issue.labels,
      },
    });
  } else {
    githubIssue = await githubRequest(`/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      body: {
        title: issue.title,
        body: [
          issue.body,
          '',
          '---',
          'Created from Lumina developer issue operations.',
          `Severity: ${issue.severity}`,
          `Story points: ${issue.storyPoints}`,
        ].join('\n'),
        labels: issue.labels,
      },
    });
    issue.source = 'github';
    issue.githubIssueNumber = githubIssue.number;
    issue.githubUrl = githubIssue.html_url;
  }

  const comment = await githubRequest(`/repos/${owner}/${repo}/issues/${issue.githubIssueNumber}/comments`, {
    method: 'POST',
    body: {
      body: issueSyncComment(issue, repository, assignee),
    },
  });

  return { mode: 'live', githubIssue, comment };
}

function audit(action, metadata) {
  auditEvents.unshift({
    id: crypto.randomUUID(),
    action,
    metadata,
    createdAt: nowDate(),
  });
}

router.get('/repositories', (_req, res) => {
  res.json({ repositories });
});

router.post('/repositories', (req, res) => {
  const parsed = parseRepositoryInput(req.body.repository);
  if (!parsed) return res.status(400).json({ error: 'Repository must be a GitHub URL or owner/repo' });

  const existing = repositories.find((repo) => repo.owner === parsed.owner && repo.name === parsed.name);
  if (existing) return res.json({ repository: existing, created: false });

  const repository = {
    id: `repo-${crypto.randomUUID().slice(0, 8)}`,
    provider: 'github',
    owner: parsed.owner,
    name: parsed.name,
    url: `https://github.com/${parsed.owner}/${parsed.name}`,
    defaultBranch: 'main',
    language: 'Unknown',
    openIssues: 0,
    syncStatus: 'linked',
    lastSyncedAt: null,
  };
  repositories.unshift(repository);
  audit('repository_linked', { repositoryId: repository.id, owner: repository.owner, name: repository.name });
  res.status(201).json({ repository, created: true });
});

router.get('/github/status', async (_req, res) => {
  if (!githubToken()) {
    return res.json({
      configured: false,
      mode: 'mock',
      message: 'GitHub token is not configured. Imports and sync-back use mock mode.',
    });
  }

  try {
    const viewer = await githubRequest('/user');
    return res.json({
      configured: true,
      mode: 'live',
      login: viewer.login,
      message: 'GitHub token is valid. Live import and issue sync are available.',
    });
  } catch (error) {
    return res.status(502).json({
      configured: true,
      mode: 'error',
      message: error.message,
    });
  }
});

router.get('/developers', (_req, res) => {
  res.json({ developers });
});

router.get('/issues', (req, res) => {
  const repositoryId = req.query.repositoryId;
  res.json({
    issues: repositoryId ? issues.filter((issue) => issue.repositoryId === repositoryId) : issues,
  });
});

router.post('/issues', (req, res) => {
  const issue = {
    id: nextIssueId(),
    source: 'lumina',
    repositoryId: req.body.repositoryId || repositories[0].id,
    githubIssueNumber: null,
    githubUrl: null,
    title: String(req.body.title || '').trim(),
    body: String(req.body.body || '').trim() || 'No description provided yet.',
    status: 'open',
    severity: req.body.severity || 'medium',
    labels: Array.isArray(req.body.labels) ? req.body.labels : [],
    author: req.body.author || 'Demo user',
    createdAt: nowDate().slice(0, 10),
    updatedAt: nowDate().slice(0, 10),
    storyPoints: Number(req.body.storyPoints || 2),
    syncStatus: 'local_only',
    approvalStatus: 'awaiting_go',
    routingRecommendation: null,
    codexAnalysis: null,
  };
  if (!issue.title) return res.status(400).json({ error: 'title is required' });

  issues = [issue, ...issues];
  audit('issue_created', { issueId: issue.id, source: issue.source });
  res.status(201).json({ issue });
});

router.post('/sync/import', async (req, res) => {
  const repository = repositories.find((repo) => repo.id === req.body.repositoryId);
  if (!repository) return res.status(404).json({ error: 'Repository not found' });

  try {
    repository.syncStatus = 'syncing';
    const result = await fetchGithubIssues(repository);
    const imports = result.items.map((item) => upsertGithubIssue(repository.id, item));
    repository.openIssues = issues.filter((issue) => issue.repositoryId === repository.id && issue.status !== 'resolved').length;
    repository.syncStatus = result.mode === 'live' ? 'synced' : 'mock_synced';
    repository.lastSyncedAt = nowDate();
    const event = {
      id: crypto.randomUUID(),
      repositoryId: repository.id,
      mode: result.mode,
      imported: imports.filter((item) => item.created).length,
      updated: imports.filter((item) => !item.created).length,
      failed: 0,
      createdAt: nowDate(),
    };
    syncEvents.unshift(event);
    audit('github_import_completed', event);
    res.json({ repository, event, issues: issues.filter((issue) => issue.repositoryId === repository.id) });
  } catch (error) {
    repository.syncStatus = 'failed';
    const event = {
      id: crypto.randomUUID(),
      repositoryId: repository.id,
      mode: 'live',
      imported: 0,
      updated: 0,
      failed: 1,
      error: error.message,
      createdAt: nowDate(),
    };
    syncEvents.unshift(event);
    res.status(502).json({ error: error.message, event });
  }
});

router.get('/sync/events', (_req, res) => {
  res.json({ events: syncEvents });
});

router.patch('/issues/:issueId/status', (req, res) => {
  const allowedStatuses = ['open', 'triaged', 'assigned', 'in_progress', 'blocked', 'resolved'];
  if (!allowedStatuses.includes(req.body.status)) return res.status(400).json({ error: 'Invalid status' });

  const issue = issues.find((currentIssue) => currentIssue.id === req.params.issueId);
  if (!issue) return res.status(404).json({ error: 'Issue not found' });

  issue.status = req.body.status;
  issue.updatedAt = nowDate().slice(0, 10);
  issue.syncStatus = issue.source === 'github' ? 'pending_sync' : issue.syncStatus;
  audit('issue_status_updated', { issueId: issue.id, status: issue.status });
  res.json({ issue });
});

router.patch('/issues/:issueId/approval', (req, res) => {
  const allowed = ['awaiting_go', 'approved', 'needs_more_info'];
  if (!allowed.includes(req.body.approvalStatus)) return res.status(400).json({ error: 'Invalid approval status' });

  const issue = issues.find((currentIssue) => currentIssue.id === req.params.issueId);
  if (!issue) return res.status(404).json({ error: 'Issue not found' });

  issue.approvalStatus = req.body.approvalStatus;
  issue.updatedAt = nowDate().slice(0, 10);
  audit('issue_approval_updated', { issueId: issue.id, approvalStatus: issue.approvalStatus });
  res.json({ issue });
});

router.post('/routing/recommend', async (req, res) => {
  const issue = issues.find((currentIssue) => currentIssue.id === req.body.issueId) || issues[0];
  try {
    const recommendation = await recommendRouteWithOpenAI(issue, developers);
    const developer = developers.find((currentDeveloper) => currentDeveloper.id === recommendation.developer_id);
    const payload = {
      issueId: issue.id,
      developerId: recommendation.developer_id,
      developerName: developer?.name || recommendation.developer_id,
      confidence: recommendation.confidence,
      reason: recommendation.reason,
      fallbackDeveloperId: recommendation.fallback_developer_id,
      riskNotes: recommendation.risk_notes,
      workloadComparison: developers.map((developerItem) => ({
        developerId: developerItem.id,
        name: developerItem.name,
        workload: developerItem.workload,
        availability: developerItem.availability,
      })),
      source: 'openai',
    };
    issue.routingRecommendation = payload;
    audit('routing_recommended', payload);
    return res.json({ recommendation: payload });
  } catch (_error) {
    const developer = developers.find((currentDeveloper) => currentDeveloper.availability === 'available') || developers[0];
    const payload = {
      issueId: issue.id,
      developerId: developer.id,
      developerName: developer.name,
      confidence: 0.82,
      reason: 'Recommended from label fit, lower workload, and current availability.',
      fallbackDeveloperId: developers[1]?.id || developer.id,
      riskNotes: ['OpenAI is not configured or unavailable, so rules fallback was used.'],
      workloadComparison: developers.map((developerItem) => ({
        developerId: developerItem.id,
        name: developerItem.name,
        workload: developerItem.workload,
        availability: developerItem.availability,
      })),
      source: 'rules_fallback',
    };
    issue.routingRecommendation = payload;
    audit('routing_recommended', payload);
    return res.json({ recommendation: payload });
  }
});

router.post('/routing/apply', (req, res) => {
  const issue = issues.find((currentIssue) => currentIssue.id === req.body.issueId);
  if (!issue) return res.status(404).json({ error: 'Issue not found' });
  const recommendation = issue.routingRecommendation;
  if (!recommendation) return res.status(409).json({ error: 'Run routing before applying it' });

  issue.assigneeId = recommendation.developerId;
  issue.status = issue.status === 'open' || issue.status === 'triaged' ? 'assigned' : issue.status;
  issue.syncStatus = issue.source === 'github' ? 'pending_sync' : issue.syncStatus;
  issue.updatedAt = nowDate().slice(0, 10);
  audit('routing_applied', { issueId: issue.id, developerId: issue.assigneeId });
  res.json({ issue });
});

router.post('/routing/handoff', (req, res) => {
  const issue = issues.find((currentIssue) => currentIssue.id === req.body.issueId);
  if (!issue) return res.status(404).json({ error: 'Issue not found' });

  const excluded = new Set([issue.assigneeId].filter(Boolean));
  const explicitTarget = developers.find((developer) => developer.id === req.body.developerId);
  const nextAvailable = developers
    .filter((developer) => developer.availability === 'available' && !excluded.has(developer.id))
    .sort((a, b) => a.workload - b.workload)[0];
  const target = explicitTarget || nextAvailable || [...developers].sort((a, b) => a.workload - b.workload)[0];
  if (!target) return res.status(409).json({ error: 'No developer is available for handoff' });

  const previousAssigneeId = issue.assigneeId || null;
  issue.assigneeId = target.id;
  issue.status = issue.status === 'open' || issue.status === 'triaged' ? 'assigned' : issue.status;
  issue.syncStatus = issue.source === 'github' ? 'pending_sync' : issue.syncStatus;
  issue.updatedAt = nowDate().slice(0, 10);
  issue.routingRecommendation = {
    issueId: issue.id,
    developerId: target.id,
    developerName: target.name,
    confidence: explicitTarget ? 0.9 : 0.78,
    reason: explicitTarget
      ? 'Manual developer handoff selected by the current owner.'
      : 'Next available developer selected by workload and availability.',
    fallbackDeveloperId: previousAssigneeId || undefined,
    riskNotes: previousAssigneeId ? ['Previous owner remains visible in audit history for context.'] : [],
    workloadComparison: developers.map((developerItem) => ({
      developerId: developerItem.id,
      name: developerItem.name,
      workload: developerItem.workload,
      availability: developerItem.availability,
    })),
    source: explicitTarget ? 'manual_handoff' : 'availability_handoff',
  };

  audit('developer_handoff_completed', {
    issueId: issue.id,
    previousAssigneeId,
    developerId: target.id,
    source: issue.routingRecommendation.source,
  });
  res.json({ issue, recommendation: issue.routingRecommendation });
});

router.post('/routing/bulk', (req, res) => {
  const requestedIssueIds = Array.isArray(req.body.issueIds) ? req.body.issueIds : issues.map((issue) => issue.id);
  const targetIssues = issues.filter((issue) => requestedIssueIds.includes(issue.id));
  const available = developers.filter((developer) => developer.availability === 'available');

  const recommendations = targetIssues.map((issue, index) => {
    const developer = available[index % available.length] || developers[0];
    const payload = {
      issueId: issue.id,
      developerId: developer.id,
      developerName: developer.name,
      confidence: 0.74,
      reason: 'Bulk preview recommendation based on availability and workload.',
      source: 'rules',
    };
    issue.routingRecommendation = payload;
    return payload;
  });
  audit('bulk_routing_previewed', { count: recommendations.length });
  res.json({ recommendations, requiresConfirmation: true });
});

router.post('/analysis', async (req, res) => {
  const issue = issues.find((currentIssue) => currentIssue.id === req.body.issueId) || issues[0];
  const repository = repositories.find((currentRepository) => currentRepository.id === issue.repositoryId);
  const assignee = developers.find((developer) => developer.id === issue.assigneeId);

  try {
    const analysis = await analyzeIssueWithOpenAI({ issue, repository, assignee });
    issue.codexAnalysis = { issueId: issue.id, ...analysis, source: 'openai' };
  } catch (_error) {
    issue.codexAnalysis = {
      issueId: issue.id,
      summary: issue.body,
      reproduction_steps: ['Open the workspace', `Select ${issue.id}`, 'Perform the reported workflow'],
      likely_root_cause: 'The affected workflow is not preserving local task state across updates.',
      fix_plan: ['Reproduce the failure', 'Patch the affected state transition', 'Add regression coverage'],
      risks: ['Status and assignment state can drift if API persistence is added without conflict handling.'],
      verification_plan: ['Create an issue', 'Update its status', 'Confirm the selected issue remains visible'],
      approval_status: issue.approvalStatus,
      source: 'rules_fallback',
    };
  }
  issue.approvalStatus = issue.codexAnalysis.approval_status || 'awaiting_go';
  audit('issue_analyzed', { issueId: issue.id, source: issue.codexAnalysis.source });
  res.json({ analysis: issue.codexAnalysis });
});

router.post('/sync/back', async (req, res) => {
  const issue = issues.find((currentIssue) => currentIssue.id === req.body.issueId);
  if (!issue) return res.status(404).json({ error: 'Issue not found' });
  const repository = repositories.find((currentRepository) => currentRepository.id === issue.repositoryId);
  if (!repository) return res.status(404).json({ error: 'Repository not found' });

  try {
    const result = await syncIssueToGithub(issue, repository);
    const event = {
      id: crypto.randomUUID(),
      issueId: issue.id,
      repositoryId: issue.repositoryId,
      mode: result.mode,
      githubIssueNumber: issue.githubIssueNumber || null,
      githubUrl: issue.githubUrl || null,
      statusSynced: issue.status,
      labelsSynced: issue.labels,
      assigneeSynced: issue.assigneeId || null,
      comment:
        issue.approvalStatus === 'approved'
          ? 'Lumina analysis approved. GitHub issue and handoff comment synced.'
          : 'Lumina task metadata synced. Awaiting developer approval.',
      createdAt: nowDate(),
    };
    issue.syncStatus = result.mode === 'live' ? 'synced' : 'mock_synced';
    issue.updatedAt = nowDate().slice(0, 10);
    syncEvents.unshift(event);
    audit('github_sync_back_completed', event);
    return res.json({ issue, event });
  } catch (error) {
    issue.syncStatus = 'sync_failed';
    const event = {
      id: crypto.randomUUID(),
      issueId: issue.id,
      repositoryId: issue.repositoryId,
      mode: 'live',
      failed: 1,
      error: error.message,
      createdAt: nowDate(),
    };
    syncEvents.unshift(event);
    audit('github_sync_back_failed', event);
    return res.status(502).json({ error: error.message, event });
  }
});

router.get('/audit', (_req, res) => {
  res.json({ events: auditEvents });
});

module.exports = router;
