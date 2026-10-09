import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Layers, Sparkles, Zap, Check, ChevronDown, Monitor } from 'lucide-react';
import { EditorTooltip } from './EditorTooltip';
import { ImageEditorState } from './types';

interface ResolutionDropdownProps {
    resolution?: string;
    availableResolutions?: string[];
    onUpdateState: (updates: Partial<ImageEditorState>) => void;
    disabled?: boolean;
    t: (key: string) => string;
}

interface ResolutionOption {
    value: string;
    label: string;
    pixels: string;
    badge: string;
    badgeColor: string;
    category: 'standard' | 'high';
    description: string;
    icon: React.ReactNode;
}

export const ResolutionDropdown: React.FC<ResolutionDropdownProps> = ({
    resolution = '1K',
    availableResolutions = ['1K', '2K', '4K'],
    onUpdateState,
    disabled = false,
    t
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const activeRes = (resolution && availableResolutions.includes(resolution)) ? resolution : (availableResolutions[0] || '1K');

    // Sync state if current resolution is not supported by the selected model
    useEffect(() => {
        if (resolution && availableResolutions.length > 0 && !availableResolutions.includes(resolution)) {
            onUpdateState({ resolution: availableResolutions[0] || '1K' });
        }
    }, [resolution, availableResolutions, onUpdateState]);

    const allOptions: ResolutionOption[] = useMemo(() => [
        {
            value: '1K',
            label: '1K Standard',
            pixels: '1024 × 1024 px',
            badge: 'Fast',
            badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50',
            category: 'standard',
            description: 'Стандартное разрешение (1K). Высокая скорость генерации, минимальный расход квот, оптимально для интерактивных правок и веб-публикаций.',
            icon: <Layers className="w-4 h-4 text-emerald-400" />
        },
        {
            value: '2K',
            label: '2K QHD',
            pixels: '2048 × 2048 px',
            badge: 'Sharp 2K',
            badgeColor: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/50',
            category: 'high',
            description: 'Высокое разрешение (2K). Превосходная резкость, проработка мелких текстур, анатомии и деталей. Идеально для финальных артов и 2K дисплеев.',
            icon: <Sparkles className="w-4 h-4 text-cyan-400" />
        },
        {
            value: '4K',
            label: '4K Ultra HD',
            pixels: '4096 × 4096 px',
            badge: 'Ultra 4K',
            badgeColor: 'bg-amber-950/80 text-amber-300 border-amber-700/50',
            category: 'high',
            description: 'Максимальное разрешение (4K). Исключительная детализация для профессиональной полиграфии, печати крупных постеров и 4K мониторов.',
            icon: <Zap className="w-4 h-4 text-amber-400" />
        }
    ], []);

    const options = useMemo(() => {
        return allOptions.filter(o => availableResolutions.includes(o.value));
    }, [allOptions, availableResolutions]);

    const standardGroup = useMemo(() => options.filter(o => o.category === 'standard'), [options]);
    const highGroup = useMemo(() => options.filter(o => o.category === 'high'), [options]);

    const activeOption = useMemo(() => {
        return options.find(o => o.value === activeRes) || options[0];
    }, [options, activeRes]);

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
        onUpdateState({ resolution: val });
        setIsOpen(false);
    };

    return (
        <div className="relative flex-shrink-0" ref={containerRef}>
            <EditorTooltip
                title={`Разрешение генерации (${activeRes})`}
                status={{
                    enabled: true,
                    labelOn: activeOption.badge
                }}
                description={isOpen ? undefined : activeOption.description}
            >
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && setIsOpen(prev => !prev)}
                    className={`h-[38px] px-2.5 min-w-[76px] flex-shrink-0 flex items-center justify-between gap-1.5 rounded-md cursor-pointer transition-all border outline-none select-none ${
                        isOpen 
                            ? 'bg-gray-800 border-indigo-500/70 shadow-[0_0_12px_rgba(99,102,241,0.25)] text-white' 
                            : 'bg-gray-800/90 border-gray-600 hover:border-gray-500 hover:bg-gray-750 text-gray-200'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-label={`Resolution: ${activeRes}`}
                >
                    <div className="flex items-center gap-1.5 min-w-0">
                        {activeOption.icon}
                        <span className="text-xs font-semibold font-mono text-white">
                            {activeRes}
                        </span>
                    </div>

                    <ChevronDown className={`w-3 h-3 text-gray-400 flex-shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180 text-white' : ''}`} />
                </button>
            </EditorTooltip>

            {/* Dropdown Menu with Groups & Badges */}
            {isOpen && (
                <div 
                    className="absolute bottom-full mb-2 left-0 z-50 w-[280px] bg-gray-900/95 backdrop-blur-md border border-gray-700/80 rounded-xl shadow-2xl p-2 flex flex-col gap-2 text-xs select-none animate-in fade-in zoom-in-95 duration-100 max-h-[420px] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-2 py-1 border-b border-gray-800 text-[11px] font-semibold text-gray-300">
                        <span className="flex items-center gap-1.5 text-gray-200">
                            <Monitor className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Разрешение изображения</span>
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${activeOption.badgeColor}`}>
                            {activeRes}
                        </span>
                    </div>

                    {/* Scrollable list */}
                    <div className="flex flex-col gap-2.5 overflow-y-auto custom-scrollbar pr-1 max-h-[350px]">
                        {/* Standard Group */}
                        {standardGroup.length > 0 && (
                            <div className="flex flex-col gap-1">
                                <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                                    Стандартное разрешение
                                </div>
                                {standardGroup.map((item) => {
                                    const isSelected = item.value === activeRes;
                                    return (
                                        <button
                                            key={item.value}
                                            type="button"
                                            onClick={() => handleSelect(item.value)}
                                            className={`w-full text-left p-2 rounded-lg flex items-start gap-2.5 transition-all cursor-pointer border ${
                                                isSelected 
                                                    ? 'bg-emerald-950/70 border-emerald-500/60 text-white shadow-sm' 
                                                    : 'bg-gray-800/50 hover:bg-gray-800 border-gray-700/60 hover:border-gray-600 text-gray-300 hover:text-white'
                                            }`}
                                        >
                                            <div className="mt-0.5 flex-shrink-0">
                                                {item.icon}
                                            </div>
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span className="font-bold text-xs text-white">
                                                        {item.label}
                                                    </span>
                                                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${item.badgeColor}`}>
                                                        {item.badge}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-gray-400 font-mono mt-0.5">
                                                    {item.pixels}
                                                </span>
                                                <p className="text-[10px] text-gray-400 leading-tight mt-1">
                                                    {item.description}
                                                </p>
                                            </div>
                                            {isSelected && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* High/Ultra Group */}
                        {highGroup.length > 0 && (
                            <div className="flex flex-col gap-1 pt-1 border-t border-gray-800/80">
                                <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                                    Ультра-высокое разрешение
                                </div>
                                {highGroup.map((item) => {
                                    const isSelected = item.value === activeRes;
                                    return (
                                        <button
                                            key={item.value}
                                            type="button"
                                            onClick={() => handleSelect(item.value)}
                                            className={`w-full text-left p-2 rounded-lg flex items-start gap-2.5 transition-all cursor-pointer border ${
                                                isSelected 
                                                    ? 'bg-amber-950/70 border-amber-500/60 text-white shadow-sm' 
                                                    : 'bg-gray-800/50 hover:bg-gray-800 border-gray-700/60 hover:border-gray-600 text-gray-300 hover:text-white'
                                            }`}
                                        >
                                            <div className="mt-0.5 flex-shrink-0">
                                                {item.icon}
                                            </div>
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span className="font-bold text-xs text-white">
                                                        {item.label}
                                                    </span>
                                                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${item.badgeColor}`}>
                                                        {item.badge}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-gray-400 font-mono mt-0.5">
                                                    {item.pixels}
                                                </span>
                                                <p className="text-[10px] text-gray-400 leading-tight mt-1">
                                                    {item.description}
                                                </p>
                                            </div>
                                            {isSelected && <Check className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
