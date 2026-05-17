import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { ChevronLeft, ChevronRight, ExternalLink, X, CheckCircle2 } from 'lucide-react';
import Button from '../components/Button';
import Container from '../components/Container';
import DashboardLayout from '../components/DashboardLayout';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { categoriesApi, ticketsApi, type ApiCategory, type ApiTicket } from '../utils/apiClient';
import './Dashboard.css';

const PRIORITY_COLOR: Record<string, string> = {
  P1: '#ff3b30', P2: '#ff9500', P3: '#34c759', P4: '#6b7280',
};
const STATUS_COLOR: Record<string, string> = {
  open: '#ff6b6b', assigned: '#60a5fa', in_progress: '#fbbf24',
  resolved: '#34c759', closed: '#6b7280', on_hold: '#9ca3af', pending_routing: '#d97706',
};

function buildDailyLine(tickets: ApiTicket[]) {
  const days: Record<string, number> = {};
  const now = Date.now();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    days[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0;
  }
  tickets.forEach((t) => {
    const label = new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (label in days) days[label]++;
  });
  return Object.entries(days).map(([date, count]) => ({ date, count }));
}

function buildStatusBar(tickets: ApiTicket[]) {
  const map: Record<string, number> = {};
  tickets.forEach((t) => { map[t.status] = (map[t.status] || 0) + 1; });
  return Object.entries(map).map(([status, count]) => ({
    status: status.replace(/_/g, ' '),
    count,
    fill: STATUS_COLOR[status] || '#6b7280',
  }));
}

const PAGE_SIZE = 10;

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', padding: '8px 12px', borderRadius: '8px' }}>
      <p style={{ color: '#6b7280', fontSize: '11px', margin: '0 0 2px' }}>{label}</p>
      <p style={{ color: '#f7f8f8', fontSize: '14px', fontWeight: 600, margin: 0 }}>{payload[0].value}</p>
    </div>
  );
};

