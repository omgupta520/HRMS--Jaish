import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import ProtectedRoute from './routes/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import { ROLES } from './utils/constants';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Leaves from './pages/Leaves';
import Payroll from './pages/Payroll';
import Announcements from './pages/Announcements';
import Companies from './pages/Companies';
import MasterData from './pages/MasterData';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

const { HR, SUPER_ADMIN, MANAGER } = ROLES;

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Authenticated app shell */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/employees" element={<ProtectedRoute roles={[SUPER_ADMIN, HR, MANAGER]}><Employees /></ProtectedRoute>} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/leaves" element={<Leaves />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/companies" element={<ProtectedRoute roles={[SUPER_ADMIN]}><Companies /></ProtectedRoute>} />
        <Route path="/master-data" element={<ProtectedRoute roles={[SUPER_ADMIN, HR]}><MasterData /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute roles={[SUPER_ADMIN, HR, MANAGER]}><Reports /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute roles={[SUPER_ADMIN, HR]}><Settings /></ProtectedRoute>} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
