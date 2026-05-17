import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import Logo from '../components/Logo';
import Button from '../components/Button';
import Container from '../components/Container';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../components/ui/input-otp';
import { useToast } from '../context/ToastContext';
import { authApi } from '../utils/apiClient';
import './AuthPage.css';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function VerifyEmailOtpPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const emailFromQuery = searchParams.get('email') || '';
  const storedEmail =
    typeof window !== 'undefined' ? localStorage.getItem('pendingVerificationEmail') || '' : '';
  const pendingEmail = emailFromQuery || storedEmail;

  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState<Status>(pendingEmail ? 'idle' : 'error');
  const [message, setMessage] = useState('');
  const [resendBusy, setResendBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!pendingEmail) {
      setMessage(
        'We could not find the email waiting for verification. Please sign up again.'
      );
    }
  }, [pendingEmail]);

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

  const submitOtp = async (code: string) => {
    if (!pendingEmail || code.length !== 6) return;
    setStatus('loading');
    setMessage('');
    try {
      const res = await authApi.verifyEmailOtp(pendingEmail, code);
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        accessToken?: string;
      };
      if (!res.ok) {
        setStatus('error');
        showToast(data.error || 'Invalid code.', 'error');
        setOtp('');
        return;
      }
      if (data.accessToken) {
        localStorage.setItem('authToken', data.accessToken);
        localStorage.setItem('refreshToken', '');
      }
      localStorage.removeItem('pendingVerificationEmail');
      setStatus('success');
      showToast(data.message || 'Email verified!', 'success');
      navigate('/onboarding');
    } catch {
      setStatus('error');
      showToast('Network error.', 'error');
    }
  };

  const handleOtpChange = (value: string) => {
    setOtp(value);
    if (value.length === 6 && status !== 'loading') {
      submitOtp(value);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail || resendBusy || resendCooldown > 0) return;
    setResendBusy(true);
    setMessage('');
    try {
      const res = await authApi.resendVerification(pendingEmail);
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (res.ok) {
        setOtp('');
        setStatus('idle');
        showToast(data.message || 'Code sent!', 'success');
        setResendCooldown(60);
      } else {
        setStatus('error');
        showToast(data.error || 'Could not resend.', 'error');
      }
    } catch {
      setStatus('error');
      showToast('Network error.', 'error');
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
          <motion.div className="auth-logo" variants={itemVariants}>
            <Link to="/">
              <Logo size="md" showText={true} vertical={true} />
            </Link>
          </motion.div>

          <motion.div className="auth-header" variants={itemVariants}>
            <h1 className="auth-title">Verify your email</h1>
            <p className="auth-subtitle">
              Enter the 6-digit code sent to your email.
            </p>
          </motion.div>

          {status === 'error' && message && (
            <p className="auth-notice auth-notice--error">{message}</p>
          )}

          <div className="auth-form">
            {pendingEmail && (
              <p className="auth-notice auth-notice--info" style={{ marginBottom: '24px' }}>
                Verifying <strong>{pendingEmail}</strong>
              </p>
            )}

            <div className="form-group" style={{ alignItems: 'center', marginBottom: '32px' }}>
              <InputOTP
                maxLength={6}
                pattern={REGEXP_ONLY_DIGITS}
                value={otp}
                onChange={handleOtpChange}
                containerClassName="justify-center"
              >
                <InputOTPGroup style={{ gap: '8px' }}>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              onClick={() => submitOtp(otp)}
              size="lg"
              loading={status === 'loading'}
              disabled={!pendingEmail || otp.length !== 6 || status === 'loading'}
            >
              Verify Account
            </Button>

            <div className="auth-resend-row" style={{ marginTop: '24px' }}>
              <span className="auth-hint">Didn't receive a code?</span>
              <button
                className="auth-link auth-resend-btn"
                type="button"
                onClick={handleResend}
                disabled={resendBusy || resendCooldown > 0 || !pendingEmail}
              >
                {resendBusy
                  ? 'Sending…'
                  : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : 'Resend code'}
              </button>
            </div>
          </div>

          <motion.div className="auth-footer" variants={itemVariants}>
            <p>
              <Link to="/signup" className="auth-link">Back to Sign Up</Link>
              {' · '}
              <Link to="/login" className="auth-link">Sign In</Link>
            </p>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  );
}

export default VerifyEmailOtpPage;
