import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import Container from '../components/Container';
import { usersApi } from '../utils/apiClient';
import './AccountSettingsPage.css';

function PasswordInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="as-field">
      <label className="as-label">{label}</label>
      <div className="as-input-wrap">
        <Lock size={14} className="as-input-icon" />
        <input
          className="as-input"
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
        />
        <button
          className="as-show-btn"
          type="button"
          onClick={() => setShow(!show)}
          tabIndex={-1}
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#ff3b30', '#ff9500', '#fbbf24', '#34c759'];

  return (
    <div className="as-strength">
      <div className="as-strength-bars">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="as-strength-bar"
            style={{ background: i < score ? colors[score - 1] : 'var(--color-hairline)' }}
          />
        ))}
      </div>
      <span className="as-strength-label" style={{ color: colors[score - 1] || '#4b5563' }}>
        {labels[score - 1] || 'Too short'}
      </span>
    </div>
  );
}

export function AccountSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters.');
      return;
    }

    setStatus('loading');
    try {
      const res = await usersApi.changePassword(currentPassword, newPassword);
      if (res.ok) {
        setStatus('success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setStatus('idle'), 4000);
      } else {
        const body = await res.json().catch(() => ({}));
        setErrorMsg((body as { error?: string }).error || 'Failed to update password.');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    }
  };

  return (
    <DashboardLayout>
      <div className="as-page">
        <Container maxWidth="sm">
          <motion.div
            className="as-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="as-header">
              <h1 className="as-title">Account Settings</h1>
              <p className="as-subtitle">Manage your password and security preferences.</p>
            </div>

            <div className="as-section">
              <h2 className="as-section-title">Change Password</h2>
              <form className="as-form" onSubmit={handleSubmit}>
                <PasswordInput
                  label="Current Password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  placeholder="Enter current password"
                />
                <PasswordInput
                  label="New Password"
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="Enter new password"
                />
                {newPassword && <PasswordStrength password={newPassword} />}
                <PasswordInput
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Confirm new password"
                />

                {errorMsg && (
                  <div className="as-error">
                    <AlertCircle size={14} />
                    {errorMsg}
                  </div>
                )}

                {status === 'success' && (
                  <div className="as-success">
                    <CheckCircle2 size={14} />
                    Password updated successfully.
                  </div>
                )}

                <button
                  type="submit"
                  className="as-submit-btn"
                  disabled={status === 'loading' || !currentPassword || !newPassword || !confirmPassword}
                >
                  {status === 'loading' ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            </div>
          </motion.div>
        </Container>
      </div>
    </DashboardLayout>
  );
}

export default AccountSettingsPage;
