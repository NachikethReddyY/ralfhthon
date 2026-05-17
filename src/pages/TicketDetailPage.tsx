import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Clock, Tag, User, AlertCircle, CheckCircle2, Circle, Send,
  Play, RotateCcw, Star, Sparkles, ChevronDown, X,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useCurrentUser } from '../hooks/useCurrentUser';
import {
  ticketsApi, type ApiTicket, type ApiComment, type ApiActivityEvent, type ApiRating,
} from '../utils/apiClient';
import './TicketDetailPage.css';

const PRIORITY_COLOR: Record<ApiTicket['priority'], string> = {
  P1: '#ff3b30', P2: '#ff9500', P3: '#34c759', P4: '#6b7280',
};
const STATUS_COLOR: Record<ApiTicket['status'], string> = {
  open: '#ff6b6b', assigned: '#60a5fa', in_progress: '#fbbf24',
  resolved: '#34c759', closed: '#6b7280', on_hold: '#9ca3af', pending_routing: '#d97706',
};
const ALL_STATUSES: ApiTicket['status'][] = [
  'open', 'assigned', 'in_progress', 'resolved', 'closed', 'on_hold', 'pending_routing',
];

function StatusIcon({ status }: { status: ApiTicket['status'] }) {
  if (status === 'resolved' || status === 'closed') return <CheckCircle2 size={14} />;
  if (status === 'in_progress') return <Play size={14} />;
  if (status === 'open' || status === 'pending_routing') return <AlertCircle size={14} />;
  return <Circle size={14} />;
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatEventText(event: ApiActivityEvent): string {
  const actor = `${event.first_name} ${event.last_name}`;
  const m = event.metadata as Record<string, string>;
  switch (event.action) {
    case 'ticket_created': return `${actor} submitted this ticket`;
    case 'ticket_assigned':
      return m.assigned_to_name
        ? `Assigned to ${m.assigned_to_name}${m.source === 'gemini' ? ' via AI routing' : m.source ? ` via ${m.source}` : ''}`
        : `Assigned ${m.source === 'gemini' ? 'via AI' : ''}`;
    case 'ticket_status_changed':
      return m.new_status
        ? `Status changed to ${m.new_status.replace(/_/g, ' ')}` + (m.old_status ? ` from ${m.old_status.replace(/_/g, ' ')}` : '')
        : 'Status updated';
    case 'ticket_rerouted': return `${actor} re-routed this ticket`;
    case 'ticket_comment_added': return `${actor} added a comment`;
    case 'ticket_rated': return `${actor} left a rating`;
    default: return event.action.replace(/_/g, ' ');
  }
}

function eventDotColor(action: string): string {
  if (action.includes('created')) return '#60a5fa';
  if (action.includes('assigned') || action.includes('rerouted')) return '#d97706';
  if (action.includes('status')) return '#fbbf24';
  if (action.includes('resolved') || action.includes('rated')) return '#34c759';
  return 'rgba(255,255,255,0.15)';
}

// Star rating widget
function StarRating({
  ticketId,
  existingRating,
  onRated,
}: {
  ticketId: string;
  existingRating: ApiRating | null;
  onRated: (r: ApiRating) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState(existingRating?.comment || '');
  const [editing, setEditing] = useState(!existingRating);

  const current = existingRating?.rating || 0;

  const handleRate = async (val: number) => {
    setSaving(true);
    try {
      const res = await ticketsApi.rate(ticketId, val, comment || undefined);
      if (res.ok) {
        const data = await res.json();
        onRated(data as ApiRating);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!editing && existingRating) {
    return (
      <div className="td-rating-display">
        <div className="td-rating-stars">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} size={18} fill={s <= existingRating.rating ? '#fbbf24' : 'none'} color={s <= existingRating.rating ? '#fbbf24' : '#4b5563'} />
          ))}
        </div>
        {existingRating.comment && <p className="td-rating-comment">{existingRating.comment}</p>}
        <button className="td-rating-edit-btn" onClick={() => setEditing(true)}>Edit rating</button>
      </div>
    );
  }

  return (
    <div className="td-rating-form">
      <p className="td-rating-prompt">How satisfied are you with the resolution?</p>
      <div className="td-rating-stars interactive">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            className="td-star-btn"
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => handleRate(s)}
            disabled={saving}
          >
            <Star
              size={24}
              fill={(hovered || current) >= s ? '#fbbf24' : 'none'}
              color={(hovered || current) >= s ? '#fbbf24' : '#4b5563'}
            />
          </button>
        ))}
      </div>
      <textarea
        className="td-rating-comment-input"
        placeholder="Optional feedback…"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
      />
      {current > 0 && (
        <div className="td-rating-submit-row">
          <button className="td-action-btn success" onClick={() => handleRate(current)} disabled={saving}>
            {saving ? 'Saving…' : 'Save Rating'}
          </button>
          {existingRating && <button className="td-action-btn ghost" onClick={() => setEditing(false)}>Cancel</button>}
        </div>
      )}
    </div>
  );
}

