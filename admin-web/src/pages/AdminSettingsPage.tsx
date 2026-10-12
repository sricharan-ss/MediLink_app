import React, { useState } from 'react';
import {
  Shield,
  Mail,
  Phone,
  Building2,
  Server,
  Database,
  Lock,
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const AdminSettingsPage: React.FC = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN') || Boolean(user?.superAdmin);
  const isHospitalAdmin = user?.roles?.includes('HOSPITAL_ADMIN') || Boolean(user?.hospitalAdmin);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await authService.logout();
      navigate('/admin/login', { replace: true });
    } catch {
      navigate('/admin/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#263238] tracking-tight">System & Account Settings</h1>
        <p className="text-sm text-[#607D80] mt-1">
          Review administrator credentials, authorization level, active environment, and session security.
        </p>
      </div>

      {/* Account Profile Card */}
      <Card title="Administrator Account Profile" subtitle="Authenticated credentials and active role" orientation="none">
        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-6 border-b border-gray-100">
            <div className="h-16 w-16 rounded-2xl bg-[#2C6975] text-white flex items-center justify-center font-bold text-2xl shadow-inner">
              {user?.firstName?.charAt(0) || 'A'}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-[#263238]">
                  {user?.firstName} {user?.lastName}
                </h3>
                {isSuperAdmin && <Badge variant="teal">SUPER ADMINISTRATOR</Badge>}
                {isHospitalAdmin && <Badge variant="warning">HOSPITAL ADMINISTRATOR</Badge>}
              </div>
              <p className="text-xs text-[#607D80] font-mono mt-1">User ID: {user?.userId}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 text-xs">
              <span className="text-[#607D80] block mb-1 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-[#68B2A0]" />
                Primary Email
              </span>
              <span className="font-semibold text-[#263238] text-sm">{user?.email || 'None'}</span>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 text-xs">
              <span className="text-[#607D80] block mb-1 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-[#68B2A0]" />
                Registered Phone
              </span>
              <span className="font-semibold text-[#263238] text-sm">{user?.phoneNumber || 'None'}</span>
            </div>

            {user?.hospitalAdmin?.hospital && (
              <div className="sm:col-span-2 p-3.5 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                <span className="text-[#607D80] block mb-1 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-[#68B2A0]" />
                  Assigned Hospital Center
                </span>
                <span className="font-semibold text-[#263238] text-sm">
                  {user.hospitalAdmin.hospital.name} ({user.hospitalAdmin.hospital.city})
                </span>
                <p className="text-[11px] text-[#607D80] mt-1">
                  Scope of authority is restricted to patients, doctors, and schedules within this facility.
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Security & Access Policies Card */}
      <Card title="Security & Role Policies" subtitle="Backend authorization enforcement rules" orientation="none">
        <div className="p-6 space-y-4 text-xs">
          <div className="flex items-start gap-3 p-3.5 bg-[#E0ECDE]/40 border border-[#CDE0C9] rounded-xl text-[#2C6975]">
            <Shield className="h-5 w-5 shrink-0 text-[#2C6975] mt-0.5" />
            <div className="space-y-1">
              <strong className="block font-semibold">Strict Server-Side Role Enforcement</strong>
              <p className="text-[#607D80] leading-relaxed">
                MediLink enforces role authorization via backend middleware on all API endpoints. Frontend UI toggles
                are cosmetic only; tampering with client-side permissions will result in an immediate HTTP 403 Forbidden
                from the Express API server.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-gray-50 border border-gray-100 rounded-xl">
            <Lock className="h-5 w-5 shrink-0 text-[#607D80] mt-0.5" />
            <div className="space-y-1">
              <strong className="block font-semibold text-[#263238]">Role Self-Modification Restriction</strong>
              <p className="text-[#607D80] leading-relaxed">
                In compliance with healthcare security best practices, administrators cannot alter their own permission
                tier or elevate other accounts from the web dashboard. Administrative provisioning requires secure backend scripts.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* System Infrastructure Card */}
      <Card title="Infrastructure & Runtime Information" subtitle="Local service connectivity" orientation="none">
        <div className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[#607D80] block mb-1 flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-[#2C6975]" />
                API Base URL
              </span>
              <span className="font-mono text-[#263238] font-medium truncate block">
                {import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}
              </span>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[#607D80] block mb-1 flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-[#2C6975]" />
                ORM & Database
              </span>
              <span className="font-medium text-[#263238]">Prisma ORM (PostgreSQL)</span>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[#607D80] block mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Session Architecture
              </span>
              <span className="font-medium text-[#263238]">Bearer JWT / HTTP Bearer</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Session Termination Card */}
      <Card title="Session Termination" subtitle="Safely terminate active administrative session" orientation="none">
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#263238]">Log Out of MediLink Admin</p>
            <p className="text-xs text-[#607D80] mt-0.5">
              Revokes local token credentials and redirects to the administrator login interface.
            </p>
          </div>
          <Button
            variant="danger"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? 'Logging out...' : 'Sign Out'}
          </Button>
        </div>
      </Card>
    </div>
  );
};
export default AdminSettingsPage;
