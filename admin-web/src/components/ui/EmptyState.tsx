import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  actionText?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionText,
  actionLabel,
  onAction,
  className = '',
}) => {
  const btnText = actionText || actionLabel;

  const renderIcon = () => {
    if (!icon) {
      return <Inbox className="h-6 w-6 text-[#2C6975]" />;
    }
    if (React.isValidElement(icon)) {
      return icon;
    }
    if (typeof icon === 'function') {
      const IconComp = icon as React.ComponentType<{ className?: string }>;
      return <IconComp className="h-6 w-6 text-[#2C6975]" />;
    }
    return <Inbox className="h-6 w-6 text-[#2C6975]" />;
  };

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200 ${className}`}
    >
      <div className="p-3 bg-[#E0ECDE]/50 text-[#2C6975] rounded-full mb-3">
        {renderIcon()}
      </div>
      <h4 className="text-sm font-semibold text-[#263238]">{title}</h4>
      {description && (
        <p className="text-xs text-[#607D80] max-w-sm mt-1">{description}</p>
      )}
      {btnText && onAction && (
        <Button size="sm" variant="outline" className="mt-4" onClick={onAction}>
          {btnText}
        </Button>
      )}
    </div>
  );
};
