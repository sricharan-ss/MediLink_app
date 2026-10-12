import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminOverviewPage } from './pages/AdminOverviewPage';
import { HospitalsPage } from './pages/HospitalsPage';
import { DoctorsPage } from './pages/DoctorsPage';
import { PatientsPage } from './pages/PatientsPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import { AlertTriangle, Home } from 'lucide-react';
import { Button } from './components/ui/Button';

const NotFoundPage: React.FC = () => (
  <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center p-4">
    <div className="text-center max-w-md">
      <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-amber-50 text-amber-600 mb-4">
        <AlertTriangle className="h-8 w-8 text-amber-600" />
      </div>
      <h1 className="text-3xl font-bold text-[#263238]">404 - Page Not Found</h1>
      <p className="text-sm text-[#607D80] mt-2 mb-6">
        The requested administration page does not exist or you do not have permission to view it.
      </p>
      <Link to="/admin/dashboard">
        <Button className="inline-flex items-center gap-2">
          <Home className="h-4 w-4" />
          Return to Dashboard
        </Button>
      </Link>
    </div>
  </div>
);

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Redirect root / to /admin/dashboard */}
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

        {/* Protected Admin Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminOverviewPage />} />
            <Route path="/admin/hospitals" element={<HospitalsPage />} />
            <Route path="/admin/doctors" element={<DoctorsPage />} />
            <Route path="/admin/patients" element={<PatientsPage />} />
            <Route path="/admin/appointments" element={<AppointmentsPage />} />
            <Route path="/admin/payments" element={<PaymentsPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
          </Route>
        </Route>

        {/* Catch-all 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
