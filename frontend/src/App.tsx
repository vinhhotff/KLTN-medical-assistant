import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage.js';
import { ProtectedRoute } from './components/common/ProtectedRoute.js';
import { AdminLayout } from './layouts/AdminLayout.js';
import { DoctorLayout } from './layouts/DoctorLayout.js';
import { PatientLayout } from './layouts/PatientLayout.js';
import { AdminDashboard } from './pages/admin/AdminDashboard.js';
import { DoctorVettingPage } from './pages/admin/DoctorVettingPage.js';
import { UserManagementPage } from './pages/admin/UserManagementPage.js';
import { SpecialtyManagementPage } from './pages/admin/SpecialtyManagementPage.js';
import { DoctorDashboard } from './pages/doctor/DoctorDashboard.js';
import { DoctorProfilePage } from './pages/doctor/DoctorProfilePage.js';
import { PatientDashboard } from './pages/patient/PatientDashboard.js';
import { DocumentSummarizerPage } from './pages/patient/DocumentSummarizerPage.js';
import { DoctorSearchPage } from './pages/patient/DoctorSearchPage.js';
import { SymptomTriagePage } from './pages/patient/SymptomTriagePage.js';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Admin Protected Routes */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="doctors" element={<DoctorVettingPage />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route path="specialties" element={<SpecialtyManagementPage />} />
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
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
