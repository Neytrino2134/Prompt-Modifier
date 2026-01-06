
import React from 'react';

interface ActionButtonProps { 
    title: string; 
    onClick: (e: React.MouseEvent) => void; 
    children: React.ReactNode; 
    tooltipPosition?: 'top' | 'left' | 'right' | 'bottom'; 
    tooltipAlign?: 'start' | 'center' | 'end';
    disabled?: boolean;
    className?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({ 
    title, 
    onClick, 
    children, 
    tooltipPosition = 'top', 
    tooltipAlign = 'center',
    disabled = false, 
    className 
}) => {
    const baseClassName = "p-1 text-gray-400 rounded hover:bg-gray-600 hover:text-white transition-colors duration-150 focus:outline-none disabled:text-gray-600 disabled:bg-transparent disabled:cursor-not-allowed flex items-center justify-center";
    const finalClassName = className ? className : baseClassName;

    let positionClasses = '';
    
    if (tooltipPosition === 'top') {
        positionClasses = 'bottom-full mb-2';
        if (tooltipAlign === 'center') positionClasses += ' left-1/2 -translate-x-1/2';
        else if (tooltipAlign === 'start') positionClasses += ' left-0';
        else if (tooltipAlign === 'end') positionClasses += ' right-0';
    } else if (tooltipPosition === 'bottom') {
        positionClasses = 'top-full mt-2';
        if (tooltipAlign === 'center') positionClasses += ' left-1/2 -translate-x-1/2';
        else if (tooltipAlign === 'start') positionClasses += ' left-0';
        else if (tooltipAlign === 'end') positionClasses += ' right-0';
    } else if (tooltipPosition === 'left') {
        positionClasses = 'right-full top-1/2 -translate-y-1/2 mr-2';
    } else if (tooltipPosition === 'right') {
        positionClasses = 'left-full top-1/2 -translate-y-1/2 ml-2';
    }

    return (
        <div className="relative group/btn-tooltip flex items-center justify-center">
            <button
                onClick={onClick}
                disabled={disabled}
                onMouseDown={(e) => e.stopPropagation()} // Prevent node dragging
                aria-label={title}
                className={finalClassName}
            >
                {children}
            </button>
            
            {title && !disabled && (
                <div
                    className={`absolute ${positionClasses} px-2 py-1 bg-slate-700 text-slate-200 text-[10px] font-bold whitespace-nowrap rounded-md shadow-xl z-50 opacity-0 pointer-events-none group-hover/btn-tooltip:opacity-100 transition-opacity duration-200`}
                    role="tooltip"
                >
                    {title}
                </div>
            )}
        </div>
    );
};
