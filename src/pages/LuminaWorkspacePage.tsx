import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  CircleDot,
  GitBranch,
  GitPullRequestArrow,
  ListFilter,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  UploadCloud,
  UserRound,
} from 'lucide-react';
import './LuminaWorkspacePage.css';

type IssueStatus = 'open' | 'triaged' | 'assigned' | 'in_progress' | 'blocked' | 'resolved';
type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';

type Repository = {
  id: string;
  provider?: 'github';
  name: string;
  owner: string;
  url?: string;
  defaultBranch?: string;
  language: string;
  openIssues?: number;
  syncState?: string;
  syncStatus?: string;
  lastSyncedAt?: string | null;
};

type Developer = {
  id: string;
  name: string;
  role: string;
  availability: 'available' | 'busy' | 'offline';
  workload: number;
  specialties: string[];
  email?: string;
};

type LuminaIssue = {
  id: string;
  source?: 'github' | 'lumina';
  repositoryId: string;
  githubIssueNumber?: number | null;
  githubUrl?: string | null;
  title: string;
  body: string;
  status: IssueStatus;
  severity: IssueSeverity;
  labels: string[];
  author: string;
  assigneeId?: string;
  createdAt: string;
  updatedAt?: string;
  storyPoints: number;
  syncStatus?: string;
  approvalStatus?: 'awaiting_go' | 'approved' | 'needs_more_info';
  routingRecommendation?: RoutingRecommendation | null;
  codexAnalysis?: IssueAnalysis | null;
};

type RoutingRecommendation = {
  issueId: string;
  developerId: string;
  developerName: string;
  confidence: number;
  reason: string;
  fallbackDeveloperId?: string;
  riskNotes?: string[];
  workloadComparison?: Array<{ developerId: string; name: string; workload: number; availability: string }>;
  source: string;
};

type IssueAnalysis = {
  issueId: string;
  summary: string;
  reproduction_steps: string[];
  likely_root_cause: string;
  fix_plan: string[];
  risks: string[];
  verification_plan: string[];
  approval_status: 'awaiting_go' | 'approved' | 'needs_more_info';
  source: string;
};

const repositories: Repository[] = [
  { id: 'repo-web', name: 'lumina-web', owner: 'northstar', language: 'TypeScript', openIssues: 18, syncState: 'Mock data' },
  { id: 'repo-api', name: 'lumina-api', owner: 'northstar', language: 'Node.js', openIssues: 11, syncState: 'Mock data' },
  { id: 'repo-mobile', name: 'field-companion', owner: 'northstar', language: 'React Native', openIssues: 7, syncState: 'Mock data' },
];

const developers: Developer[] = [
  { id: 'dev-ava', name: 'Ava Tan', role: 'Frontend platform', availability: 'available', workload: 4, specialties: ['React', 'Design systems', 'Forms'] },
  { id: 'dev-mateo', name: 'Mateo Cruz', role: 'Backend services', availability: 'busy', workload: 7, specialties: ['API', 'Postgres', 'Auth'] },
  { id: 'dev-priya', name: 'Priya Nair', role: 'Product engineer', availability: 'available', workload: 3, specialties: ['Triage', 'Routing', 'Integrations'] },
];

const seededIssues: LuminaIssue[] = [
  {
    id: 'LUM-124',
    repositoryId: 'repo-web',
    title: 'Issue detail panel loses selected task after refresh',
    body: 'Refreshing the dashboard clears the selected issue and drops the user back to an empty detail state.',
    status: 'triaged',
    severity: 'high',
    labels: ['frontend', 'state', 'regression'],
    author: 'Mina Park',
    assigneeId: 'dev-ava',
    createdAt: '2026-05-15',
    storyPoints: 3,
  },
  {
    id: 'LUM-123',
    repositoryId: 'repo-api',
    title: 'Routing endpoint returns stale workload after reassignment',
    body: 'The recommendation payload uses the old assignment count until the server process restarts.',
    status: 'blocked',
    severity: 'critical',
    labels: ['backend', 'routing', 'cache'],
    author: 'Evan Holt',
    assigneeId: 'dev-mateo',
    createdAt: '2026-05-14',
    storyPoints: 5,
  },
  {
    id: 'LUM-122',
    repositoryId: 'repo-web',
    title: 'Create issue form should preserve labels when validation fails',
    body: 'Submitting without a title clears selected labels, which makes triage slower.',
    status: 'open',
    severity: 'medium',
    labels: ['forms', 'ux'],
    author: 'Nora Lee',
    createdAt: '2026-05-13',
    storyPoints: 2,
  },
  {
    id: 'LUM-121',
    repositoryId: 'repo-mobile',
    title: 'Offline sync banner overlaps issue queue controls',
    body: 'The mobile workspace header covers filters on narrow screens.',
    status: 'in_progress',
    severity: 'low',
    labels: ['mobile', 'layout'],
    author: 'Cal Webb',
    assigneeId: 'dev-priya',
    createdAt: '2026-05-12',
    storyPoints: 1,
  },
];

