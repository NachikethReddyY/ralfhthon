import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Logo from '../components/Logo';
import Button from '../components/Button';
import Input from '../components/Input';
import Container from '../components/Container';
import { authApi, type AuthValidationErrorBody } from '../utils/apiClient';
import { getNewPasswordError, PASSWORD_REQUIREMENTS_TEXT } from '../utils/passwordPolicy';
import './AuthPage.css';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!tokenFromUrl) {
      next.token = 'Reset link is missing. Open the link from your email again.';
    }
    const pwErr = getNewPasswordError(password);
    if (pwErr) next.password = pwErr;
    if (password !== confirm) next.confirm = 'Passwords do not match';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      const res = await authApi.resetPassword(tokenFromUrl, password);
      const data = (await res.json().catch(() => ({}))) as AuthValidationErrorBody;
      if (!res.ok) {
        if (data.details && Object.keys(data.details).length > 0) {
          setErrors({
            ...data.details,
            form: data.message || data.error || 'Please fix the highlighted fields.',
          });
        } else {
          setErrors({ form: data.error || 'Could not reset password.' });
        }
        return;
      }
      setDone(true);
    } catch {
      setErrors({ form: 'Network error. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-decoration" />

      <Container maxWidth="sm">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div className="auth-logo" variants={itemVariants}>
            <Link to="/">
              <Logo size="md" showText={true} vertical={true} />
            </Link>
          </motion.div>

          <motion.div className="auth-header" variants={itemVariants}>
            <h1 className="auth-title">Set a new password</h1>
            <p className="auth-subtitle">
              Choose a strong password you have not used elsewhere for this account.
            </p>
          </motion.div>

          {done ? (
            <motion.div className="reset-success" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="success-icon">✓</div>
              <p className="success-text">Your password was updated.</p>
              <p className="success-subtext">You can sign in with your new password now.</p>
              <Link to="/login">
                <Button variant="primary" size="lg">
                  Back to Sign In
                </Button>
              </Link>
            </motion.div>
          ) : (
            <motion.form
              className="auth-form"
              onSubmit={handleSubmit}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.08, delayChildren: 0.1 },
                },
              }}
            >
              {!tokenFromUrl && (
                <motion.div className="auth-error" variants={itemVariants}>
                  This page needs a valid reset token in the URL. Use the link from your email, or
                  request a new one from{' '}
                  <Link to="/forgot-password" className="auth-link">
                    Forgot password
                  </Link>
                  .
                </motion.div>
              )}

              <motion.div variants={itemVariants}>
                <Input
                  id="password"
                  label="New password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, password: '', form: '' }));
                  }}
                  error={errors.password}
                  placeholder="e.g. LuminaPass1"
                  helpText={PASSWORD_REQUIREMENTS_TEXT}
                  autoComplete="new-password"
                  required
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <Input
                  id="confirmPassword"
                  label="Confirm new password"
                  type="password"
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    setErrors((prev) => ({ ...prev, confirm: '', form: '' }));
                  }}
                  error={errors.confirm}
                  autoComplete="new-password"
                  required
                />
              </motion.div>

              {(errors.form || errors.token) && (
                <motion.div className="auth-error" variants={itemVariants}>
                  {errors.token || errors.form}
                </motion.div>
              )}

              <motion.div variants={itemVariants}>
                <Button variant="primary" size="lg" type="submit" loading={loading}>
                  {loading ? 'Saving…' : 'Update password'}
                </Button>
              </motion.div>
            </motion.form>
          )}

          <motion.div className="auth-footer" variants={itemVariants}>
            <p>
              <Link to="/login" className="auth-link">
                Back to Sign In
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  );
}

export default ResetPasswordPage;
