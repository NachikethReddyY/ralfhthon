import { Navigate } from 'react-router-dom';
import UserDashboard from './UserDashboard';
import AdminDashboard from './AdminDashboard';
import SuperAdminDashboard from './SuperAdminDashboard';
import { useCurrentUser } from '../hooks/useCurrentUser';

export function RoleDashboardPage() {
  const { user, loading } = useCurrentUser();

  if (loading) {
    return <div style={{ minHeight: '100vh', background: 'var(--color-canvas)' }} />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'super_admin') {
    return <SuperAdminDashboard />;
  }
  if (user.role === 'admin') {
    return <AdminDashboard />;
  }
  return <UserDashboard />;
}

export default RoleDashboardPage;

