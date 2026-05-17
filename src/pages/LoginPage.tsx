import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Logo from '../components/Logo';
import Button from '../components/Button';
import Input from '../components/Input';
import Container from '../components/Container';
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
      }
      navigate('/workspace');
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
