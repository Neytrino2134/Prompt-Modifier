import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Check, ChevronDown, Ratio, Maximize2 } from 'lucide-react';
import { EditorTooltip } from './EditorTooltip';
import { ImageEditorState } from './types';

interface AspectRatioDropdownProps {
    aspectRatio?: string;
    availableAspectRatios: string[];
    onUpdateState: (updates: Partial<ImageEditorState>) => void;
    disabled?: boolean;
    t: (key: string) => string;
}

interface AspectRatioInfo {
    value: string;
    label: string;
    subtitle: string;
    category: 'square' | 'landscape' | 'portrait';
    description: string;
    renderIcon: (className?: string) => React.ReactNode;
}

const renderRatioIcon = (ratio: string, className = "w-4 h-4") => {
    switch (ratio) {
        case '1:1':
            return (
                <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" fillOpacity="0.2" />
                </svg>
            );
        case '16:9':
            return (
                <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="10" rx="2" fill="currentColor" fillOpacity="0.2" />
                </svg>
            );
        case '9:16':
            return (
                <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="7" y="2" width="10" height="20" rx="2" fill="currentColor" fillOpacity="0.2" />
                </svg>
            );
        case '4:3':
            return (
                <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="6" width="18" height="12" rx="2" fill="currentColor" fillOpacity="0.2" />
                </svg>
            );
        case '3:4':
            return (
                <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="6" y="3" width="12" height="18" rx="2" fill="currentColor" fillOpacity="0.2" />
                </svg>
            );
        case '3:2':
            return (
                <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2.5" y="6.5" width="19" height="11" rx="2" fill="currentColor" fillOpacity="0.2" />
                </svg>
            );
        case '2:3':
            return (
                <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="6.5" y="2.5" width="11" height="19" rx="2" fill="currentColor" fillOpacity="0.2" />
                </svg>
            );
        case '4:5':
            return (
                <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="5" y="3.5" width="14" height="17" rx="2" fill="currentColor" fillOpacity="0.2" />
                </svg>
            );
        case '5:4':
            return (
                <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3.5" y="5" width="17" height="14" rx="2" fill="currentColor" fillOpacity="0.2" />
                </svg>
            );
        case '21:9':
            return (
                <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="8" width="22" height="8" rx="1.5" fill="currentColor" fillOpacity="0.2" />
                </svg>
            );
        case '4:1':
            return (
                <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="9.5" width="22" height="5" rx="1" fill="currentColor" fillOpacity="0.2" />
                </svg>
            );
        case '8:1':
            return (
                <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="10.5" width="22" height="3" rx="0.75" fill="currentColor" fillOpacity="0.2" />
                </svg>
            );
        case '1:4':
            return (
                <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9.5" y="1" width="5" height="22" rx="1" fill="currentColor" fillOpacity="0.2" />
                </svg>
            );
        case '1:8':
            return (
                <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="10.5" y="1" width="3" height="22" rx="0.75" fill="currentColor" fillOpacity="0.2" />
                </svg>
            );
        default:
            return (
                <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" fillOpacity="0.2" />
                </svg>
            );
    }
};

const ALL_RATIOS_META: Record<string, { subtitle: string; category: 'square' | 'landscape' | 'portrait'; description: string }> = {
    '1:1': {
        subtitle: 'Квадрат (Square)',
        category: 'square',
        description: 'Стандартный квадрат: оптимально для Instagram, аватаров, иконок и квадратных композиций.'
    },
    '16:9': {
        subtitle: 'Широкий экран (Widescreen)',
        category: 'landscape',
        description: 'Классический широкоэкранный формат: YouTube видео, Full HD / 4K мониторы, заставки.'
    },
    '9:16': {
        subtitle: 'Stories / Reels / Shorts',
        category: 'portrait',
        description: 'Полноэкранный вертикальный формат для смартфонов, Reels, TikTok и мобильных обоев.'
    },
    '4:3': {
        subtitle: 'Классический экран (Standard TV)',
        category: 'landscape',
        description: 'Традиционный формат фотографии и классических дисплеев.'
    },
    '3:4': {
        subtitle: 'Портретный стандарт (Standard Portrait)',
        category: 'portrait',
        description: 'Классический вертикальный формат для портретов и постеров.'
    },
    '3:2': {
        subtitle: 'Фотокадр (35mm Film)',
        category: 'landscape',
        description: 'Стандартный горизонтальный формат фотокамер 35 мм.'
    },
    '2:3': {
        subtitle: 'Вертикальное фото (Portrait 35mm)',
        category: 'portrait',
        description: 'Классическая вертикальная студийная и модельная фотография.'
    },
    '4:5': {
        subtitle: 'Instagram Пост (Vertical Feed)',
        category: 'portrait',
        description: 'Максимальный размер для вертикальных постов в ленте Instagram.'
    },
    '5:4': {
        subtitle: 'Формат фотопечати (Large Format)',
        category: 'landscape',
        description: 'Пропорция для художественной печати и постеров 8x10.'
    },
    '21:9': {
        subtitle: 'Кинематографичный (Cinematic Ultrawide)',
        category: 'landscape',
        description: 'Ультраширокий киноформат: панорамы, ультраширокие мониторы и кинематографичные сцены.'
    },
    '4:1': {
        subtitle: 'Горизонтальный баннер (Banner)',
        category: 'landscape',
        description: 'Длинный горизонтальный баннер для шапок сайтов и профилей.'
    },
    '8:1': {
        subtitle: 'Ультра-панорама (Ultra Panorama)',
        category: 'landscape',
        description: 'Узкая сверхширокая панорамная полоса для веб-страниц.'
    },
    '1:4': {
        subtitle: 'Вертикальный небоскрёб (Skyscraper)',
        category: 'portrait',
        description: 'Вертикальный рекламный баннер и длинная инфографика.'
    },
    '1:8': {
        subtitle: 'Ультра-небоскрёб (Ultra Skyscraper)',
        category: 'portrait',
        description: 'Сверхдлинная вертикальная лента и полоса.'
    }
};

