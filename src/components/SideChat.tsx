import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, ImagePlus, ChevronLeft, Circle } from 'lucide-react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import {
  chatApi,
  type ApiChatConversation,
  type ApiChatMessage,
} from '../utils/apiClient';
import './SideChat.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function Avatar({
  firstName,
  lastName,
  avatarUrl,
  size = 32,
}: {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  return (
    <div
      className="sc-avatar"
      style={{ width: size, height: size, minWidth: size }}
    >
      {avatarUrl ? (
        <img src={`${API_URL}${avatarUrl}`} alt="" />
      ) : (
        <span style={{ fontSize: size * 0.38 }}>
          {firstName[0]}{lastName[0]}
        </span>
      )}
    </div>
  );
}

// ─── Message bubble ─────────────────────────────────────────────────────────
function MessageBubble({ msg, isMine }: { msg: ApiChatMessage; isMine: boolean }) {
  const [imgOpen, setImgOpen] = useState(false);

  return (
    <div className={`sc-msg-row ${isMine ? 'mine' : 'theirs'}`}>
      {!isMine && (
        <Avatar
          firstName={msg.first_name}
          lastName={msg.last_name}
          avatarUrl={msg.avatar_url}
          size={26}
        />
      )}
      <div className={`sc-bubble ${isMine ? 'mine' : 'theirs'}`}>
        {msg.image_url && (
          <>
            <img
              className="sc-bubble-img"
              src={`${API_URL}${msg.image_url}`}
              alt="attachment"
              onClick={() => setImgOpen(true)}
            />
            {imgOpen && (
              <div className="sc-img-lightbox" onClick={() => setImgOpen(false)}>
                <img src={`${API_URL}${msg.image_url}`} alt="" />
              </div>
            )}
          </>
        )}
        {msg.body && <p>{msg.body}</p>}
        <span className="sc-bubble-time">{timeAgo(msg.created_at)}</span>
      </div>
    </div>
  );
}

