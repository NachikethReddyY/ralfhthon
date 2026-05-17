const assert = require('assert/strict');
const http = require('http');
const { createApp } = require('../app');

process.env.LUMINA_GITHUB_MODE = 'mock';

function request(baseUrl, path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  return fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  }).then(async (response) => {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${JSON.stringify(body)}`);
    }
    return body;
  });
}

async function main() {
  const app = createApp();
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const login = await request(baseUrl, '/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'super@ralfhton.test', password: 'Testpass1' },
    });
    const authHeaders = { Authorization: `Bearer ${login.accessToken}` };

    const repositories = await request(baseUrl, '/api/v1/lumina/repositories', { headers: authHeaders });
    assert.ok(repositories.repositories.length >= 1);
    const repositoryId = repositories.repositories[0].id;

    const linked = await request(baseUrl, '/api/v1/lumina/repositories', {
      method: 'POST',
      headers: authHeaders,
      body: { repository: 'openai/openai-node' },
    });
    assert.equal(linked.repository.owner, 'openai');

    const imported = await request(baseUrl, '/api/v1/lumina/sync/import', {
      method: 'POST',
      headers: authHeaders,
      body: { repositoryId },
    });
    assert.ok(imported.issues.length >= 1);
    const issueId = imported.issues[0].id;

    const routed = await request(baseUrl, '/api/v1/lumina/routing/recommend', {
      method: 'POST',
      headers: authHeaders,
      body: { issueId },
    });
    assert.ok(routed.recommendation.developerId);

    const applied = await request(baseUrl, '/api/v1/lumina/routing/apply', {
      method: 'POST',
      headers: authHeaders,
      body: { issueId },
    });
    assert.ok(applied.issue.assigneeId);

    const analyzed = await request(baseUrl, '/api/v1/lumina/analysis', {
      method: 'POST',
      headers: authHeaders,
      body: { issueId },
    });
    assert.ok(analyzed.analysis.summary);

    const approved = await request(baseUrl, `/api/v1/lumina/issues/${issueId}/approval`, {
      method: 'PATCH',
      headers: authHeaders,
      body: { approvalStatus: 'approved' },
    });
    assert.equal(approved.issue.approvalStatus, 'approved');

    const synced = await request(baseUrl, '/api/v1/lumina/sync/back', {
      method: 'POST',
      headers: authHeaders,
      body: { issueId },
    });
    assert.ok(synced.event.comment);

    console.log('Lumina smoke test passed');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
