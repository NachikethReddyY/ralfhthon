import { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { usersApi } from '../utils/apiClient';
import { useCurrentUser } from '../hooks/useCurrentUser';
import './NamePrompt.css';

interface Props {
  open: boolean;
  onDone: () => void;
  onCancel?: () => void;
}

export function NamePrompt({ open, onDone, onCancel }: Props) {
  const { setUser } = useCurrentUser();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async () => {
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn || !ln) {
      setError('Both first and last name are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await usersApi.updateName(fn, ln);
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || 'Failed to update name.');
        setSaving(false);
        return;
      }
      const data = (await res.json()) as { user: import('../utils/apiClient').ApiUser };
      setUser(data.user);
      setSaving(false);
      onDone();
    } catch {
      setError('Network error. Please try again.');
      setSaving(false);
    }
  }, [firstName, lastName, setUser, onDone]);

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onCancel?.();
  };

  if (!open) return null;

  return (
    <div className="name-prompt-backdrop" onClick={handleBackdrop}>
      <div className="name-prompt-card" role="dialog" aria-modal="true" aria-label="Tell us your name">
        <button
          className="name-prompt-close"
          onClick={onCancel}
          type="button"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>

        <h2 className="name-prompt-heading">Welcome to Lumina</h2>
        <p className="name-prompt-sub">Before you go any further — what should we call you?</p>

        <div className="name-prompt-fields">
          <label className="name-prompt-label" htmlFor="np-first">
            First name
          </label>
          <input
            id="np-first"
            className="name-prompt-input"
            type="text"
            placeholder="e.g. Nachiketh"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />

          <label className="name-prompt-label" htmlFor="np-last">
            Last name
          </label>
          <input
            id="np-last"
            className="name-prompt-input"
            type="text"
            placeholder="e.g. Reddy"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {error && <p className="name-prompt-error">{error}</p>}

        <button
          className="name-prompt-submit"
          onClick={handleSubmit}
          disabled={saving || !firstName.trim() || !lastName.trim()}
          type="button"
        >
          {saving ? 'Saving…' : "That's me"}
        </button>
      </div>
    </div>
  );
}
