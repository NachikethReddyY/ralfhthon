import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import Logo from '../components/Logo';
import Button from '../components/Button';
import Input from '../components/Input';
import Container from '../components/Container';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../components/ui/input-otp';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import { authApi, type AuthValidationErrorBody } from '../utils/apiClient';
import { getNewPasswordError, PASSWORD_REQUIREMENTS_TEXT } from '../utils/passwordPolicy';
import './AuthPage.css';

export function SignUpPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'details'>('email');
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    role: 'user',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendNote, setResendNote] = useState('');

  // OTP state
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (resendCooldown > 0) {
      cooldownRef.current = setInterval(() => {
        setResendCooldown((c) => {
          if (c <= 1) {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, [resendCooldown]);

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
    setStep('details');
  };

  const validateDetails = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    const pwErr = getNewPasswordError(formData.password);
    if (pwErr) newErrors.password = pwErr;
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateDetails()) return;
    setLoading(true);
    try {
      const res = await authApi.signup({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        password: formData.password,
        role: formData.role,
      });
      const data = (await res.json().catch(() => ({}))) as AuthValidationErrorBody & {
        accessToken?: string;
        refreshToken?: string;
        requiresEmailVerification?: boolean;
        message?: string;
        code?: string;
      };
      if (!res.ok) {
        if (data.details && Object.keys(data.details).length > 0) {
          setErrors({
            ...data.details,
            form: data.message || data.error || 'Please fix the highlighted fields.',
          });
        } else {
          setErrors({
            form:
              data.error ||
              (res.status === 503 && data.code === 'MAIL_FAILED'
                ? 'Account may exist but the verification email failed.'
                : 'Failed to create account. Please try again.'),
          });
        }
        return;
      }
      if (data.requiresEmailVerification) {
        localStorage.setItem('pendingVerificationEmail', formData.email);
        setPendingEmail(formData.email);
        return;
      }
      if (data.accessToken) {
        localStorage.setItem('authToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken || '');
        navigate('/dashboard');
        return;
      }
      navigate('/login', { state: { message: 'Account created! Please sign in.' } });
    } catch {
      setErrors({ form: 'Failed to create account. Check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (code: string) => {
    if (!pendingEmail || code.length !== 6) return;
    setOtpLoading(true);
    setOtpError('');
    try {
      const res = await authApi.verifyEmailOtp(pendingEmail, code);
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        accessToken?: string;
      };
      if (!res.ok) {
        setOtpError(data.error || 'Invalid or expired code. Try resending a fresh code.');
        setOtp('');
        return;
      }
      if (data.accessToken) {
        localStorage.setItem('authToken', data.accessToken);
        localStorage.setItem('refreshToken', '');
      }
      localStorage.removeItem('pendingVerificationEmail');
      navigate('/onboarding');
    } catch {
      setOtpError('Network error. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpChange = (value: string) => {
    setOtp(value);
    if (otpError) setOtpError('');
    if (value.length === 6 && !otpLoading) {
      submitOtp(value);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail || resendBusy || resendCooldown > 0) return;
    setResendBusy(true);
    setResendNote('');
    try {
      const r = await authApi.resendVerification(pendingEmail);
      const body = (await r.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!r.ok) {
        setResendNote(body.error || 'Could not resend. Try again in a moment.');
      } else {
        setOtp('');
        setResendNote(body.message || 'A fresh code was sent to your email.');
        setResendCooldown(60);
      }
    } catch {
      setResendNote('Network error. Please try again.');
    } finally {
      setResendBusy(false);
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
          {/* Logo */}
          <motion.div className="auth-logo" variants={itemVariants}>
            <Link to="/">
              <Logo size="md" showText={true} vertical={true} />
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div className="auth-header" variants={itemVariants}>
            <h1 className="auth-title">
              {pendingEmail ? 'Check your email' : 'Create Your Account'}
            </h1>
            <p className="auth-subtitle">
              {pendingEmail
                ? `We sent a 6-digit code to ${pendingEmail}`
                : 'Join Lumina to streamline your support ticketing system'}
            </p>
          </motion.div>

          {/* ── Pending email: inline OTP ── */}
          {pendingEmail ? (
            <motion.div
              className="auth-form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {otpError && (
                <div className="auth-error">{otpError}</div>
              )}

              {resendNote && (
                <p className="auth-notice auth-notice--info">{resendNote}</p>
              )}

              <div className="form-group">
                <label>6-digit verification code</label>
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4px' }}>
                  <InputOTP
                    maxLength={6}
                    pattern={REGEXP_ONLY_DIGITS}
                    value={otp}
                    onChange={handleOtpChange}
                    containerClassName="justify-center"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                type="button"
                loading={otpLoading}
                disabled={otp.length !== 6 || otpLoading}
                onClick={() => submitOtp(otp)}
              >
                {otpLoading ? 'Verifying…' : 'Verify Account'}
              </Button>

              <div className="auth-resend-row">
                <span className="auth-hint">Didn't receive a code?</span>
                <button
                  className="auth-resend-btn"
                  type="button"
                  onClick={handleResend}
                  disabled={resendBusy || resendCooldown > 0}
                >
                  {resendBusy
                    ? 'Sending…'
                    : resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : 'Resend code'}
                </button>
              </div>

              <div className="auth-footer">
                <p>
                  <Link to="/login" className="auth-link">Back to Sign In</Link>
                </p>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Google Sign-Up */}
              <motion.div variants={itemVariants}>
                <GoogleAuthButton
                  mode="signup"
                  onError={(msg) => setErrors((prev) => ({ ...prev, form: msg }))}
                />
              </motion.div>

              <motion.div className="auth-divider" variants={itemVariants}>
                <span>or</span>
              </motion.div>

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
                  <motion.div variants={itemVariants} key="details-step">
                    <p className="auth-notice auth-notice--info" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', flexWrap: 'wrap' }}>
                      <span>Signing up as <strong>{formData.email}</strong></span>
                      <span style={{ color: 'var(--color-muted)' }}>·</span>
                      <button type="button" className="auth-link-small" style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }} onClick={() => setStep('email')}>Change</button>
                    </p>

                    <div className="auth-form-row" style={{ marginTop: '18px' }}>
                      <Input
                        id="firstName"
                        label="First Name"
                        type="text"
                        name="firstName"
                        placeholder="John"
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
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={handleChange}
                        error={errors.lastName}
                        required
                      />
                    </div>

                    <div style={{ marginTop: '18px' }}>
                      <Input
                        id="password"
                        label="Password"
                        type="password"
                        name="password"
                        placeholder="Minimum 8 characters"
                        value={formData.password}
                        onChange={handleChange}
                        error={errors.password}
                        helpText={PASSWORD_REQUIREMENTS_TEXT}
                        required
                      />
                    </div>

                    <div style={{ marginTop: '18px' }}>
                      <Input
                        id="confirmPassword"
                        label="Confirm Password"
                        type="password"
                        name="confirmPassword"
                        placeholder="Re-enter your password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        error={errors.confirmPassword}
                        required
                      />
                    </div>

                    <div style={{ marginTop: '24px' }}>
                      <Button variant="primary" size="lg" type="submit" loading={loading}>
                        {loading ? 'Creating Account…' : 'Create Account'}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {errors.form && (
                  <motion.div className="auth-error" variants={itemVariants}>
                    {errors.form}
                  </motion.div>
                )}
              </motion.form>

              <motion.div className="auth-footer" variants={itemVariants}>
                <p>
                  Already have an account?{' '}
                  <Link to="/login" className="auth-link">Sign in here</Link>
                </p>
              </motion.div>
            </>
          )}
        </motion.div>
      </Container>
    </div>
  );
}

export default SignUpPage;
