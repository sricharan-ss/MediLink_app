import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  subtext?: string;
  icon: React.ReactNode | React.ComponentType<{ className?: string }>;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  accentColor?: string;
  color?: 'teal' | 'green' | 'amber' | 'rose' | 'blue' | string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  subtext,
  icon,
  trend,
  accentColor,
  color,
}) => {
  const displaySubtitle = subtitle || subtext;

  const colorMap: Record<string, string> = {
    teal: '#2C6975',
    green: '#10B981',
    amber: '#F59E0B',
    rose: '#EF4444',
    blue: '#3B82F6',
  };

  const resolvedColor = accentColor || (color && colorMap[color]) || color || '#2C6975';

  const renderIcon = () => {
    if (React.isValidElement(icon)) {
      return icon;
    }
    if (typeof icon === 'function') {
      const IconComp = icon as React.ComponentType<{ className?: string }>;
      return <IconComp className="h-5 w-5" />;
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-xs hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#607D80] uppercase tracking-wider">
          {title}
        </span>
        <div
          className="p-2.5 rounded-lg flex items-center justify-center"
          style={{
            backgroundColor: `${resolvedColor}15`,
            color: resolvedColor,
          }}
        >
          {renderIcon()}
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-[#263238]">{value}</div>
        {(displaySubtitle || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <span
                className={`text-xs font-semibold ${
                  trend.isPositive ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {trend.value}
              </span>
            )}
            {displaySubtitle && <span className="text-xs text-[#607D80]">{displaySubtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
