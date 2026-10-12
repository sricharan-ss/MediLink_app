import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  UserCheck,
  Users,
  CalendarCheck,
  CreditCard,
  Settings,
  LogOut,
  Shield,
  Activity,
} from 'lucide-react';
import { authService } from '../../services/authService';

interface SidebarProps {
  onLogout: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onLogout,
  isMobileOpen = false,
  onMobileClose,
}) => {
  const user = authService.getCurrentUser();
  const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN') || Boolean(user?.superAdmin);

  const navItems = [
    { name: 'Overview', to: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Hospitals', to: '/admin/hospitals', icon: Building2 },
    { name: 'Doctors', to: '/admin/doctors', icon: UserCheck },
    { name: 'Patients', to: '/admin/patients', icon: Users },
    { name: 'Appointments', to: '/admin/appointments', icon: CalendarCheck },
    { name: 'Invoices & Payments', to: '/admin/payments', icon: CreditCard },
    { name: 'Settings', to: '/admin/settings', icon: Settings },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#2C6975] text-white">
      {/* Branding */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center text-white shadow-inner">
            <Activity className="h-6 w-6 text-[#CDE0C9]" />
          </div>
          <div>
            <div className="font-bold text-lg tracking-tight flex items-center gap-1.5">
              MediLink <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 text-[#CDE0C9]">Admin</span>
            </div>
            <p className="text-[11px] text-white/70">Healthcare Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.to}
              onClick={onMobileClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white/20 text-white shadow-xs font-semibold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Admin Profile & Logout */}
      <div className="p-4 border-t border-white/10 bg-black/10">
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          <div className="h-9 w-9 rounded-full bg-[#68B2A0] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
            {user?.firstName?.[0] || 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <Shield className="h-3 w-3 text-[#CDE0C9]" />
              <span className="text-[10px] text-[#CDE0C9] font-medium tracking-wide">
                {isSuperAdmin ? 'Super Administrator' : 'Hospital Admin'}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white/90 bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30 shadow-md">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onMobileClose}
          />
          <div className="relative w-64 max-w-xs flex-1 flex flex-col z-10 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
