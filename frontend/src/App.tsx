import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage.js';
import { ProtectedRoute } from './components/common/ProtectedRoute.js';
import { AdminLayout } from './layouts/AdminLayout.js';
import { DoctorLayout } from './layouts/DoctorLayout.js';
import { PatientLayout } from './layouts/PatientLayout.js';
import { AdminDashboard } from './pages/admin/AdminDashboard.js';
import { DoctorDashboard } from './pages/doctor/DoctorDashboard.js';
import { PatientDashboard } from './pages/patient/PatientDashboard.js';

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
          </Route>
        </Route>

        {/* Doctor Protected Routes */}
        <Route element={<ProtectedRoute allowedRoles={['DOCTOR']} />}>
          <Route path="/doctor" element={<DoctorLayout />}>
            <Route index element={<DoctorDashboard />} />
          </Route>
        </Route>

        {/* Patient Routes */}
        <Route path="/patient" element={<PatientLayout />}>
          <Route index element={<PatientDashboard />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
