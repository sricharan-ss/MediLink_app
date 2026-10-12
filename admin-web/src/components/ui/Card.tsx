import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  subtitle?: string;
  action?: React.ReactNode;
  orientation?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  description,
  subtitle,
  action,
}) => {
  const descText = description || subtitle;
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden ${className}`}
    >
      {(title || descText || action) && (
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-[#263238]">{title}</h3>
            )}
            {descText && (
              <p className="text-xs text-[#607D80] mt-0.5">{descText}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};
