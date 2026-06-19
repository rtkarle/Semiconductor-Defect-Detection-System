import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import { PageLoader } from './components/common/LoadingSpinner';

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
const Home             = lazy(() => import('./pages/Home'));
const Login            = lazy(() => import('./pages/auth/Login'));
const Register         = lazy(() => import('./pages/auth/Register'));
const ForgotPassword   = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword    = lazy(() => import('./pages/auth/ResetPassword'));
const Dashboard        = lazy(() => import('./pages/Dashboard'));
const UploadInspection = lazy(() => import('./pages/UploadInspection'));
const ScanHistory      = lazy(() => import('./pages/ScanHistory'));
const ScanDetail       = lazy(() => import('./pages/ScanDetail'));
const Analytics        = lazy(() => import('./pages/Analytics'));
const Reports          = lazy(() => import('./pages/Reports'));
const Profile          = lazy(() => import('./pages/Profile'));
const Notifications    = lazy(() => import('./pages/Notifications'));
const NotFound         = lazy(() => import('./pages/NotFound'));

// ── Route guards ──────────────────────────────────────────────────────────────
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

// ── App routes ────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/"               element={<Home />} />
        <Route path="/login"          element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register"       element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />

        {/* Protected — use AppLayout as shell */}
        <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route path="/dashboard"    element={<Dashboard />} />
          <Route path="/inspect"      element={<UploadInspection />} />
          <Route path="/history"      element={<ScanHistory />} />
          <Route path="/history/:id"  element={<ScanDetail />} />
          <Route path="/analytics"    element={<Analytics />} />
          <Route path="/reports"      element={<Reports />} />
          <Route path="/profile"      element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
