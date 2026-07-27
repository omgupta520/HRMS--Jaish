/**
 * Guards a route: redirects unauthenticated users to /login and (optionally)
 * restricts access to specific roles.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Loader } from '../components/ui';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuthStore();
  const location = useLocation();

  if (loading) return <Loader label="Authenticating..." />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}
