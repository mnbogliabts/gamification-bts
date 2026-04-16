import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@contexts/AuthContext';
import Loading from '@components/Loading';
import Layout from '@components/Layout';
import LoginPage from '@pages/LoginPage';
import OAuthCallbackPage from '@pages/OAuthCallbackPage';
import DashboardPage from '@pages/DashboardPage';
import AdminDashboardPage from '@pages/admin/AdminDashboardPage';
import UsersPage from '@pages/admin/UsersPage';
import TrainingRecordsPage from '@pages/admin/TrainingRecordsPage';
import LeaderboardPage from '@pages/admin/LeaderboardPage';
import TechnologiesPage from '@pages/admin/TechnologiesPage';
import AnalyticsPage from '@pages/admin/AnalyticsPage';
import AuditLogsPage from '@pages/admin/AuditLogsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Loading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <Loading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<OAuthCallbackPage />} />

      {/* Protected routes with layout */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Admin routes */}
        <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
        <Route path="/admin/training-records" element={<AdminRoute><TrainingRecordsPage /></AdminRoute>} />
        <Route path="/admin/leaderboard" element={<AdminRoute><LeaderboardPage /></AdminRoute>} />
        <Route path="/admin/technologies" element={<AdminRoute><TechnologiesPage /></AdminRoute>} />
        <Route path="/admin/analytics" element={<AdminRoute><AnalyticsPage /></AdminRoute>} />
        <Route path="/admin/audit-logs" element={<AdminRoute><AuditLogsPage /></AdminRoute>} />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
