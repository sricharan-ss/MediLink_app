import React from 'react';
import { Menu, Shield, RefreshCw } from 'lucide-react';
import { authService } from '../../services/authService';
import { Button } from '../ui/Button';

interface HeaderProps {
  onMobileMenuToggle: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  title: string;
  description?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onMobileMenuToggle,
  onRefresh,
  isRefreshing = false,
  title,
  description,
}) => {
  const user = authService.getCurrentUser();
  const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN') || Boolean(user?.superAdmin);

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-gray-200/80 px-4 sm:px-6 lg:px-8 py-3.5 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-[#263238] tracking-tight truncate">
              {title}
            </h1>
            {description && (
              <p className="text-xs text-[#607D80] hidden sm:block truncate mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions & Admin Status */}
        <div className="flex items-center gap-3">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              isLoading={isRefreshing}
              title="Refresh dataset"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''} mr-1.5`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          )}

          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-gray-200">
            <div className="h-8 w-8 rounded-full bg-[#E0ECDE] text-[#2C6975] flex items-center justify-center font-bold text-xs">
              {user?.firstName?.[0] || 'A'}
            </div>
            <div className="text-left text-xs">
              <p className="font-semibold text-[#263238] leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] text-[#2C6975] font-medium">
                <Shield className="h-2.5 w-2.5" />
                {isSuperAdmin ? 'SuperAdmin' : 'HospitalAdmin'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
