import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default' | 'neutral' | 'teal';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className = '',
}) => {
  const variantStyles = {
    success: 'bg-[#E0ECDE] text-[#2C6975] border-[#CDE0C9]',
    teal: 'bg-[#2C6975]/10 text-[#2C6975] border-[#2C6975]/20',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-sky-50 text-sky-800 border-sky-200',
    default: 'bg-[#E0ECDE] text-[#2C6975] border-[#CDE0C9]',
    neutral: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
