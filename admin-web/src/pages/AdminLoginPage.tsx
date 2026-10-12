import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, Lock, Mail, AlertCircle, ShieldCheck } from 'lucide-react';
import { authService } from '../services/authService';
import { getErrorMessage } from '../services/api';
import { Button } from '../components/ui/Button';

export const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const isExpired = new URLSearchParams(location.search).get('expired') === '1';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    try {
      setIsLoading(true);
      await authService.login(email.trim(), password);
      navigate('/admin/dashboard', { replace: true });
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoAdmin = (role: 'super' | 'hospital') => {
    if (role === 'super') {
      setEmail('admin@medilink.com');
      setPassword('Admin@12345');
    } else {
      setEmail('hospitaladmin@medilink.com');
      setPassword('Admin@12345');
    }
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-[#E0ECDE]/60 via-[#F8FAF9] to-[#CDE0C9]/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card Header & Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-[#2C6975] text-white shadow-lg mb-4">
            <Activity className="h-8 w-8 text-[#CDE0C9]" />
          </div>
          <h1 className="text-2xl font-bold text-[#263238] tracking-tight">
            MediLink Administration
          </h1>
          <p className="text-sm text-[#607D80] mt-1">
            Secure Healthcare Operations & Monitoring Portal
          </p>
        </div>

        {/* Login Form Container */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xl p-8 backdrop-blur-xs">
          {isExpired && (
            <div className="mb-6 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>Your session has expired. Please log in again to continue.</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-semibold text-[#263238] uppercase tracking-wider mb-2"
              >
                Administrator Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@medilink.com"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50/50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6975] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold text-[#263238] uppercase tracking-wider mb-2"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="admin-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50/50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6975] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full py-2.5 text-sm font-semibold rounded-xl"
              isLoading={isLoading}
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Sign In to Admin Dashboard
            </Button>
          </form>

          {/* Local Development Credentials Quick-Fill */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-[11px] font-medium text-[#607D80] mb-2">
              Authorized Local Environment Roles:
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fillDemoAdmin('super')}
                className="text-xs px-2.5 py-1 rounded-md bg-[#E0ECDE] text-[#2C6975] hover:bg-[#CDE0C9] transition-colors cursor-pointer font-medium"
              >
                SuperAdmin Demo
              </button>
              <button
                type="button"
                onClick={() => fillDemoAdmin('hospital')}
                className="text-xs px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer font-medium"
              >
                HospitalAdmin Demo
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              Roles are verified server-side via PostgreSQL and JWT.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-[#607D80] mt-6">
          MediLink Healthcare System &bull; Version 1.0.0
        </p>
      </div>
    </div>
  );
};
