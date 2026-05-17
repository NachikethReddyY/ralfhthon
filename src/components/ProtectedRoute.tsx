import { Navigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';

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

  if (user.status === 'suspended') {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    return <Navigate to="/login" replace state={{ message: 'This account is suspended.' }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
