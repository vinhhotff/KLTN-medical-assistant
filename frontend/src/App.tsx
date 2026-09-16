import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { OAuth2CallbackPage } from './pages/OAuth2CallbackPage';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AdminLayout } from './layouts/AdminLayout';
import { DoctorLayout } from './layouts/DoctorLayout';
import { PatientLayout } from './layouts/PatientLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { DoctorManagementPage } from './pages/admin/DoctorManagementPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { SpecialtyManagementPage } from './pages/admin/SpecialtyManagementPage';
import { AppointmentSupervisionPage } from './pages/admin/AppointmentSupervisionPage';
import { TriageSupervisionPage } from './pages/admin/TriageSupervisionPage';
import { AuditLogPage } from './pages/admin/AuditLogPage';
import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { DoctorProfilePage } from './pages/doctor/DoctorProfilePage';
import { PatientDashboard } from './pages/patient/PatientDashboard';
import { DoctorSearchPage } from './pages/patient/DoctorSearchPage';
import { DocumentSummarizerPage } from './pages/patient/DocumentSummarizerPage';
import { SymptomTriagePage } from './pages/patient/SymptomTriagePage';

export function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* OAuth2 Callback — Backend redirect ve day sau khi Google xac thuc thanh cong */}
          <Route path="/oauth2/callback" element={<OAuth2CallbackPage />} />

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
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
