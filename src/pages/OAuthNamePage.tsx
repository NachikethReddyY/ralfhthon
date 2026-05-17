import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import Logo from '../components/Logo';
import Container from '../components/Container';
import Input from '../components/Input';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { usersApi } from '../utils/apiClient';
import './OAuthNamePage.css';

function needsNameCompletion(firstName: string, lastName: string): boolean {
  const first = firstName.trim().toLowerCase();
  const last = lastName.trim().toLowerCase();
  return !first || !last || (last === 'user' && (first === 'new' || first === 'google'));
}

export function OAuthNamePage() {
  const navigate = useNavigate();
  const { user, refetch } = useCurrentUser();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    if (!needsNameCompletion(user.first_name, user.last_name)) {
      if (!user.email_is_verified) {
        navigate('/verify-email-otp', { replace: true });
      } else if (!user.onboarding_completed && user.role !== 'super_admin') {
        navigate('/onboarding', { replace: true });
      } else if (user.status !== 'active') {
        navigate('/pending-approval', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [navigate, user]);

  useEffect(() => {
    if (!user) return;
    if (needsNameCompletion(user.first_name, user.last_name)) {
      setFirstName(user.first_name === 'New' || user.first_name === 'Google' ? '' : user.first_name);
      setLastName(user.last_name === 'User' ? '' : user.last_name);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn || !ln) {
      setError('Please enter both your first and last name.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await usersApi.updateName(fn, ln);
      const data = (await res.json().catch(() => ({}))) as { error?: string; user?: typeof user };
      if (!res.ok) {
        setError(data.error || 'Failed to update your name.');
        setSaving(false);
        return;
      }

      await refetch();
      navigate('/onboarding', { replace: true });
    } catch {
      setError('Network error. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="oauth-name-page">
      <div className="oauth-name-page__glow" />
      <Container maxWidth="sm">
        <motion.div
          className="oauth-name-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="oauth-name-card__brand">
            <Logo size="md" showText vertical />
          </div>

          <div className="oauth-name-card__header">
            <div className="oauth-name-card__badge">
              <Sparkles size={14} />
              Google sign-in
            </div>
            <h1>What should we call you?</h1>
            <p>
              Before onboarding, we need your real first and last name so your profile and messages look right.
            </p>
          </div>

          <form className="oauth-name-form" onSubmit={handleSubmit}>
            <Input
              label="First name"
              placeholder="Enter your first name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              error={error && !firstName.trim() ? error : undefined}
              autoComplete="given-name"
            />

            <Input
              label="Last name"
              placeholder="Enter your last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              error={error && !lastName.trim() ? error : undefined}
              autoComplete="family-name"
            />

            {error && <p className="oauth-name-form__error">{error}</p>}

            <div className="oauth-name-form__actions" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                type="submit"
                className="oauth-name-continue-btn"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </form>
        </motion.div>
      </Container>
    </div>
  );
}

export default OAuthNamePage;
