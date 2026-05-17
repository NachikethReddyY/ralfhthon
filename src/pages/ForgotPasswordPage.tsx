import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Logo from '../components/Logo';
import Button from '../components/Button';
import Input from '../components/Input';
import Container from '../components/Container';
import { authApi, type AuthValidationErrorBody } from '../utils/apiClient';
import './AuthPage.css';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devResetLink, setDevResetLink] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError('Email is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Invalid email address');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email);
      const data = (await res.json().catch(() => ({}))) as AuthValidationErrorBody & {
        devResetLink?: string;
        emailSent?: boolean;
      };
      if (!res.ok) {
        setError(
          data.details?.email ||
            data.error ||
            'Failed to send reset email. Please try again.'
        );
        return;
      }
      setDevResetLink(data.devResetLink || null);
      setEmailSent(Boolean(data.emailSent));
      setSubmitted(true);
    } catch {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
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
          {/* Logo */}
          <motion.div className="auth-logo" variants={itemVariants}>
            <Link to="/">
              <Logo size="md" showText={true} vertical={true} />
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div className="auth-header" variants={itemVariants}>
            <h1 className="auth-title">Reset Password</h1>
            <p className="auth-subtitle">
              {submitted
                ? 'Check your email for reset instructions'
                : "Enter your email and we'll send you a reset link"}
            </p>
          </motion.div>

          {submitted ? (
            /* Success Message */
            <motion.div
              className="reset-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="success-icon">✓</div>
              <p className="success-text">
                If an account exists for <strong>{email}</strong>, password reset instructions were
                sent when email delivery is configured.
              </p>
              <p className="success-subtext">
                Check your inbox and spam folder. If nothing arrives, confirm SMTP settings in
                backend <code className="auth-inline-code">.env</code> (Gmail app password).
              </p>
              {emailSent && (
                <p className="auth-notice auth-notice--info">
                  A reset link was emailed from your server (when SMTP succeeded).
                </p>
              )}
              {devResetLink && (
                <p className="auth-dev-link">
                  <span className="auth-dev-label">Development only:</span>{' '}
                  <a href={devResetLink} className="auth-link">
                    Open reset password page
                  </a>
                </p>
              )}
              <Link to="/login">
                <Button variant="primary" size="lg">
                  Back to Sign In
                </Button>
              </Link>
            </motion.div>
          ) : (
            /* Form */
            <motion.form
              className="auth-form"
              onSubmit={handleSubmit}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1, delayChildren: 0.2 },
                },
              }}
            >
              <motion.div variants={itemVariants}>
                <Input
                  id="email"
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  error={error}
                  placeholder="you@example.com"
                  required
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <Button variant="primary" size="lg" type="submit" loading={loading}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </motion.div>
            </motion.form>
          )}

          {/* Back to Sign In Link */}
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

export default ForgotPasswordPage;
