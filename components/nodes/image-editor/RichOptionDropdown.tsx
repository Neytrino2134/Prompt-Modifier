import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { EditorTooltip } from './EditorTooltip';

export interface RichDropdownOption {
    value: string;
    label: string;
    badge?: string;
    badgeColor?: string;
    description?: string;
    icon?: React.ReactNode;
}

export interface RichOptionDropdownProps {
    value: string;
    title: string;
    icon?: React.ReactNode;
    options: RichDropdownOption[];
    onChange: (value: string) => void;
    disabled?: boolean;
    minWidth?: string;
    tooltipTitle?: string;
    tooltipDescription?: string;
}

export const RichOptionDropdown: React.FC<RichOptionDropdownProps> = ({
    value,
    title,
    icon,
    options,
    onChange,
    disabled = false,
    minWidth = '110px',
    tooltipTitle,
    tooltipDescription
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const activeOption = useMemo(() => {
        return options.find(o => o.value === value) || options[0] || { value, label: value };
    }, [options, value]);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
    };

    return (
        <div className="relative flex-shrink-0" ref={containerRef}>
            <EditorTooltip
                title={tooltipTitle || title}
                status={{
                    enabled: true,
                    labelOn: activeOption.badge || activeOption.label
                }}
                description={isOpen ? undefined : (activeOption.description || tooltipDescription)}
            >
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && setIsOpen(prev => !prev)}
                    style={{ minWidth }}
                    className={`h-[38px] px-2.5 flex-shrink-0 flex items-center justify-between gap-1.5 rounded-md cursor-pointer transition-all border outline-none select-none ${
                        isOpen 
                            ? 'bg-gray-800 border-indigo-500/70 shadow-[0_0_12px_rgba(99,102,241,0.25)] text-white' 
                            : 'bg-gray-800/90 border-gray-600 hover:border-gray-500 hover:bg-gray-750 text-gray-200'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-label={`${title}: ${activeOption.label}`}
                >
                    <div className="flex items-center gap-1.5 min-w-0">
                        {icon && <span className="text-gray-400 flex-shrink-0">{icon}</span>}
                        <div className="flex flex-col text-left truncate leading-tight">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold truncate leading-none">
                                {title}
                            </span>
                            <span className="text-xs font-semibold text-white font-mono truncate mt-0.5">
                                {activeOption.label}
                            </span>
                        </div>
                    </div>

                    <ChevronDown className={`w-3 h-3 text-gray-400 flex-shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180 text-white' : ''}`} />
                </button>
            </EditorTooltip>

            {/* Dropdown Menu */}
            {isOpen && (
                <div 
                    className="absolute bottom-full mb-2 left-0 z-50 w-[260px] bg-gray-900/95 backdrop-blur-md border border-gray-700/80 rounded-xl shadow-2xl p-2 flex flex-col gap-1.5 text-xs select-none animate-in fade-in zoom-in-95 duration-100 max-h-[400px] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-2 py-1 border-b border-gray-800 text-[11px] font-semibold text-gray-300">
                        <span className="flex items-center gap-1.5 text-gray-200">
                            {icon}
                            <span>{title}</span>
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${activeOption.badgeColor || 'bg-gray-800 text-gray-300 border-gray-700'}`}>
                            {activeOption.badge || activeOption.value}
                        </span>
                    </div>

                    {/* Scrollable list */}
                    <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar pr-1 max-h-[330px]">
                        {options.map((opt) => {
                            const isSelected = opt.value === value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handleSelect(opt.value)}
                                    className={`w-full text-left p-2 rounded-lg flex items-start gap-2.5 transition-all cursor-pointer border ${
                                        isSelected 
                                            ? 'bg-indigo-950/70 border-indigo-500/60 text-white shadow-sm' 
                                            : 'bg-gray-800/50 hover:bg-gray-800 border-gray-700/60 hover:border-gray-600 text-gray-300 hover:text-white'
                                    }`}
                                >
                                    {opt.icon && (
                                        <div className="mt-0.5 flex-shrink-0 text-gray-400">
                                            {opt.icon}
                                        </div>
                                    )}
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="font-semibold text-xs text-white leading-tight">
                                                {opt.label}
                                            </span>
                                            {opt.badge && (
                                                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${opt.badgeColor || 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                                                    {opt.badge}
                                                </span>
                                            )}
                                        </div>
                                        {opt.description && (
                                            <p className="text-[10px] text-gray-400 leading-tight mt-1">
                                                {opt.description}
                                            </p>
                                        )}
                                    </div>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
