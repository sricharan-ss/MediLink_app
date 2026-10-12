import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService';
import { ShieldAlert, LogOut } from 'lucide-react';
import { Button } from '../ui/Button';

export const ProtectedRoute: React.FC = () => {
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();
  const isAdmin = authService.isAdmin();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#E0ECDE]/60 via-[#F8FAF9] to-[#CDE0C9]/40 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-rose-200 shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-rose-50 text-rose-600 mb-4">
            <ShieldAlert className="h-8 w-8 text-rose-600" />
          </div>
          <h2 className="text-xl font-bold text-[#263238]">Access Denied</h2>
          <p className="text-sm text-[#607D80] mt-2 mb-6">
            Your authenticated account is not authorized as an administrator. MediLink administration is restricted to
            SuperAdmin and HospitalAdmin personnel.
          </p>
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                authService.logout();
                window.location.href = '/admin/login';
              }}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out & Switch Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
export default ProtectedRoute;
