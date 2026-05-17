import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Logo from '../components/Logo';
import Button from '../components/Button';
import Container from '../components/Container';
import { authApi } from '../utils/apiClient';
import './AuthPage.css';

type Status = 'loading' | 'success' | 'error' | 'missing';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<Status>(token ? 'loading' : 'missing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('missing');
      return;
    }

    let cancelled = false;
    (async () => {
      const res = await authApi.verifyEmail(token);
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        accessToken?: string;
      };
      if (cancelled) return;
      if (!res.ok) {
        setStatus('error');
        setMessage(data.error || 'This activation link is invalid or has expired.');
        return;
      }
      if (data.accessToken) {
        localStorage.setItem('authToken', data.accessToken);
        localStorage.setItem('refreshToken', '');
      }
      setStatus('success');
      setMessage(data.message || 'Your account is active.');
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

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
          <motion.div className="auth-logo" variants={itemVariants}>
            <Link to="/">
              <Logo size="md" showText={true} vertical={true} />
            </Link>
          </motion.div>

          <motion.div className="auth-header" variants={itemVariants}>
            <h1 className="auth-title">Activate account</h1>
            <p className="auth-subtitle">
              {status === 'loading' && 'Confirming your email…'}
              {status === 'success' && message}
              {status === 'error' && message}
              {status === 'missing' &&
                'Open the activation link from your email, or sign up again from the app.'}
            </p>
          </motion.div>

          {status === 'loading' && (
            <p className="auth-notice auth-notice--info">Please wait…</p>
          )}

          {status === 'success' && (
            <motion.div className="reset-success" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="success-icon">✓</div>
              <Button variant="primary" size="lg" type="button" onClick={() => navigate('/dashboard')}>
                Continue to dashboard
              </Button>
            </motion.div>
          )}

          {status === 'error' && (
            <div className="auth-form">
              <Link to="/signup">
                <Button variant="secondary" size="lg">
                  Back to sign up
                </Button>
              </Link>
            </div>
          )}

          {status === 'missing' && (
            <div className="auth-form">
              <Link to="/signup">
                <Button variant="primary" size="lg">
                  Create an account
                </Button>
              </Link>
            </div>
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

export default VerifyEmailPage;
