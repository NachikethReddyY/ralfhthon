import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import VerifyEmailOtpPage from './pages/VerifyEmailOtpPage';
import OnboardingPage from './pages/OnboardingPage';
import OAuthNamePage from './pages/OAuthNamePage';
import PendingApprovalPage from './pages/PendingApprovalPage';
import NotFoundPage from './pages/NotFoundPage';
import ServerErrorPage from './pages/ServerErrorPage';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import RoleDashboardPage from './pages/RoleDashboardPage';
import ProfilePage from './pages/ProfilePage';
import TicketDetailPage from './pages/TicketDetailPage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import TicketHistoryPage from './pages/TicketHistoryPage';
import LuminaWorkspacePage from './pages/LuminaWorkspacePage';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './context/ToastContext';
import './App.css';

function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/workspace" element={<LuminaWorkspacePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/verify-email-otp" element={<VerifyEmailOtpPage />} />

        <Route path="/complete-profile" element={<ProtectedRoute><OAuthNamePage /></ProtectedRoute>} />
        <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
        <Route path="/pending-approval" element={<ProtectedRoute><PendingApprovalPage /></ProtectedRoute>} />

        <Route path="/dashboard" element={<ProtectedRoute><RoleDashboardPage /></ProtectedRoute>} />
        <Route path="/dashboard/tickets" element={<ProtectedRoute><RoleDashboardPage /></ProtectedRoute>} />
        <Route path="/tickets" element={<ProtectedRoute><TicketHistoryPage /></ProtectedRoute>} />
        <Route path="/tickets/history" element={<ProtectedRoute><TicketHistoryPage /></ProtectedRoute>} />

        <Route path="/tickets/:id" element={<ProtectedRoute><TicketDetailPage /></ProtectedRoute>} />

        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/account-settings" element={<ProtectedRoute><AccountSettingsPage /></ProtectedRoute>} />

        <Route path="/user/dashboard" element={<ProtectedRoute roles={['user']}><UserDashboard /></ProtectedRoute>} />
        <Route path="/admin/dashboard" element={<ProtectedRoute roles={['admin', 'super_admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/super-admin/dashboard" element={<ProtectedRoute roles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>} />
        <Route path="/super-admin/users" element={<ProtectedRoute roles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>} />
        <Route path="/super-admin/approvals" element={<ProtectedRoute roles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>} />
        <Route path="/routing-logs" element={<ProtectedRoute roles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>} />

        <Route path="/500" element={<ServerErrorPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;
