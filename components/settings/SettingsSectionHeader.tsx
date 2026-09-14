import React, { ReactNode } from 'react';

interface SettingsSectionHeaderProps {
  title: string;
  icon: ReactNode;
  iconColorClass?: string;
  isCollapsed: boolean;
  onToggle: () => void;
}

export const SettingsSectionHeader: React.FC<SettingsSectionHeaderProps> = ({
  title,
  icon,
  iconColorClass = 'text-accent',
  isCollapsed,
  onToggle,
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex justify-between items-center px-3.5 py-2.5 bg-gray-900/80 hover:bg-gray-700/60 rounded-lg border border-gray-700/70 transition-all text-left group select-none shadow-sm"
    >
      <div className="flex items-center gap-2.5">
        <span className={`${iconColorClass} group-hover:scale-110 transition-transform`}>
          {icon}
        </span>
        <span className="text-xs font-bold text-gray-200 group-hover:text-white uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-gray-400 group-hover:text-gray-200">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 transition-transform duration-200 ${!isCollapsed ? `rotate-180 ${iconColorClass}` : 'rotate-0'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </button>
  );
};
