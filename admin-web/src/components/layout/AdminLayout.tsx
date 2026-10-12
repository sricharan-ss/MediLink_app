import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { authService } from '../../services/authService';

interface AdminLayoutProps {
  title?: string;
  description?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  title = 'MediLink Administration',
  description,
  onRefresh,
  isRefreshing,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    authService.logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex">
      {/* Sidebar */}
      <Sidebar
        onLogout={handleLogout}
        isMobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Header
          title={title}
          description={description}
          onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        <footer className="px-6 py-4 border-t border-gray-200/60 text-center text-xs text-[#607D80]">
          MediLink Healthcare Platform &copy; {new Date().getFullYear()} — Administrator Management Portal
        </footer>
      </div>
    </div>
  );
};