// ─── Single conversation view ────────────────────────────────────────────────
function ConversationView({
  convId,
  currentUserId,
  onBack,
  convTitle,
}: {
  convId: string;
  currentUserId: string;
  onBack?: () => void;
  convTitle?: string;
}) {
  const [messages, setMessages] = useState<ApiChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await chatApi.getMessages(convId);
      if (res.ok) {
        const data = await res.json() as ApiChatMessage[];
        setMessages(data);
      }
    } catch { /* ignore */ }
  }, [convId]);

  useEffect(() => {
    fetchMessages();
    pollingRef.current = setInterval(fetchMessages, 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');
    try {
      const res = await chatApi.sendMessage(convId, trimmed);
      if (res.ok) {
        const msg = await res.json() as ApiChatMessage;
        setMessages((prev) => [...prev, msg]);
      }
    } finally {
      setSending(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await chatApi.sendImage(convId, fd);
      if (res.ok) {
        const msg = await res.json() as ApiChatMessage;
        setMessages((prev) => [...prev, msg]);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="sc-conv-view">
      <div className="sc-conv-header">
        {onBack && (
          <button className="sc-back-btn" onClick={onBack}>
            <ChevronLeft size={16} />
          </button>
        )}
        <span className="sc-conv-title">{convTitle || 'Support Chat'}</span>
        <span className="sc-conv-online"><Circle size={7} fill="#34c759" color="#34c759" /> Online</span>
      </div>

      <div className="sc-messages">
        {messages.length === 0 && (
          <div className="sc-empty-thread">
            <MessageCircle size={28} opacity={0.2} />
            <p>Start the conversation. We typically reply within minutes.</p>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} isMine={m.sender_id === currentUserId} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="sc-input-area">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageSelect}
        />
        <button
          className="sc-img-btn"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="Send image"
        >
          <ImagePlus size={16} />
        </button>
        <textarea
          className="sc-input"
          placeholder="Message support…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={1}
        />
        <button
          className="sc-send-btn"
          onClick={handleSend}
          disabled={sending || !text.trim()}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Admin conversation list ─────────────────────────────────────────────────
function ConversationList({
  onSelect,
}: {
  onSelect: (conv: ApiChatConversation) => void;
}) {
  const [convs, setConvs] = useState<ApiChatConversation[]>([]);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await chatApi.getConversations();
      if (res.ok) {
        const data = await res.json() as ApiChatConversation[];
        setConvs(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetch();
    pollingRef.current = setInterval(fetch, 4000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetch]);

  if (!convs.length) {
    return (
      <div className="sc-list-empty">
        <MessageCircle size={28} opacity={0.2} />
        <p>No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="sc-conv-list">
      {convs.map((c) => {
        const unread = Number(c.unread_count) || 0;
        return (
          <button key={c.id} className="sc-conv-row" onClick={() => onSelect(c)}>
            <Avatar
              firstName={c.first_name || '?'}
              lastName={c.last_name || ''}
              avatarUrl={c.avatar_url}
              size={36}
            />
            <div className="sc-conv-row-body">
              <div className="sc-conv-row-top">
                <span className="sc-conv-row-name">{c.first_name} {c.last_name}</span>
                <span className="sc-conv-row-time">{timeAgo(c.last_message_at)}</span>
              </div>
              <div className="sc-conv-row-preview">
                <span>{c.last_image ? '📎 Image' : (c.last_body || 'No messages yet')}</span>
                {unread > 0 && <span className="sc-unread-dot">{unread}</span>}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main SideChat panel ─────────────────────────────────────────────────────
export function SideChat() {
  const { user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [activeConv, setActiveConv] = useState<ApiChatConversation | null>(null);
  const [userConvId, setUserConvId] = useState<string | null>(null);
  const unreadRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // Fetch unread count in background
  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      const res = await chatApi.getUnread();
      if (res.ok) {
        const data = await res.json() as { count: number };
        setUnread(data.count);
      }
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    fetchUnread();
    unreadRef.current = setInterval(fetchUnread, 8000);
    return () => { if (unreadRef.current) clearInterval(unreadRef.current); };
  }, [fetchUnread]);

  // For users, get/create their conversation on open
  useEffect(() => {
    if (!open || isAdmin || userConvId) return;
    (async () => {
      try {
        const res = await chatApi.getConversations();
        if (res.ok) {
          const data = await res.json() as ApiChatConversation;
          setUserConvId(data.id);
        }
      } catch { /* ignore */ }
    })();
  }, [open, isAdmin, userConvId]);

  if (!user) return null;

  return (
    <>
      {/* Floating trigger button */}
      <button
        className={`sc-trigger ${open ? 'active' : ''}`}
        onClick={() => setOpen(!open)}
        aria-label="Open chat"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
        {!open && unread > 0 && (
          <span className="sc-trigger-badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {/* Side panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="sc-panel"
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
          >
            <div className="sc-panel-header">
              <div className="sc-panel-title">
                <MessageCircle size={16} />
                <span>{isAdmin ? 'Support Inbox' : 'Lumina Support'}</span>
              </div>
              <button className="sc-panel-close" onClick={() => setOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="sc-panel-body">
              {isAdmin ? (
                activeConv ? (
                  <ConversationView
                    convId={activeConv.id}
                    currentUserId={user.id}
                    onBack={() => { setActiveConv(null); fetchUnread(); }}
                    convTitle={`${activeConv.first_name} ${activeConv.last_name}`}
                  />
                ) : (
                  <ConversationList onSelect={(c) => setActiveConv(c)} />
                )
              ) : (
                userConvId ? (
                  <ConversationView
                    convId={userConvId}
                    currentUserId={user.id}
                  />
                ) : (
                  <div className="sc-list-empty">
                    <div className="sc-spinner" />
                  </div>
                )
              )}
              <div className="spacer" style={{ height: '100px' }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default SideChat;