// AI Ask panel
function AskAIPanel({ ticket, onClose }: { ticket: ApiTicket; onClose: () => void }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const ask = async () => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setQuestion('');
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    try {
      const res = await ticketsApi.askAI(ticket.id, trimmed);
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', text: data.answer || data.error || 'No response' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="td-ai-panel td-ai-panel--floating">
      <div className="td-ai-header">
        <Sparkles size={16} className="td-ai-icon" />
        <div className="td-ai-header-copy">
          <span>Ask AI</span>
          <small>{ticket.title}</small>
        </div>
        <button className="td-ai-close" onClick={onClose}><X size={14} /></button>
      </div>
      <div className="td-ai-context">
        <span className="td-ai-context-pill">{ticket.priority}</span>
        <span className="td-ai-context-pill">{ticket.status.replace(/_/g, ' ')}</span>
        <span className="td-ai-context-pill">{ticket.category_name}</span>
      </div>
      <div className="td-ai-thread">
        {messages.length === 0 && (
          <div className="td-ai-empty">Ask about the ticket, routing, next steps, or resolution details.</div>
        )}
        {messages.map((msg, idx) => (
          <div key={`${msg.role}-${idx}`} className={`td-ai-bubble ${msg.role}`}>
            {msg.text}
          </div>
        ))}
        {loading && <div className="td-ai-bubble assistant">Thinking…</div>}
        <div ref={chatEndRef} />
      </div>
      <div className="td-ai-input-row">
        <input
          className="td-ai-input"
          placeholder="Ask anything about this ticket…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
          autoFocus
        />
        <button className="td-ai-send" onClick={ask} disabled={loading || !question.trim()}>
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [ticket, setTicket] = useState<ApiTicket | null>(null);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [activityEvents, setActivityEvents] = useState<ApiActivityEvent[]>([]);
  const [rating, setRating] = useState<ApiRating | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showAI, setShowAI] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isOwner = ticket?.submitted_by_id === user?.id;
  const canReopen = !isAdmin && isOwner && (ticket?.status === 'resolved' || ticket?.status === 'closed');
  const canResolve = !isAdmin && isOwner && ticket?.status === 'in_progress';
  const showRating = isOwner && (ticket?.status === 'resolved' || ticket?.status === 'closed');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      ticketsApi.get(id).then((r) => r.json()),
      ticketsApi.getComments(id).then((r) => r.json()),
      ticketsApi.getActivity(id).then((r) => r.json()),
    ]).then(([ticketData, commentData, activityData]) => {
      setTicket(ticketData as ApiTicket);
      setComments(Array.isArray(commentData) ? (commentData as ApiComment[]) : []);
      const { events, rating: r } = activityData as { events: ApiActivityEvent[]; rating: ApiRating | null };
      setActivityEvents(Array.isArray(events) ? events : []);
      setRating(r);
    }).catch(() => setError('Failed to load ticket'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleStatusChange = async (newStatus: ApiTicket['status']) => {
    if (!ticket) return;
    setStatusDropdownOpen(false);
    const res = await ticketsApi.updateStatus(ticket.id, newStatus);
    if (res.ok) {
      setTicket((prev) => prev ? { ...prev, status: newStatus } : prev);
    }
  };

  const handleReroute = async () => {
    if (!ticket) return;
    const res = await ticketsApi.reroute(ticket.id);
    if (res.ok) {
      const data = await res.json();
      setTicket((prev) => prev
        ? { ...prev, status: 'assigned', assigned_to_id: data.routing?.assignedAdminId || prev.assigned_to_id, assigned_to_name: data.assignedTo?.name || prev.assigned_to_name }
        : prev
      );
    }
  };

  const handleComment = async () => {
    if (!ticket || !commentText.trim()) return;
    setSubmitting(true);
    try {
      const res = await ticketsApi.addComment(ticket.id, commentText.trim());
      if (res.ok) {
        const c = await res.json() as ApiComment;
        setComments((prev) => [...prev, c]);
        setCommentText('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="td-loading-page">
          <div className="td-skeleton td-skeleton-title" />
          <div className="td-skeleton td-skeleton-body" />
          <div className="td-skeleton td-skeleton-body" style={{ width: '70%' }} />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !ticket) {
    return (
      <DashboardLayout>
        <div className="ticket-detail-error">
          <p>{error || 'Ticket not found'}</p>
          <button onClick={() => navigate(-1)}>Go back</button>
        </div>
      </DashboardLayout>
    );
  }

  const routing = ticket.metadata?.routing as { source?: string; reasoning?: string } | undefined;
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  return (
    <DashboardLayout>
      <div className="ticket-detail-page">
        <div className="ticket-detail-header">
          <button className="td-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
            Back
          </button>
          <button
            className={`td-ai-toggle-btn ${showAI ? 'active' : ''}`}
            onClick={() => setShowAI(!showAI)}
          >
            <Sparkles size={14} />
            Ask AI
          </button>
        </div>

        <AnimatePresence>
          {showAI && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <AskAIPanel ticket={ticket} onClose={() => setShowAI(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="ticket-detail-layout">
          {/* Main content */}
          <div className="ticket-detail-main">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>

              <div className="td-title-row">
                <span
                  className="td-priority-pill"
                  style={{ background: `${PRIORITY_COLOR[ticket.priority]}22`, color: PRIORITY_COLOR[ticket.priority] }}
                >
                  {ticket.priority}
                </span>
                <h1 className="td-title">{ticket.title}</h1>
              </div>

              <div className="td-meta-chips">
                <span className="td-chip" style={{ color: STATUS_COLOR[ticket.status] }}>
                  <StatusIcon status={ticket.status} />
                  {ticket.status.replace(/_/g, ' ')}
                </span>
                <span className="td-chip">
                  <Tag size={12} />
                  {ticket.category_name}
                </span>
                <span className="td-chip">
                  <Clock size={12} />
                  {new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="td-chip">
                  <User size={12} />
                  {ticket.assigned_to_name || 'Unassigned'}
                </span>
              </div>

              <div className="td-body">
                <h3>Description</h3>
                <p>{ticket.description}</p>
                {ticket.replication_steps && (
                  <>
                    <h3>Replication Steps</h3>
                    <pre className="td-pre">{ticket.replication_steps}</pre>
                  </>
                )}
              </div>

              {routing?.reasoning && (
                <div className="td-routing-block">
                  <div className="td-routing-header">
                    <span className="td-routing-badge">
                      {routing.source === 'gemini' ? '✦ AI Decision' : routing.source === 'rules' ? '⚡ Rule-Based' : '↺ Fallback'}
                    </span>
                    <span className="td-routing-source">{routing.source}</span>
                  </div>
                  <p className="td-routing-reasoning">{routing.reasoning}</p>
                </div>
              )}

              {/* Action bar */}
              <div className="td-action-bar">
                {isAdmin && (
                  <>
                    {(ticket.status === 'open' || ticket.status === 'assigned') && (
                      <button className="td-action-btn primary" onClick={() => handleStatusChange('in_progress')}>
                        <Play size={14} />
                        Start Task
                      </button>
                    )}
                    {ticket.status === 'in_progress' && (
                      <button className="td-action-btn success" onClick={() => handleStatusChange('resolved')}>
                        <CheckCircle2 size={14} />
                        Resolve
                      </button>
                    )}
                    <button className="td-action-btn ghost" onClick={handleReroute}>
                      <RotateCcw size={14} />
                      Re-route
                    </button>
                  </>
                )}
                {canReopen && (
                  <button className="td-action-btn ghost" onClick={() => handleStatusChange('open')}>
                    <RotateCcw size={14} />
                    Reopen Ticket
                  </button>
                )}
                {canResolve && (
                  <button className="td-action-btn success" onClick={() => handleStatusChange('resolved')}>
                    <CheckCircle2 size={14} />
                    Mark Resolved
                  </button>
                )}
              </div>

              {/* Activity + Comments */}
              <div className="td-comments-section">
                <h2>Activity</h2>
                <div className="td-timeline">
                  {activityEvents.map((event) => (
                    <div key={event.id} className="td-timeline-item">
                      <div
                        className="td-timeline-dot"
                        style={{ background: eventDotColor(event.action) }}
                      />
                      <div className="td-timeline-line" />
                      <div className="td-timeline-content">
                        <span className="td-activity-text">{formatEventText(event)}</span>
                        <span className="td-activity-time">{timeAgo(event.created_at)}</span>
                      </div>
                    </div>
                  ))}
                  {activityEvents.length === 0 && (
                    <div className="td-timeline-item">
                      <div className="td-timeline-dot" style={{ background: '#60a5fa' }} />
                      <div className="td-timeline-content">
                        <span className="td-activity-text">
                          Ticket created by <strong>{ticket.submitted_by_email}</strong>
                        </span>
                        <span className="td-activity-time">{timeAgo(ticket.created_at)}</span>
                      </div>
                    </div>
                  )}

                  {/* Comments interleaved */}
                  {comments.map((c) => (
                    <div key={c.id} className="td-comment-item">
                      <div className="td-comment-avatar">
                        {c.avatar_url
                          ? <img src={`${API_URL}${c.avatar_url}`} alt="" />
                          : <span>{c.first_name[0]}{c.last_name[0]}</span>
                        }
                      </div>
                      <div className="td-comment-body">
                        <div className="td-comment-header">
                          <strong>{c.first_name} {c.last_name}</strong>
                          <span className={`td-comment-role ${c.role}`}>{c.role.replace('_', ' ')}</span>
                          <span className="td-activity-time">{timeAgo(c.created_at)}</span>
                        </div>
                        <p>{c.body}</p>
                      </div>
                    </div>
                  ))}

                  {/* Rating at the end of timeline */}
                  {showRating && (
                    <div className="td-rating-section">
                      <div className="td-rating-header">
                        <Star size={14} style={{ color: '#fbbf24' }} />
                        <span>Satisfaction Rating</span>
                      </div>
                      <StarRating
                        ticketId={ticket.id}
                        existingRating={rating}
                        onRated={(r) => setRating(r)}
                      />
                    </div>
                  )}
                  {!showRating && rating && (
                    <div className="td-timeline-item">
                      <div className="td-timeline-dot" style={{ background: '#fbbf24' }} />
                      <div className="td-timeline-content">
                        <span className="td-activity-text">
                          Rated {rating.rating}/5 by {rating.first_name}
                          {rating.comment ? ` — "${rating.comment}"` : ''}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Comment input */}
                <div className="td-comment-form">
                  <div className="td-comment-form-avatar">
                    {user?.avatar_url
                      ? <img src={`${API_URL}${user.avatar_url}`} alt="" />
                      : <span>{user?.first_name?.[0]}{user?.last_name?.[0]}</span>
                    }
                  </div>
                  <div className="td-comment-input-wrap">
                    <textarea
                      ref={commentInputRef}
                      className="td-comment-input"
                      placeholder="Add a comment… (Shift+Enter to submit)"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.shiftKey) {
                          e.preventDefault();
                          handleComment();
                        }
                      }}
                      rows={3}
                    />
                    <button
                      className="td-comment-submit"
                      onClick={handleComment}
                      disabled={submitting || !commentText.trim()}
                    >
                      <Send size={14} />
                      {submitting ? 'Sending…' : 'Comment'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="ticket-detail-sidebar">
            <div className="tds-section">
              <h4>Properties</h4>

              {/* Status with dropdown for admins */}
              <div className="tds-row">
                <span>Status</span>
                {isAdmin ? (
                  <div className="tds-status-dropdown" ref={statusDropdownRef}>
                    <button
                      className="tds-status-btn"
                      style={{ color: STATUS_COLOR[ticket.status] }}
                      onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                    >
                      {ticket.status.replace(/_/g, ' ')}
                      <ChevronDown size={12} />
                    </button>
                    {statusDropdownOpen && (
                      <div className="tds-status-menu">
                        {ALL_STATUSES.map((s) => (
                          <button
                            key={s}
                            className={`tds-status-option ${s === ticket.status ? 'active' : ''}`}
                            style={{ color: STATUS_COLOR[s] }}
                            onClick={() => handleStatusChange(s)}
                          >
                            <span className="tds-status-dot" style={{ background: STATUS_COLOR[s] }} />
                            {s.replace(/_/g, ' ')}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <span style={{ color: STATUS_COLOR[ticket.status] }}>
                    {ticket.status.replace(/_/g, ' ')}
                  </span>
                )}
              </div>

              <div className="tds-row">
                <span>Priority</span>
                <span style={{ color: PRIORITY_COLOR[ticket.priority] }}>{ticket.priority}</span>
              </div>
              <div className="tds-row">
                <span>Type</span>
                <span>{ticket.type}</span>
              </div>
              <div className="tds-row">
                <span>Category</span>
                <span>{ticket.category_name}</span>
              </div>
              <div className="tds-row">
                <span>Assignee</span>
                <span>{ticket.assigned_to_name || '—'}</span>
              </div>
              <div className="tds-row">
                <span>Created</span>
                <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
              </div>
              <div className="tds-row">
                <span>Submitted by</span>
                <span style={{ fontSize: '11px' }}>{ticket.submitted_by_email}</span>
              </div>
            </div>

            {routing && (
              <div className="tds-section">
                <h4>Routing</h4>
                <div className="tds-row">
                  <span>Source</span>
                  <span className={`tds-routing-source ${routing.source}`}>
                    {routing.source === 'gemini' ? '✦ Gemini AI' : routing.source === 'rules' ? '⚡ Rules' : '↺ Fallback'}
                  </span>
                </div>
              </div>
            )}

            {rating && (
              <div className="tds-section">
                <h4>Rating</h4>
                <div className="tds-rating-stars">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={14} fill={s <= rating.rating ? '#fbbf24' : 'none'} color={s <= rating.rating ? '#fbbf24' : '#4b5563'} />
                  ))}
                </div>
                {rating.comment && <p className="tds-rating-comment">{rating.comment}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default TicketDetailPage;