export function UserDashboard() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState('');
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    categoryId: '',
    type: 'software' as 'hardware' | 'software' | 'bug',
    priority: 'P2' as 'P1' | 'P2' | 'P3' | 'P4',
    replicationSteps: '',
  });

  // Cmd+N / Ctrl+N to open new ticket modal
  const openNewTicket = useCallback(() => setShowNewTicket(true), []);
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        openNewTicket();
      }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [openNewTicket]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ticketsRes, categoriesRes] = await Promise.all([ticketsApi.list(), categoriesApi.list()]);
        const [ticketsBody, categoriesBody] = await Promise.all([ticketsRes.json(), categoriesRes.json()]);
        if (cancelled) return;
        const loadedCategories = Array.isArray(categoriesBody) ? categoriesBody : [];
        setTickets(Array.isArray(ticketsBody) ? ticketsBody : []);
        setCategories(loadedCategories);
        setNewTicket((prev) => ({ ...prev, categoryId: prev.categoryId || loadedCategories[0]?.id || '' }));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const statusOk = filterStatus === 'all' || t.status === filterStatus;
      const priorityOk = filterPriority === 'all' || t.priority === filterPriority;
      return statusOk && priorityOk;
    });
  }, [tickets, filterStatus, filterPriority]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleResolve = async (ticketId: string) => {
    const res = await ticketsApi.updateStatus(ticketId, 'resolved');
    if (res.ok) {
      setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status: 'resolved' } : t));
    }
  };

  const openCount = tickets.filter((t) => ['open', 'assigned', 'in_progress', 'pending_routing'].includes(t.status)).length;
  const resolvedCount = tickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length;

  const dailyLine = useMemo(() => buildDailyLine(tickets), [tickets]);
  const statusBar = useMemo(() => buildStatusBar(tickets), [tickets]);

  return (
    <DashboardLayout>
      <div className="dashboard-content py-8">
        <Container maxWidth="xl">
          <motion.div className="dashboard-header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="header-content">
              <div>
                <h1 className="dashboard-title">Welcome, {user?.first_name || 'User'}</h1>
                <p className="dashboard-subtitle">Submit issues, track progress, and follow your support path.</p>
              </div>
              <Button variant="primary" size="lg" onClick={() => setShowNewTicket(true)}>
                New Ticket
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card"><h3>Total Tickets</h3><div className="stat-value">{tickets.length}</div></div>
            <div className="stat-card"><h3>Open Queue</h3><div className="stat-value" style={{ color: '#fbbf24' }}>{openCount}</div></div>
            <div className="stat-card"><h3>Resolved</h3><div className="stat-value" style={{ color: '#34c759' }}>{resolvedCount}</div></div>
          </div>

          {/* Charts */}
          {tickets.length > 0 && (
            <motion.div className="charts-grid" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="chart-card">
                <h4 className="chart-card-title">Tickets Created (Last 14 Days)</h4>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={dailyLine} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#60a5fa' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h4 className="chart-card-title">Tickets by Status</h4>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={statusBar} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="status" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {statusBar.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* New Ticket Modal */}
          <AnimatePresence>
            {showNewTicket && (
              <motion.div
                className="nt-modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => { if (e.target === e.currentTarget) setShowNewTicket(false); }}
              >
                <motion.div
                  className="nt-modal"
                  initial={{ opacity: 0, y: 60, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 40, scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                >
                  <div className="nt-modal-header">
                    <h2>New Ticket</h2>
                    <div className="nt-modal-header-right">
                      <span className="nt-shortcut-hint">⌘N</span>
                      <button className="nt-close-btn" onClick={() => setShowNewTicket(false)}><X size={16} /></button>
                    </div>
                  </div>
                  {formError && <p className="nt-error">{formError}</p>}
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setFormError('');
                      const res = await ticketsApi.create(newTicket);
                      const body = await res.json().catch(() => ({}));
                      if (!res.ok) { setFormError((body as { error?: string }).error || 'Could not create ticket.'); return; }
                      setTickets((prev) => [body as ApiTicket, ...prev]);
                      setNewTicket({ title: '', description: '', categoryId: categories[0]?.id || '', type: 'software', priority: 'P2', replicationSteps: '' });
                      setShowNewTicket(false);
                    }}
                    className="nt-form"
                  >
                    <div className="nt-field"><label>Title *</label><input value={newTicket.title} onChange={(e) => setNewTicket((p) => ({ ...p, title: e.target.value }))} required placeholder="Brief description of the issue" /></div>
                    <div className="nt-field"><label>Description *</label><textarea rows={4} value={newTicket.description} onChange={(e) => setNewTicket((p) => ({ ...p, description: e.target.value }))} required placeholder="Provide full context…" /></div>
                    <div className="nt-row">
                      <div className="nt-field">
                        <label>Category</label>
                        <select value={newTicket.categoryId} onChange={(e) => setNewTicket((p) => ({ ...p, categoryId: e.target.value }))}>
                          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="nt-field">
                        <label>Type</label>
                        <select value={newTicket.type} onChange={(e) => setNewTicket((p) => ({ ...p, type: e.target.value as 'hardware' | 'software' | 'bug' }))}>
                          <option value="hardware">Hardware</option>
                          <option value="software">Software</option>
                          <option value="bug">Bug</option>
                        </select>
                      </div>
                      <div className="nt-field">
                        <label>Priority</label>
                        <select value={newTicket.priority} onChange={(e) => setNewTicket((p) => ({ ...p, priority: e.target.value as 'P1' | 'P2' | 'P3' | 'P4' }))}>
                          <option value="P1">P1 — Critical</option>
                          <option value="P2">P2 — High</option>
                          <option value="P3">P3 — Medium</option>
                          <option value="P4">P4 — Low</option>
                        </select>
                      </div>
                    </div>
                    <div className="nt-field">
                      <label>Replication Steps</label>
                      <input value={newTicket.replicationSteps} onChange={(e) => setNewTicket((p) => ({ ...p, replicationSteps: e.target.value }))} placeholder="Optional — steps to reproduce" />
                    </div>
                    <div className="nt-actions">
                      <Button variant="secondary" onClick={() => setShowNewTicket(false)}>Cancel</Button>
                      <Button variant="primary" type="submit">Create Ticket</Button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ticket History Table */}
          <motion.div className="tickets-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
            <div className="tickets-table-header">
              <h2>Ticket History</h2>
              <div className="tickets-filters">
                <select value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}>
                  <option value="all">All Priorities</option>
                  <option value="P1">P1 Critical</option>
                  <option value="P2">P2 High</option>
                  <option value="P3">P3 Medium</option>
                  <option value="P4">P4 Low</option>
                </select>
                <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                  <option value="pending_routing">Pending Routing</option>
                </select>
              </div>
            </div>

            {loading ? (
              <p className="ticket-description">Loading…</p>
            ) : (
              <div className="ticket-table-wrap">
                <table className="ticket-table">
                  <thead>
                    <tr>
                      <th>Priority</th>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Category</th>
                      <th>Assigned To</th>
                      <th>Created</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((t) => (
                      <tr key={t.id} className="ticket-table-row" onClick={() => navigate(`/tickets/${t.id}`)}>
                        <td>
                          <span className="tbl-priority" style={{ color: PRIORITY_COLOR[t.priority] }}>
                            <span className="tbl-priority-dot" style={{ background: PRIORITY_COLOR[t.priority] }} />
                            {t.priority}
                          </span>
                        </td>
                        <td className="tbl-title">{t.title}</td>
                        <td>
                          <span className="tbl-status" style={{ color: STATUS_COLOR[t.status], background: `${STATUS_COLOR[t.status]}18` }}>
                            {t.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="tbl-muted">{t.category_name}</td>
                        <td className="tbl-muted">{t.assigned_to_name || '—'}</td>
                        <td className="tbl-muted tbl-mono">{new Date(t.created_at).toLocaleDateString()}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {t.status === 'in_progress' ? (
                            <button
                              className="tbl-resolve-btn"
                              onClick={() => handleResolve(t.id)}
                              title="Mark resolved"
                            >
                              <CheckCircle2 size={13} />
                              Resolve
                            </button>
                          ) : (
                            <ExternalLink size={13} className="tbl-link-icon" />
                          )}
                        </td>
                      </tr>
                    ))}
                    {paginated.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                          No tickets match your filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="ticket-pagination">
                    <span className="pagination-info">
                      {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                    </span>
                    <div className="pagination-controls">
                      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                        <ChevronLeft size={14} />
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                        return (
                          <button key={p} onClick={() => setPage(p)} className={page === p ? 'active' : ''}>
                            {p}
                          </button>
                        );
                      })}
                      <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </Container>
      </div>
    </DashboardLayout>
  );
}

export default UserDashboard;
