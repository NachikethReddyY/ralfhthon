import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Logo from '../components/Logo';
import Button from '../components/Button';
import Input from '../components/Input';
import Container from '../components/Container';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import { authApi, type AuthValidationErrorBody } from '../utils/apiClient';
import './AuthPage.css';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendNote, setResendNote] = useState('');

  useEffect(() => {
    const message = (location.state as { message?: string } | null)?.message;
    if (message) {
      setErrors((prev) => ({ ...prev, form: message }));
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      setErrors({ email: 'Email is required' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrors({ email: 'Invalid email address' });
      return;
    }
    setStep('password');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (name === 'email') {
      setShowResendVerification(false);
      setResendNote('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.password) {
      setErrors({ password: 'Password is required' });
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.login(formData.email, formData.password);
      const data = (await res.json().catch(() => ({}))) as AuthValidationErrorBody & {
        accessToken?: string;
        refreshToken?: string;
      };
      if (!res.ok) {
        const code = (data as { code?: string }).code;
        if (res.status === 403 && code === 'EMAIL_NOT_VERIFIED') {
          localStorage.setItem('pendingVerificationEmail', formData.email);
          setShowResendVerification(true);
          setErrors({
            form:
              'This email is not activated yet. Open the link we sent you, or resend the verification email.',
          });
          return;
        }
        if (res.status === 400 && data.details && Object.keys(data.details).length > 0) {
          setErrors({
            ...data.details,
            form: data.message || data.error || 'Please fix the highlighted fields.',
          });
        } else {
          setErrors({
            form: data.error || 'Failed to sign in. Please check your credentials.',
          });
        }
        return;
      }
      if (data.accessToken) {
        localStorage.setItem('authToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken || '');
        localStorage.removeItem('pendingVerificationEmail');
      }
      navigate('/dashboard');
    } catch {
      setErrors({ form: 'Failed to sign in. Please check your connection and try again.' });
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
      {/* Background decoration */}
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
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Sign in to your Lumina account</p>
          </motion.div>

          {/* Google Sign-In - Always prominent */}
          <motion.div variants={itemVariants}>
            <GoogleAuthButton
              mode="signin"
              onError={(msg) => setErrors((prev) => ({ ...prev, form: msg }))}
            />
          </motion.div>

          <motion.div className="auth-divider" variants={itemVariants}>
            <span>or</span>
          </motion.div>

          {/* Form */}
          <motion.form
            className="auth-form"
            onSubmit={step === 'email' ? handleNextStep : handleSubmit}
            initial="hidden"
            animate="visible"
          >
            {step === 'email' ? (
              <motion.div variants={itemVariants} key="email-step">
                <Input
                  id="email"
                  label="Email Address"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  required
                />
                <div style={{ marginTop: '20px' }}>
                  <Button variant="secondary" size="lg" type="submit">
                    Continue
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div variants={itemVariants} key="password-step">
                <p className="auth-notice auth-notice--info">
                  Logging in as <strong>{formData.email}</strong> — <button 
                    type="button" 
                    className="auth-link-small" 
                    style={{ border: 'none', background: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => setStep('email')}
                  >
                    Change
                  </button>
                </p>
                <div className="password-header">
                  <label htmlFor="password" className="input-label">
                    Password
                  </label>
                  <Link to="/forgot-password" className="auth-link-small">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  label=""
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                  autoFocus
                  required
                />
                <div style={{ marginTop: '20px' }}>
                  <Button variant="primary" size="lg" type="submit" loading={loading}>
                    Sign In
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Form Error */}
            {errors.form && (
              <motion.div className="auth-error" variants={itemVariants}>
                {errors.form}
              </motion.div>
            )}

            {showResendVerification && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                {resendNote ? (
                  <motion.div className="auth-notice auth-notice--info" variants={itemVariants}>
                    {resendNote}
                  </motion.div>
                ) : null}
                <motion.div variants={itemVariants}>
                  <Button
                    variant="secondary"
                    size="lg"
                    type="button"
                    loading={resendBusy}
                    onClick={async () => {
                      setResendBusy(true);
                      setResendNote('');
                      try {
                        const r = await authApi.resendVerification(formData.email);
                        const body = (await r.json().catch(() => ({}))) as {
                          message?: string;
                          error?: string;
                        };
                        if (!r.ok) {
                          setResendNote(body.error || 'Could not resend.');
                        } else {
                          setResendNote(body.message || 'Verification email sent.');
                        }
                      } catch {
                        setResendNote('Network error. Try again.');
                      } finally {
                        setResendBusy(false);
                      }
                    }}
                  >
                    Resend email
                  </Button>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <Link to="/verify-email-otp">
                    <Button variant="secondary" size="lg" type="button">
                      Enter 6-digit code
                    </Button>
                  </Link>
                </motion.div>
              </div>
            )}
          </motion.form>

          {/* Sign Up Link */}
          <motion.div className="auth-footer" variants={itemVariants}>
            <p>
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="auth-link">
                Sign up here
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  );
}

export default LoginPage;
