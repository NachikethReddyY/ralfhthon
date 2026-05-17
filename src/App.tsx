import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import NotFoundPage from './pages/NotFoundPage';
import ServerErrorPage from './pages/ServerErrorPage';
import LuminaWorkspacePage from './pages/LuminaWorkspacePage';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './context/ToastContext';
import './App.css';

function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<ProtectedRoute><LuminaWorkspacePage /></ProtectedRoute>} />
        <Route path="/workspace" element={<ProtectedRoute><LuminaWorkspacePage /></ProtectedRoute>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />

        <Route path="/dashboard" element={<ProtectedRoute><LuminaWorkspacePage /></ProtectedRoute>} />
        <Route path="/dashboard/*" element={<ProtectedRoute><LuminaWorkspacePage /></ProtectedRoute>} />
        <Route path="/tickets/*" element={<ProtectedRoute><LuminaWorkspacePage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><LuminaWorkspacePage /></ProtectedRoute>} />
        <Route path="/account-settings" element={<ProtectedRoute><LuminaWorkspacePage /></ProtectedRoute>} />
        <Route path="/user/*" element={<ProtectedRoute><LuminaWorkspacePage /></ProtectedRoute>} />
        <Route path="/admin/*" element={<ProtectedRoute><LuminaWorkspacePage /></ProtectedRoute>} />
        <Route path="/super-admin/*" element={<ProtectedRoute><LuminaWorkspacePage /></ProtectedRoute>} />
        <Route path="/routing-logs" element={<ProtectedRoute><LuminaWorkspacePage /></ProtectedRoute>} />

        <Route path="/500" element={<ServerErrorPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;
