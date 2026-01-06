
import React, { useState } from 'react';

interface ContextMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    tooltip?: string;
    tooltipPosition?: 'top' | 'bottom';
}

export const ContextMenuButton: React.FC<ContextMenuButtonProps> = ({ tooltip, tooltipPosition = 'top', children, className, onMouseDown, ...props }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
        <button 
            className={`relative ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseDown={onMouseDown}
            {...props}
        >
            {children}
            {tooltip && (
                <div 
                    className={`absolute ${tooltipPosition === 'top' ? 'bottom-full mb-2 origin-bottom' : 'top-full mt-2 origin-top'} left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-700 text-slate-200 text-xs whitespace-nowrap rounded shadow-xl z-[70] pointer-events-none transition-all duration-100 ease-out transform ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
                >
                    {tooltip}
                </div>
            )}
        </button>
    );
};