export const AspectRatioDropdown: React.FC<AspectRatioDropdownProps> = ({
    aspectRatio = '1:1',
    availableAspectRatios,
    onUpdateState,
    disabled = false,
    t
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const activeRatio = (aspectRatio && availableAspectRatios.includes(aspectRatio)) ? aspectRatio : (availableAspectRatios[0] || '1:1');

    // Sync state if current aspectRatio is not supported by the selected model
    useEffect(() => {
        if (aspectRatio && availableAspectRatios.length > 0 && !availableAspectRatios.includes(aspectRatio)) {
            onUpdateState({ aspectRatio: availableAspectRatios[0] || '1:1' });
        }
    }, [aspectRatio, availableAspectRatios, onUpdateState]);

    const items: AspectRatioInfo[] = useMemo(() => {
        return availableAspectRatios.map((ratio) => {
            const meta = ALL_RATIOS_META[ratio] || {
                subtitle: ratio,
                category: ratio === '1:1' ? 'square' : 'landscape',
                description: `Соотношение сторон ${ratio}`
            };
            return {
                value: ratio,
                label: ratio,
                subtitle: meta.subtitle,
                category: meta.category,
                description: meta.description,
                renderIcon: (cls) => renderRatioIcon(ratio, cls)
            };
        });
    }, [availableAspectRatios]);

    const squareGroup = useMemo(() => items.filter(i => i.category === 'square'), [items]);
    const landscapeGroup = useMemo(() => items.filter(i => i.category === 'landscape'), [items]);
    const portraitGroup = useMemo(() => items.filter(i => i.category === 'portrait'), [items]);

    const activeInfo = useMemo(() => {
        return items.find(i => i.value === activeRatio) || items[0];
    }, [items, activeRatio]);

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

    const handleSelectRatio = (ratioVal: string) => {
        onUpdateState({ aspectRatio: ratioVal });
        setIsOpen(false);
    };

    return (
        <div className="relative flex-shrink-0" ref={containerRef}>
            <EditorTooltip
                title={`Соотношение сторон (${activeRatio})`}
                status={{
                    enabled: true,
                    labelOn: activeInfo?.subtitle.split(' ')[0] || activeRatio
                }}
                description={isOpen ? undefined : activeInfo?.description}
            >
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && setIsOpen(prev => !prev)}
                    className={`h-[38px] px-2.5 min-w-[84px] flex-shrink-0 flex items-center justify-between gap-1.5 rounded-md cursor-pointer transition-all border outline-none select-none ${
                        isOpen 
                            ? 'bg-gray-800 border-indigo-500/70 shadow-[0_0_12px_rgba(99,102,241,0.25)] text-white' 
                            : 'bg-gray-800/90 border-gray-600 hover:border-gray-500 hover:bg-gray-750 text-gray-200'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-label={`Aspect Ratio: ${activeRatio}`}
                >
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-cyan-400 flex-shrink-0">
                            {renderRatioIcon(activeRatio, "w-4 h-4")}
                        </span>
                        <span className="text-xs font-semibold font-mono text-white">
                            {activeRatio}
                        </span>
                    </div>

                    <ChevronDown className={`w-3 h-3 text-gray-400 flex-shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180 text-white' : ''}`} />
                </button>
            </EditorTooltip>

            {/* Dropdown Menu with Icons and Categorized Groups */}
            {isOpen && (
                <div 
                    className="absolute bottom-full mb-2 left-0 z-50 w-[300px] bg-gray-900/95 backdrop-blur-md border border-gray-700/80 rounded-xl shadow-2xl p-2 flex flex-col gap-2 text-xs select-none animate-in fade-in zoom-in-95 duration-100 max-h-[460px] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-2 py-1 border-b border-gray-800 text-[11px] font-semibold text-gray-300">
                        <span className="flex items-center gap-1.5 text-gray-200">
                            <Ratio className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Соотношение сторон</span>
                        </span>
                        <span className="text-[10px] text-cyan-300 font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-800/40">
                            {activeRatio}
                        </span>
                    </div>

                    {/* Scrollable list */}
                    <div className="flex flex-col gap-2.5 overflow-y-auto custom-scrollbar pr-1 max-h-[390px]">
                        {/* 1. Square Group */}
                        {squareGroup.length > 0 && (
                            <div className="flex flex-col gap-1">
                                <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                    Квадратные (Square)
                                </div>
                                {squareGroup.map((item) => {
                                    const isSelected = item.value === activeRatio;
                                    return (
                                        <button
                                            key={item.value}
                                            type="button"
                                            onClick={() => handleSelectRatio(item.value)}
                                            className={`w-full text-left p-2 rounded-lg flex items-center justify-between gap-2.5 transition-all cursor-pointer border ${
                                                isSelected 
                                                    ? 'bg-indigo-950/70 border-indigo-500/60 text-white shadow-sm' 
                                                    : 'bg-gray-800/50 hover:bg-gray-800 border-gray-700/60 hover:border-gray-600 text-gray-300 hover:text-white'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className={`p-1 rounded ${isSelected ? 'text-indigo-400 bg-indigo-950/80' : 'text-gray-400 bg-gray-800'}`}>
                                                    {item.renderIcon("w-4 h-4")}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold text-xs font-mono text-white">
                                                        {item.label}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 leading-tight truncate">
                                                        {item.subtitle}
                                                    </span>
                                                </div>
                                            </div>
                                            {isSelected && <Check className="w-4 h-4 text-indigo-400 flex-shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* 2. Landscape Group */}
                        {landscapeGroup.length > 0 && (
                            <div className="flex flex-col gap-1 pt-1 border-t border-gray-800/80">
                                <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                                    Горизонтальные (Landscape)
                                </div>
                                {landscapeGroup.map((item) => {
                                    const isSelected = item.value === activeRatio;
                                    return (
                                        <button
                                            key={item.value}
                                            type="button"
                                            onClick={() => handleSelectRatio(item.value)}
                                            className={`w-full text-left p-2 rounded-lg flex items-center justify-between gap-2.5 transition-all cursor-pointer border ${
                                                isSelected 
                                                    ? 'bg-cyan-950/70 border-cyan-500/60 text-white shadow-sm' 
                                                    : 'bg-gray-800/50 hover:bg-gray-800 border-gray-700/60 hover:border-gray-600 text-gray-300 hover:text-white'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className={`p-1 rounded ${isSelected ? 'text-cyan-400 bg-cyan-950/80' : 'text-gray-400 bg-gray-800'}`}>
                                                    {item.renderIcon("w-4 h-4")}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold text-xs font-mono text-white">
                                                        {item.label}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 leading-tight truncate">
                                                        {item.subtitle}
                                                    </span>
                                                </div>
                                            </div>
                                            {isSelected && <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* 3. Portrait Group */}
                        {portraitGroup.length > 0 && (
                            <div className="flex flex-col gap-1 pt-1 border-t border-gray-800/80">
                                <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-purple-400">
                                    Вертикальные (Portrait / Stories)
                                </div>
                                {portraitGroup.map((item) => {
                                    const isSelected = item.value === activeRatio;
                                    return (
                                        <button
                                            key={item.value}
                                            type="button"
                                            onClick={() => handleSelectRatio(item.value)}
                                            className={`w-full text-left p-2 rounded-lg flex items-center justify-between gap-2.5 transition-all cursor-pointer border ${
                                                isSelected 
                                                    ? 'bg-purple-950/70 border-purple-500/60 text-white shadow-sm' 
                                                    : 'bg-gray-800/50 hover:bg-gray-800 border-gray-700/60 hover:border-gray-600 text-gray-300 hover:text-white'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className={`p-1 rounded ${isSelected ? 'text-purple-400 bg-purple-950/80' : 'text-gray-400 bg-gray-800'}`}>
                                                    {item.renderIcon("w-4 h-4")}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold text-xs font-mono text-white">
                                                        {item.label}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 leading-tight truncate">
                                                        {item.subtitle}
                                                    </span>
                                                </div>
                                            </div>
                                            {isSelected && <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />}
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
