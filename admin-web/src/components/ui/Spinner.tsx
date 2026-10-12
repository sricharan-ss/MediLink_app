import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className = '',
  label,
}) => {
  const sizeMap = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={`flex flex-col items-center justify-center p-6 ${className}`}>
      <div
        className={`animate-spin rounded-full border-2 border-gray-200 border-t-[#2C6975] ${sizeMap[size]}`}
      />
      {label && <p className="mt-3 text-xs text-[#607D80]">{label}</p>}
    </div>
  );
};
