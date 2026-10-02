import React, { useState } from 'react';

export interface CustomToggleProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  sublabel?: string;
  tooltip?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const CustomToggle: React.FC<CustomToggleProps> = ({
  id,
  checked,
  onChange,
  label,
  sublabel,
  tooltip,
  icon,
  disabled = false,
  size = 'md',
  className = '',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onChange(!checked);
    }
  };

  const isSmall = size === 'sm';

  return (
    <div
      id={id}
      onClick={handleClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className={`relative group inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-200 select-none cursor-pointer ${
        disabled
          ? 'opacity-40 cursor-not-allowed border-gray-800 bg-gray-900/40'
          : checked
          ? 'bg-indigo-950/40 border-indigo-500/60 shadow-[0_0_12px_rgba(99,102,241,0.2)] hover:border-indigo-400'
          : 'bg-gray-900/60 border-gray-700/60 hover:border-gray-600 hover:bg-gray-850'
      } ${className}`}
      role="switch"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          if (!disabled) onChange(!checked);
        }
      }}
    >
      {/* Switch Pill (Analogous to user's reference design) */}
      <div
        className={`relative shrink-0 rounded-full transition-colors duration-200 ease-in-out p-0.5 ${
          isSmall ? 'w-7 h-4' : 'w-8 h-4.5 min-w-[2rem]'
        } ${
          checked
            ? 'bg-indigo-500 shadow-sm'
            : 'bg-gray-700 group-hover:bg-gray-600'
        }`}
      >
        {/* White Sliding Thumb */}
        <div
          className={`bg-white rounded-full transition-transform duration-200 ease-in-out shadow-md ${
            isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'
          } ${
            checked
              ? isSmall
                ? 'transform translate-x-3'
                : 'transform translate-x-3.5'
              : 'transform translate-x-0'
          }`}
        />
      </div>

      {/* Label and Icon */}
      {(label || icon) && (
        <div className="flex items-center gap-1.5 min-w-0 pr-0.5">
          {icon && (
            <span
              className={`shrink-0 transition-colors ${
                checked ? 'text-indigo-300' : 'text-gray-400'
              }`}
            >
              {icon}
            </span>
          )}
          {label && (
            <div className="flex flex-col min-w-0">
              <span
                className={`text-[11px] font-medium truncate transition-colors leading-tight ${
                  checked ? 'text-gray-100 font-semibold' : 'text-gray-300'
                }`}
              >
                {label}
              </span>
              {sublabel && (
                <span className="text-[9px] text-gray-400 truncate leading-none mt-0.5">
                  {sublabel}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Floating Tooltip Bubble */}
      {tooltip && showTooltip && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none whitespace-normal min-w-[160px] max-w-[240px]">
          <div className="bg-gray-950 text-gray-200 text-[10px] rounded-md px-2.5 py-1.5 shadow-2xl border border-gray-700/90 text-center leading-tight">
            {tooltip}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-950"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomToggle;
