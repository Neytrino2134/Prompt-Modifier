import React from 'react';
import { Tooltip } from '../../Tooltip';

export interface EditorTooltipProps {
    title: string;
    description?: string;
    status?: {
        enabled: boolean;
        labelOn?: string;
        labelOff?: string;
    };
    shortcut?: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    align?: 'start' | 'center' | 'end';
    children: React.ReactNode;
    className?: string;
}

export const EditorTooltip: React.FC<EditorTooltipProps> = ({
    title,
    description,
    status,
    shortcut,
    position = 'top',
    align = 'center',
    children,
    className
}) => {
    const content = (
        <div className="flex flex-col gap-1.5 text-left min-w-[160px] max-w-[260px] whitespace-normal pointer-events-none select-none">
            <div className="flex items-center justify-between gap-2.5 pb-1 border-b border-gray-700/60">
                <span className="font-semibold text-xs text-white tracking-wide">{title}</span>
                {status !== undefined && (
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        status.enabled
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                            : 'bg-gray-800 text-gray-400 border border-gray-700'
                    }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                        {status.enabled ? (status.labelOn || 'ON') : (status.labelOff || 'OFF')}
                    </span>
                )}
                {shortcut && (
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-800/90 text-gray-400 border border-gray-700 rounded shadow-sm">
                        {shortcut}
                    </kbd>
                )}
            </div>
            {description && (
                <p className="text-[11px] text-gray-300 leading-snug font-normal">
                    {description}
                </p>
            )}
        </div>
    );

    return (
        <Tooltip
            content={content}
            position={position}
            align={align}
            className={className}
            tooltipClassName="p-2.5 bg-gray-900/95 text-gray-200 text-xs border border-gray-700 shadow-2xl backdrop-blur-md rounded-lg"
        >
            {children}
        </Tooltip>
    );
};
