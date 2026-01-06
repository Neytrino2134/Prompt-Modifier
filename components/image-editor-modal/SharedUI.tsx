
import React from 'react';

export const ToolButton: React.FC<{ 
    title: string; 
    onClick: () => void; 
    active?: boolean; 
    icon: React.ReactNode;
    tooltipPosition?: 'right' | 'bottom'; 
}> = ({ title, onClick, active, icon, tooltipPosition = 'right' }) => (
     <div className="relative group flex items-center justify-center">
        <button 
            onClick={onClick}
            className={`w-10 h-10 rounded-md flex items-center justify-center border transition-all ${active ? 'bg-cyan-600/20 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600 hover:text-gray-200'}`}
        >
            {icon}
        </button>
        <div 
            className={`absolute ${tooltipPosition === 'right' ? 'left-full top-1/2 -translate-y-1/2 ml-2' : 'top-full left-1/2 -translate-x-1/2 mt-2'} px-3 py-1.5 bg-slate-700 text-slate-200 text-xs whitespace-nowrap rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50`}
        >
            {title}
        </div>
    </div>
);

export const ButtonWithTooltip: React.FC<{ title: string; onClick: () => void; disabled?: boolean; children: React.ReactNode; className?: string }> = ({ title, onClick, disabled, children, className }) => (
    <div className="relative group flex-1 flex">
       <button 
           onClick={onClick}
           disabled={disabled}
           className={`w-full px-2 py-1.5 text-xs font-semibold rounded transition-colors flex items-center justify-center gap-2 ${className}`}
       >
           {children}
       </button>
       <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-700 text-slate-200 text-xs whitespace-normal text-center w-40 rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 break-words">
           {title}
       </div>
   </div>
);
