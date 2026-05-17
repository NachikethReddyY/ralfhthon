import { Navigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';

function needsNameCompletion(user: { first_name: string; last_name: string } | null | undefined): boolean {
  if (!user) return false;
  const first = user.first_name.trim().toLowerCase();
  const last = user.last_name.trim().toLowerCase();
  return (
    !first ||
    !last ||
    (last === 'user' && (first === 'new' || first === 'google'))
  );
}

type Props = {
  children: React.ReactNode;
  roles?: Array<'user' | 'admin' | 'super_admin'>;
};

export function ProtectedRoute({ children, roles }: Props) {
  const location = useLocation();
  const { user, loading } = useCurrentUser();
  const token = localStorage.getItem('authToken');

  if (loading && token) {
    return <div style={{ minHeight: '100vh', background: '#0b0c0e' }} />;
  }

  // Step 1: Check authentication
  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const onCompleteProfilePage = location.pathname === '/complete-profile';

  // Step 2: If this is a Google placeholder account, collect the real name first.
  // Allow the complete-profile page itself to render so the user can fix the name.
  if (needsNameCompletion(user)) {
    if (!onCompleteProfilePage) {
      return <Navigate to="/complete-profile" replace />;
    }
    return <>{children}</>;
  }

  // Step 3: Check email verification (required for all users)
  if (!user.email_is_verified && location.pathname !== '/verify-email-otp') {
    return <Navigate to="/verify-email-otp" replace />;
  }

  // Step 4: Check onboarding completion (skip for super_admin)
  if (!user.onboarding_completed && user.role !== 'super_admin') {
    if (location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />;
    }
    // Allow viewing onboarding page
    return <>{children}</>;
  }

  // Step 5: Check approval status (after onboarding is complete)
  if (user.status !== 'active') {
    if (location.pathname !== '/pending-approval') {
      return <Navigate to="/pending-approval" replace />;
    }
    // Allow viewing pending approval page
    return <>{children}</>;
  }

  // Step 5: Check role-based access (only for dashboard pages)
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // All checks passed - render the component
  return <>{children}</>;
}

export default ProtectedRoute;

