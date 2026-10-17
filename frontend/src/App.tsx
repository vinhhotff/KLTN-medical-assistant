import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastProvider } from './components/ui';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AdminLayout } from './layouts/AdminLayout';
import { DoctorLayout } from './layouts/DoctorLayout';
import { PatientLayout } from './layouts/PatientLayout';

// Route-level code splitting: heavy pages (three.js landing, recharts admin, 3k-line doctor desk)
// are only downloaded when visited.
const LandingPage = lazy(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const OAuth2CallbackPage = lazy(() => import('./pages/OAuth2CallbackPage').then((m) => ({ default: m.OAuth2CallbackPage })));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const DoctorManagementPage = lazy(() => import('./pages/admin/DoctorManagementPage').then((m) => ({ default: m.DoctorManagementPage })));
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage').then((m) => ({ default: m.UserManagementPage })));
const SpecialtyManagementPage = lazy(() => import('./pages/admin/SpecialtyManagementPage').then((m) => ({ default: m.SpecialtyManagementPage })));
const AppointmentSupervisionPage = lazy(() => import('./pages/admin/AppointmentSupervisionPage').then((m) => ({ default: m.AppointmentSupervisionPage })));
const TriageSupervisionPage = lazy(() => import('./pages/admin/TriageSupervisionPage').then((m) => ({ default: m.TriageSupervisionPage })));
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage').then((m) => ({ default: m.AuditLogPage })));
const DoctorDashboard = lazy(() => import('./pages/doctor/DoctorDashboard').then((m) => ({ default: m.DoctorDashboard })));
const DoctorProfilePage = lazy(() => import('./pages/doctor/DoctorProfilePage').then((m) => ({ default: m.DoctorProfilePage })));
const DoctorPatientRecordsPage = lazy(() => import('./pages/doctor/DoctorPatientRecordsPage').then((m) => ({ default: m.DoctorPatientRecordsPage })));
const PatientDashboard = lazy(() => import('./pages/patient/PatientDashboard').then((m) => ({ default: m.PatientDashboard })));
const DoctorSearchPage = lazy(() => import('./pages/patient/DoctorSearchPage').then((m) => ({ default: m.DoctorSearchPage })));
const DocumentSummarizerPage = lazy(() => import('./pages/patient/DocumentSummarizerPage').then((m) => ({ default: m.DocumentSummarizerPage })));
const SymptomTriagePage = lazy(() => import('./pages/patient/SymptomTriagePage').then((m) => ({ default: m.SymptomTriagePage })));
const PaymentSuccessPage = lazy(() => import('./pages/patient/PaymentSuccessPage').then((m) => ({ default: m.PaymentSuccessPage })));

const RouteFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center" role="status" aria-label="Đang tải trang">
    <div className="w-8 h-8 rounded-full border-4 border-teal-200 border-t-teal-600 animate-spin" />
  </div>
);

export function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ToastProvider>
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* OAuth2 Callback — Backend redirect ve day sau khi Google xac thuc thanh cong */}
          <Route path="/oauth2/callback" element={<OAuth2CallbackPage />} />

          {/* Payment Callback & Receipt Verification */}
          <Route path="/payment/success" element={<PaymentSuccessPage />} />
          <Route path="/payment/cancel" element={<Navigate to="/patient/documents" replace />} />

          {/* Admin Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="appointments" element={<AppointmentSupervisionPage />} />
              <Route path="triage" element={<TriageSupervisionPage />} />
              <Route path="doctors" element={<DoctorManagementPage />} />
              <Route path="users" element={<UserManagementPage />} />
              <Route path="specialties" element={<SpecialtyManagementPage />} />
              <Route path="audit-logs" element={<AuditLogPage />} />
            </Route>
          </Route>

          {/* Doctor Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['DOCTOR']} />}>
            <Route path="/doctor" element={<DoctorLayout />}>
              <Route index element={<DoctorDashboard />} />
              <Route path="patients" element={<DoctorPatientRecordsPage />} />
              <Route path="profile" element={<DoctorProfilePage />} />
            </Route>
          </Route>

          {/* Patient Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']} />}>
            <Route path="/patient" element={<PatientLayout />}>
              <Route index element={<PatientDashboard />} />
              <Route path="triage" element={<SymptomTriagePage />} />
              <Route path="documents" element={<DocumentSummarizerPage />} />
              <Route path="doctors" element={<DoctorSearchPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        </ToastProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
