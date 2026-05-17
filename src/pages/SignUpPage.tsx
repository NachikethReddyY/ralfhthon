import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Logo from '../components/Logo';
import Button from '../components/Button';
import Input from '../components/Input';
import Container from '../components/Container';
import { authApi, type AuthValidationErrorBody } from '../utils/apiClient';
import { getNewPasswordError, PASSWORD_REQUIREMENTS_TEXT } from '../utils/passwordPolicy';
import './AuthPage.css';

export function SignUpPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: '' }));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!formData.email) nextErrors.email = 'Email is required';
    if (!formData.firstName) nextErrors.firstName = 'First name is required';
    if (!formData.lastName) nextErrors.lastName = 'Last name is required';
    const passwordError = getNewPasswordError(formData.password);
    if (passwordError) nextErrors.password = passwordError;
    if (formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await authApi.signup({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        password: formData.password,
      });
      const data = (await response.json().catch(() => ({}))) as AuthValidationErrorBody & {
        accessToken?: string;
        refreshToken?: string;
      };

      if (!response.ok) {
        if (data.details && Object.keys(data.details).length > 0) {
          setErrors({
            ...data.details,
            form: data.message || data.error || 'Please fix the highlighted fields.',
          });
        } else {
          setErrors({ form: data.error || 'Failed to create account. Please try again.' });
        }
        return;
      }

      if (data.accessToken) {
        localStorage.setItem('authToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken || '');
      }
      navigate('/dashboard');
    } catch {
      setErrors({ form: 'Failed to create account. Check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
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
            <h1 className="auth-title">Create Your Account</h1>
            <p className="auth-subtitle">Use email and password. No social login, no email verification.</p>
          </motion.div>

          <motion.form className="auth-form" onSubmit={handleSubmit} initial="hidden" animate="visible">
            <motion.div variants={itemVariants}>
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
            </motion.div>

            <motion.div className="auth-form-row" variants={itemVariants}>
              <Input
                id="firstName"
                label="First Name"
                type="text"
                name="firstName"
                placeholder="Ada"
                value={formData.firstName}
                onChange={handleChange}
                error={errors.firstName}
                required
              />
              <Input
                id="lastName"
                label="Last Name"
                type="text"
                name="lastName"
                placeholder="Lovelace"
                value={formData.lastName}
                onChange={handleChange}
                error={errors.lastName}
                required
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <Input
                id="password"
                label="Password"
                type="password"
                name="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                helpText={PASSWORD_REQUIREMENTS_TEXT}
                required
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <Input
                id="confirmPassword"
                label="Confirm Password"
                type="password"
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                required
              />
            </motion.div>

            {errors.form && (
              <motion.div className="auth-error" variants={itemVariants}>
                {errors.form}
              </motion.div>
            )}

            <motion.div variants={itemVariants}>
              <Button variant="primary" size="lg" type="submit" loading={loading}>
                Create Account
              </Button>
            </motion.div>
          </motion.form>

          <motion.div className="auth-footer" variants={itemVariants}>
            <p>
              Already have an account?{' '}
              <Link to="/login" className="auth-link">
                Sign in
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  );
}

export default SignUpPage;