const statuses: IssueStatus[] = ['open', 'triaged', 'assigned', 'in_progress', 'blocked', 'resolved'];
const severities: IssueSeverity[] = ['critical', 'high', 'medium', 'low'];
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:6001';
const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/api/v1';

function formatStatus(status: IssueStatus): string {
  return status.replace('_', ' ');
}

function LuminaWorkspacePage() {
  const [workspaceRepositories, setWorkspaceRepositories] = useState(repositories);
  const [workspaceDevelopers, setWorkspaceDevelopers] = useState(developers);
  const [issues, setIssues] = useState(seededIssues);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState(repositories[0].id);
  const [selectedIssueId, setSelectedIssueId] = useState(seededIssues[0].id);
  const [query, setQuery] = useState('');
  const [repositoryInput, setRepositoryInput] = useState('');
  const [syncMessage, setSyncMessage] = useState('Demo fallback is ready.');
  const [workspaceBusy, setWorkspaceBusy] = useState<'idle' | 'loading' | 'linking' | 'syncing' | 'syncback' | 'bulk'>('idle');
  const [form, setForm] = useState({
    title: '',
    body: '',
    severity: 'medium' as IssueSeverity,
    labels: 'frontend, triage',
    storyPoints: 2,
  });
  const [routingRecommendation, setRoutingRecommendation] = useState<RoutingRecommendation | null>(null);
  const [issueAnalysis, setIssueAnalysis] = useState<IssueAnalysis | null>(null);
  const [aiState, setAiState] = useState<'idle' | 'routing' | 'analysis'>('idle');

  const visibleIssues = useMemo(() => {
    return issues.filter((issue) => {
      const matchesRepository = issue.repositoryId === selectedRepositoryId;
      const matchesQuery = `${issue.title} ${issue.body} ${issue.labels.join(' ')}`.toLowerCase().includes(query.toLowerCase());
      return matchesRepository && matchesQuery;
    });
  }, [issues, query, selectedRepositoryId]);

  const selectedIssue = issues.find((issue) => issue.id === selectedIssueId) ?? visibleIssues[0] ?? issues[0];
  const selectedRepository = workspaceRepositories.find((repo) => repo.id === selectedRepositoryId) ?? workspaceRepositories[0];
  const assignee = workspaceDevelopers.find((developer) => developer.id === selectedIssue?.assigneeId);

  const statusCounts = statuses.map((status) => ({
    status,
    count: issues.filter((issue) => issue.status === status).length,
  }));

  useEffect(() => {
    void refreshWorkspace(selectedRepositoryId);
    // The initial load intentionally runs once; repository changes trigger refresh from the repository buttons.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateIssueStatus(status: IssueStatus) {
    if (!selectedIssue) return;
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/lumina/issues/${selectedIssue.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (response.ok) {
      const data = (await response.json()) as { issue: LuminaIssue };
      setIssues((currentIssues) => currentIssues.map((issue) => (issue.id === data.issue.id ? data.issue : issue)));
    } else {
      setIssues((currentIssues) =>
        currentIssues.map((issue) => (
          issue.id === selectedIssue.id
            ? { ...issue, status, syncStatus: issue.source === 'github' ? 'pending_sync' : issue.syncStatus }
            : issue
        ))
      );
    }
  }

  async function requestLumina<T>(
    endpoint: string,
    options: { method?: string; body?: Record<string, unknown> } = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/lumina${endpoint}`, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json() as Promise<T>;
  }

  async function postLumina<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    return requestLumina<T>(endpoint, { method: 'POST', body });
  }

  async function refreshWorkspace(repositoryId = selectedRepositoryId) {
    setWorkspaceBusy('loading');
    try {
      const [repositoryData, developerData, issueData] = await Promise.all([
        requestLumina<{ repositories: Repository[] }>('/repositories'),
        requestLumina<{ developers: Developer[] }>('/developers'),
        requestLumina<{ issues: LuminaIssue[] }>(`/issues?repositoryId=${encodeURIComponent(repositoryId)}`),
      ]);
      setWorkspaceRepositories(repositoryData.repositories);
      setWorkspaceDevelopers(developerData.developers);
      setIssues((currentIssues) => {
        const otherIssues = currentIssues.filter((issue) => issue.repositoryId !== repositoryId);
        return [...issueData.issues, ...otherIssues];
      });
      if (issueData.issues[0]) setSelectedIssueId(issueData.issues[0].id);
    } finally {
      setWorkspaceBusy('idle');
    }
  }

  async function linkRepository(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!repositoryInput.trim()) return;
    setWorkspaceBusy('linking');
    try {
      const data = await postLumina<{ repository: Repository; created: boolean }>('/repositories', {
        repository: repositoryInput,
      });
      setWorkspaceRepositories((current) => {
        const withoutDuplicate = current.filter((repo) => repo.id !== data.repository.id);
        return [data.repository, ...withoutDuplicate];
      });
      setSelectedRepositoryId(data.repository.id);
      setRepositoryInput('');
      setSyncMessage(data.created ? 'Repository linked. Ready to import issues.' : 'Repository already linked.');
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Repository link failed.');
    } finally {
      setWorkspaceBusy('idle');
    }
  }

  async function importIssues() {
    if (!selectedRepository) return;
    setWorkspaceBusy('syncing');
    try {
      const data = await postLumina<{
        repository: Repository;
        event: { mode: string; imported: number; updated: number; failed: number };
        issues: LuminaIssue[];
      }>('/sync/import', { repositoryId: selectedRepository.id });
      setWorkspaceRepositories((current) =>
        current.map((repo) => (repo.id === data.repository.id ? data.repository : repo))
      );
      setIssues((currentIssues) => {
        const otherIssues = currentIssues.filter((issue) => issue.repositoryId !== data.repository.id);
        return [...data.issues, ...otherIssues];
      });
      if (data.issues[0]) setSelectedIssueId(data.issues[0].id);
      setSyncMessage(`${data.event.mode} import: ${data.event.imported} imported, ${data.event.updated} updated.`);
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Import failed.');
    } finally {
      setWorkspaceBusy('idle');
    }
  }

  async function runRouting() {
    if (!selectedIssue) return;
    setAiState('routing');
    try {
      const data = await postLumina<{ recommendation: RoutingRecommendation }>('/routing/recommend', {
        issueId: selectedIssue.id,
      });
      setRoutingRecommendation(data.recommendation);
      setIssues((currentIssues) =>
        currentIssues.map((issue) =>
          issue.id === selectedIssue.id ? { ...issue, routingRecommendation: data.recommendation } : issue
        )
      );
    } finally {
      setAiState('idle');
    }
  }

  async function applyRouting() {
    if (!selectedIssue) return;
    const data = await postLumina<{ issue: LuminaIssue }>('/routing/apply', { issueId: selectedIssue.id });
    setIssues((currentIssues) => currentIssues.map((issue) => (issue.id === data.issue.id ? data.issue : issue)));
    setSelectedIssueId(data.issue.id);
  }

  async function bulkRoute() {
    setWorkspaceBusy('bulk');
    try {
      const data = await postLumina<{ recommendations: RoutingRecommendation[]; requiresConfirmation: boolean }>(
        '/routing/bulk',
        { issueIds: visibleIssues.map((issue) => issue.id) }
      );
      const recommendations = new Map(data.recommendations.map((recommendation) => [recommendation.issueId, recommendation]));
      setIssues((currentIssues) =>
        currentIssues.map((issue) =>
          recommendations.has(issue.id) ? { ...issue, routingRecommendation: recommendations.get(issue.id) || null } : issue
        )
      );
      setSyncMessage(`Bulk routing previewed ${data.recommendations.length} issues. Human confirmation is still required.`);
    } finally {
      setWorkspaceBusy('idle');
    }
  }

  async function runAnalysis() {
    if (!selectedIssue) return;
    setAiState('analysis');
    try {
      const data = await postLumina<{ analysis: IssueAnalysis }>('/analysis', { issueId: selectedIssue.id });
      setIssueAnalysis(data.analysis);
      setIssues((currentIssues) =>
        currentIssues.map((issue) =>
          issue.id === selectedIssue.id
            ? { ...issue, codexAnalysis: data.analysis, approvalStatus: data.analysis.approval_status }
            : issue
        )
      );
    } finally {
      setAiState('idle');
    }
  }

  async function updateApproval(approvalStatus: IssueAnalysis['approval_status']) {
    if (!selectedIssue) return;
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/lumina/issues/${selectedIssue.id}/approval`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalStatus }),
    });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const data = (await response.json()) as { issue: LuminaIssue };
    setIssues((currentIssues) => currentIssues.map((issue) => (issue.id === data.issue.id ? data.issue : issue)));
  }

  async function syncBack() {
    if (!selectedIssue) return;
    setWorkspaceBusy('syncback');
    try {
      const data = await postLumina<{ issue: LuminaIssue; event: { mode: string; comment: string } }>('/sync/back', {
        issueId: selectedIssue.id,
      });
      setIssues((currentIssues) => currentIssues.map((issue) => (issue.id === data.issue.id ? data.issue : issue)));
      setSyncMessage(`${data.event.mode} sync-back prepared. ${data.event.comment}`);
    } finally {
      setWorkspaceBusy('idle');
    }
  }

  async function createIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) return;

    const payload = {
      repositoryId: selectedRepositoryId,
      title,
      body: form.body.trim() || 'No description provided yet.',
      severity: form.severity,
      labels: form.labels.split(',').map((label) => label.trim()).filter(Boolean),
      storyPoints: form.storyPoints,
    };

    const data = await postLumina<{ issue: LuminaIssue }>('/issues', payload);
    const issue = data.issue;

    setIssues((currentIssues) => [issue, ...currentIssues]);
    setSelectedIssueId(issue.id);
    setRoutingRecommendation(null);
    setIssueAnalysis(null);
    setForm({ title: '', body: '', severity: 'medium', labels: 'frontend, triage', storyPoints: 2 });
  }

  return (
    <main className="lumina-workspace">
      <aside className="repository-panel" aria-label="Repositories">
        <div className="workspace-brand">
          <div className="workspace-mark">L</div>
          <div>
            <p>Lumina</p>
            <span>Task operations</span>
          </div>
        </div>

        <section>
          <div className="panel-heading">
            <GitBranch size={16} />
            <span>Repositories</span>
          </div>
          <form className="repository-link-form" onSubmit={linkRepository}>
            <input
              aria-label="GitHub repository"
              onChange={(event) => setRepositoryInput(event.target.value)}
              placeholder="owner/repo or GitHub URL"
              value={repositoryInput}
            />
            <button disabled={workspaceBusy !== 'idle'} title="Link repository" type="submit">
              <GitPullRequestArrow size={16} />
            </button>
          </form>
          <div className="repository-list">
            {workspaceRepositories.map((repo) => (
              <button
                className={repo.id === selectedRepositoryId ? 'repository-item active' : 'repository-item'}
                key={repo.id}
                onClick={() => {
                  setSelectedRepositoryId(repo.id);
                  setSelectedIssueId(issues.find((issue) => issue.repositoryId === repo.id)?.id ?? issues[0].id);
                  setRoutingRecommendation(null);
                  setIssueAnalysis(null);
                  void refreshWorkspace(repo.id);
                }}
                type="button"
              >
                <span>{repo.owner}/{repo.name}</span>
                <small>{repo.language} · {repo.openIssues ?? 0} open · {repo.syncStatus ?? repo.syncState}</small>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="panel-heading">
            <UserRound size={16} />
            <span>Developers</span>
          </div>
          <div className="developer-list">
            {workspaceDevelopers.map((developer) => (
              <div className="developer-row" key={developer.id}>
                <div>
                  <strong>{developer.name}</strong>
                  <span>{developer.role}</span>
                </div>
                <small className={`availability ${developer.availability}`}>{developer.workload}</small>
              </div>
            ))}
          </div>
        </section>
      </aside>

      <section className="issue-queue" aria-label="Issue queue">
        <header className="workspace-header">
          <div>
            <span className="eyebrow">{selectedRepository.syncStatus ?? selectedRepository.syncState}</span>
            <h1>{selectedRepository.name}</h1>
          </div>
          <div className="status-strip">
            {statusCounts.map((item) => (
              <span key={item.status}>{formatStatus(item.status)} <strong>{item.count}</strong></span>
            ))}
          </div>
        </header>

        <div className="queue-toolbar">
          <label className="search-box">
            <Search size={16} />
            <input
              aria-label="Search issues"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search issues"
              value={query}
            />
          </label>
          <button className="icon-button" title="Filter issues" type="button">
            <ListFilter size={17} />
          </button>
          <button
            className="icon-button"
            disabled={workspaceBusy !== 'idle'}
            onClick={importIssues}
            title="Import GitHub issues"
            type="button"
          >
            <RefreshCw size={17} />
          </button>
          <button
            className="icon-button"
            disabled={workspaceBusy !== 'idle'}
            onClick={bulkRoute}
            title="Bulk route visible issues"
            type="button"
          >
            <Bot size={17} />
          </button>
        </div>
        <p className="sync-message">{syncMessage}</p>

        <div className="issue-list">
          {visibleIssues.map((issue) => (
            <button
              className={issue.id === selectedIssue?.id ? 'issue-card active' : 'issue-card'}
              key={issue.id}
              onClick={() => {
                setSelectedIssueId(issue.id);
                setRoutingRecommendation(null);
                setIssueAnalysis(null);
              }}
              type="button"
            >
              <div className="issue-card-topline">
                <span>{issue.id}</span>
                <span className={`severity ${issue.severity}`}>{issue.severity}</span>
              </div>
              <h2>{issue.title}</h2>
              <p>{issue.body}</p>
              <div className="issue-meta">
                <span>{formatStatus(issue.status)}</span>
                <span>{issue.storyPoints} pts</span>
                <span>{issue.source ?? 'lumina'}</span>
                <span>{issue.syncStatus ?? 'local'}</span>
                <span>{issue.createdAt}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="issue-detail" aria-label="Selected issue">
        {selectedIssue ? (
          <>
            <div className="detail-kicker">
              <CircleDot size={16} />
              <span>{selectedIssue.id}</span>
            </div>
            <h2>{selectedIssue.title}</h2>
            <p>{selectedIssue.body}</p>

            <div className="label-row">
              {selectedIssue.labels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            <div className="detail-grid">
              <div>
                <span>Status</span>
                <strong>{formatStatus(selectedIssue.status)}</strong>
              </div>
              <div>
                <span>Severity</span>
                <strong>{selectedIssue.severity}</strong>
              </div>
              <div>
                <span>Author</span>
                <strong>{selectedIssue.author}</strong>
              </div>
              <div>
                <span>Assignee</span>
                <strong>{assignee?.name ?? 'Unassigned'}</strong>
              </div>
              <div>
                <span>Approval</span>
                <strong>{selectedIssue.approvalStatus ?? 'awaiting_go'}</strong>
              </div>
              <div>
                <span>Sync</span>
                <strong>{selectedIssue.syncStatus ?? 'local'}</strong>
              </div>
            </div>

            <div className="status-actions">
              {statuses.map((status) => (
                <button
                  className={status === selectedIssue.status ? 'status-button active' : 'status-button'}
                  key={status}
                  onClick={() => void updateIssueStatus(status)}
                  type="button"
                >
                  {formatStatus(status)}
                </button>
              ))}
            </div>

            <div className="status-actions">
              <button
                className={(selectedIssue.approvalStatus ?? 'awaiting_go') === 'awaiting_go' ? 'status-button active' : 'status-button'}
                onClick={() => void updateApproval('awaiting_go')}
                type="button"
              >
                Awaiting go
              </button>
              <button
                className={selectedIssue.approvalStatus === 'approved' ? 'status-button active' : 'status-button'}
                onClick={() => void updateApproval('approved')}
                type="button"
              >
                Approve
              </button>
              <button
                className={selectedIssue.approvalStatus === 'needs_more_info' ? 'status-button active' : 'status-button'}
                onClick={() => void updateApproval('needs_more_info')}
                type="button"
              >
                Needs info
              </button>
              <button
                className="status-button sync-back-button"
                disabled={workspaceBusy !== 'idle'}
                onClick={syncBack}
                type="button"
              >
                <UploadCloud size={15} />
                Sync back
              </button>
            </div>

            <div className="analysis-panel">
              <div>
                <Bot size={17} />
                <strong>Codex analysis preview</strong>
              </div>
              <div className="ai-action-row">
                <button disabled={aiState !== 'idle'} onClick={runRouting} type="button">
                  {aiState === 'routing' ? 'Routing...' : 'Run routing'}
                </button>
                <button disabled={aiState !== 'idle' || !routingRecommendation} onClick={applyRouting} type="button">
                  Apply route
                </button>
                <button disabled={aiState !== 'idle'} onClick={runAnalysis} type="button">
                  {aiState === 'analysis' ? 'Analyzing...' : 'Analyze issue'}
                </button>
              </div>
              {routingRecommendation ? (
                <div className="ai-result-block">
                  <strong>{routingRecommendation.developerName} · {Math.round(routingRecommendation.confidence * 100)}%</strong>
                  <p>{routingRecommendation.reason}</p>
                  {routingRecommendation.workloadComparison ? (
                    <ul>
                      {routingRecommendation.workloadComparison.map((item) => (
                        <li key={item.developerId}>{item.name}: {item.workload} active · {item.availability}</li>
                      ))}
                    </ul>
                  ) : null}
                  <small>{routingRecommendation.source}</small>
                </div>
              ) : (
                <p>Likely owner: {assignee?.name ?? 'Priya Nair'} based on labels, workload, and availability.</p>
              )}
              {issueAnalysis ? (
                <div className="ai-result-block">
                  <strong>{issueAnalysis.summary}</strong>
                  <p>{issueAnalysis.likely_root_cause}</p>
                  <ul>
                    {issueAnalysis.fix_plan.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                  <p>Verification: {issueAnalysis.verification_plan.join(' ')}</p>
                  <small>{issueAnalysis.approval_status} · {issueAnalysis.source}</small>
                </div>
              ) : (
                <p>Suggested verification: reproduce, patch the affected flow, then confirm status persistence and queue refresh.</p>
              )}
            </div>
          </>
        ) : null}
      </section>

      <aside className="action-area" aria-label="Create issue">
        <form onSubmit={createIssue}>
          <div className="form-title">
            <Plus size={17} />
            <h2>Create Lumina issue</h2>
          </div>

          <label>
            Title
            <input
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Short issue title"
              value={form.title}
            />
          </label>

          <label>
            Description
            <textarea
              onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
              placeholder="What happened?"
              rows={4}
              value={form.body}
            />
          </label>

          <div className="form-row">
            <label>
              Severity
              <select
                onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value as IssueSeverity }))}
                value={form.severity}
              >
                {severities.map((severity) => (
                  <option key={severity} value={severity}>{severity}</option>
                ))}
              </select>
            </label>
            <label>
              Points
              <input
                min={1}
                max={8}
                onChange={(event) => setForm((current) => ({ ...current, storyPoints: Number(event.target.value) }))}
                type="number"
                value={form.storyPoints}
              />
            </label>
          </div>

          <label>
            Labels
            <input
              onChange={(event) => setForm((current) => ({ ...current, labels: event.target.value }))}
              value={form.labels}
            />
          </label>

          <button className="primary-action" type="submit">
            <CheckCircle2 size={17} />
            Create issue
          </button>
        </form>

        <div className="routing-card">
          <ShieldAlert size={18} />
          <div>
            <strong>Demo mode</strong>
            <p>Seeded data and mock GitHub import keep the full loop demoable without credentials.</p>
          </div>
        </div>
        <div className="routing-card">
          <AlertCircle size={18} />
          <div>
            <strong>Live-ready hooks</strong>
            <p>Add OpenAI and GitHub keys to switch routing, analysis, import, and sync paths from fallback mode.</p>
          </div>
        </div>
      </aside>
    </main>
  );
}

export default LuminaWorkspacePage;
