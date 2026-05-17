import { useGoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../utils/apiClient';
import './GoogleAuthButton.css';

type Props = {
  mode: 'signin' | 'signup';
  onError?: (message: string) => void;
};

import { useState } from 'react';

export function GoogleAuthButton({ mode, onError }: Props) {
  const navigate = useNavigate();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [loading, setLoading] = useState(false);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse: { access_token: string }) => {
      setLoading(false);
      try {
        const res = await authApi.google({ accessToken: tokenResponse.access_token });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          accessToken?: string;
          refreshToken?: string;
          code?: string;
          verificationEmail?: string;
        };

        if (!res.ok) {
          if (res.status === 403 && data.code === 'EMAIL_NOT_VERIFIED') {
            if (data.verificationEmail) {
              localStorage.setItem('pendingVerificationEmail', data.verificationEmail);
            }
            navigate('/verify-email-otp');
            return;
          }
          onError?.(data.error || 'Google sign-in failed.');
          return;
        }

        if (data.accessToken) {
          localStorage.setItem('authToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken || '');
          localStorage.removeItem('pendingVerificationEmail');
        }

        navigate('/dashboard');
      } catch (err) {
        console.error('Google login error:', err);
        onError?.('Failed to connect to authentication server.');
      }
    },
    onError: () => {
      setLoading(false);
      onError?.('Google sign-in was cancelled or failed.');
    },
  });

  if (!clientId) {
    return (
      <p className="auth-hint">
        Set <code>VITE_GOOGLE_CLIENT_ID</code> in <code>.env</code>.
      </p>
    );
  }

  return (
    <div className="auth-google-container">
      <button
        className="google-btn-custom"
        onClick={() => {
          setLoading(true);
          login();
        }}
        type="button"
        disabled={loading}
      >
        {loading ? (
          <span className="google-btn-loading">Connecting…</span>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
              <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957273V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
              <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957273C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957273 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
              <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957273 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
            </svg>
            <span>{mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}</span>
          </>
        )}
      </button>
    </div>
  );
}

export default GoogleAuthButton;
