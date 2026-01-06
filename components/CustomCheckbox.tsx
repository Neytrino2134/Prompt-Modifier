
import React from 'react';

interface CustomCheckboxProps {
    checked: boolean;
    onChange: (checked: boolean, event: React.MouseEvent) => void;
    label?: string;
    disabled?: boolean;
    className?: string;
    title?: string;
    id?: string;
}

export const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
    checked,
    onChange,
    label,
    disabled = false,
    className = '',
    title,
    id
}) => {
    return (
        <div 
            id={id}
            className={`flex items-center space-x-2 cursor-pointer group select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
            onClick={(e) => {
                e.stopPropagation();
                if (!disabled) onChange(!checked, e);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title={title}
        >
            <div className={`
                w-4 h-4 min-w-[1rem] min-h-[1rem] rounded border flex items-center justify-center transition-all duration-200 ease-in-out flex-shrink-0 relative
                ${checked 
                    ? 'bg-accent border-accent shadow-[0_0_8px_var(--color-accent)]' 
                    : 'bg-gray-800 border-gray-600 group-hover:border-gray-500'
                }
            `}>
                <svg 
                    className={`w-3 h-3 text-white pointer-events-none block transition-transform duration-200 ${checked ? 'scale-100' : 'scale-0'}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    strokeWidth={3}
                    style={{ transformOrigin: 'center' }}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </div>
            {label && (
                <span className={`text-sm leading-tight pt-[1px] transition-colors ${checked ? 'text-gray-200' : 'text-gray-400'} group-hover:text-gray-300`}>
                    {label}
                </span>
            )}
        </div>
    );
};
