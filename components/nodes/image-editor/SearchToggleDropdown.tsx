import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Check, ChevronDown, Power, Globe, Image as ImageIcon } from 'lucide-react';
import { EditorTooltip } from './EditorTooltip';
import { ImageEditorState } from './types';

interface SearchToggleDropdownProps {
    searchGrounding?: string;
    isNanoBanana21: boolean;
    onUpdateState: (updates: Partial<ImageEditorState>) => void;
    disabled?: boolean;
    t: (key: string) => string;
}

interface SearchOption {
    value: string;
    label: string;
    badge: string;
    shortDesc: string;
    description: string;
    icon: React.ReactNode;
}

export const SearchToggleDropdown: React.FC<SearchToggleDropdownProps> = ({
    searchGrounding,
    isNanoBanana21,
    onUpdateState,
    disabled = false,
    t
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const lastActiveOptionRef = useRef<string>(
        searchGrounding && searchGrounding !== 'none' ? searchGrounding : (isNanoBanana21 ? 'both' : 'web')
    );

    const options: SearchOption[] = useMemo(() => {
        if (isNanoBanana21) {
            return [
                {
                    value: 'both',
                    label: t('imageEditor.search.both') || 'Web + Image Search',
                    badge: 'Web+Img',
                    shortDesc: t('imageEditor.search.bothShort') || 'Комплексный поиск текста и изображений',
                    description: t('imageEditor.search.bothDesc') || 'Комплексный поиск (Web + Image Search). Поиск актуальных веб-страниц и визуальных референсов в Google для максимальной точности генерации.',
                    icon: <div className="flex -space-x-1 items-center"><Globe className="w-3.5 h-3.5 text-cyan-400" /><ImageIcon className="w-3.5 h-3.5 text-blue-400" /></div>
                },
                {
                    value: 'web',
                    label: t('imageEditor.search.web') || 'Web Search',
                    badge: 'Web',
                    shortDesc: t('imageEditor.search.webShort') || 'Поиск актуальных данных и фактов в сети',
                    description: t('imageEditor.search.webDesc') || 'Поиск в Web (Google Web Search). Модель ищет актуальную текстовую информацию, факты и референсы в интернете перед генерацией.',
                    icon: <Globe className="w-3.5 h-3.5 text-cyan-400" />
                },
                {
                    value: 'image',
                    label: t('imageEditor.search.image') || 'Image Search',
                    badge: 'Images',
                    shortDesc: t('imageEditor.search.imageShort') || 'Поиск референсных картинок в Google',
                    description: t('imageEditor.search.imageDesc') || 'Поиск изображений (Google Image Search). Модель ищет визуальные референсы и изображения в сети для точной генерации.',
                    icon: <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                }
            ];
        }

        return [
            {
                value: 'web',
                label: t('imageEditor.search.web') || 'Web Search',
                badge: 'Web',
                shortDesc: t('imageEditor.search.webShort') || 'Поиск актуальных данных и фактов в сети',
                description: t('imageEditor.search.webDesc') || 'Поиск в Web (Google Web Search). Модель ищет актуальную текстовую информацию, факты и референсы в интернете перед генерацией.',
                icon: <Globe className="w-3.5 h-3.5 text-cyan-400" />
            }
        ];
    }, [isNanoBanana21, t]);

    const isSearchActive = useMemo(() => {
        return !!searchGrounding && searchGrounding !== 'none' && searchGrounding !== 'off';
    }, [searchGrounding]);

    // Reset unsupported searchGrounding option (e.g. 'image' or 'both' on non-NanoBanana21 models) to 'web'
    useEffect(() => {
        if (isSearchActive && searchGrounding && !options.some(o => o.value === searchGrounding)) {
            onUpdateState({ searchGrounding: options[0]?.value || 'web' });
        }
    }, [isSearchActive, searchGrounding, options, onUpdateState]);

    const currentOption = useMemo(() => {
        return options.find(o => o.value === searchGrounding) || options[0];
    }, [options, searchGrounding]);

    // Keep track of the last active search option
    useEffect(() => {
        if (isSearchActive && searchGrounding) {
            lastActiveOptionRef.current = searchGrounding;
        }
    }, [isSearchActive, searchGrounding]);

    // Close menu on click outside
    useEffect(() => {
        if (!isMenuOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [isMenuOpen]);

    // Close menu on Escape
    useEffect(() => {
        if (!isMenuOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isMenuOpen]);

    const handleButtonClick = () => {
        if (disabled) return;
        if (!isSearchActive) {
            // Turn ON and immediately open dropdown menu
            const optionToSet = lastActiveOptionRef.current || (isNanoBanana21 ? 'both' : 'web');
            onUpdateState({ searchGrounding: optionToSet });
            setIsMenuOpen(true);
        } else {
            // Toggle dropdown menu
            setIsMenuOpen(prev => !prev);
        }
    };

    const handleSwitchClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (disabled) return;
        if (isSearchActive) {
            // Turn OFF
            lastActiveOptionRef.current = searchGrounding || (isNanoBanana21 ? 'both' : 'web');
            onUpdateState({ searchGrounding: 'none' });
            setIsMenuOpen(false);
        } else {
            // Turn ON and immediately drop down options menu
            const optionToSet = lastActiveOptionRef.current || (isNanoBanana21 ? 'both' : 'web');
            onUpdateState({ searchGrounding: optionToSet });
            setIsMenuOpen(true);
        }
    };

    const handleSelectOption = (optValue: string) => {
        lastActiveOptionRef.current = optValue;
        onUpdateState({ searchGrounding: optValue });
        setIsMenuOpen(false);
    };

    const handleTurnOff = (e: React.MouseEvent) => {
        e.stopPropagation();
        lastActiveOptionRef.current = searchGrounding || (isNanoBanana21 ? 'both' : 'web');
        onUpdateState({ searchGrounding: 'none' });
        setIsMenuOpen(false);
    };

    const tooltipDescription = useMemo(() => {
        if (!isSearchActive) {
            return t('imageEditor.search.offDesc') || 'Поиск отключен. Модель использует только свои внутренние знания без обращения к Google Search.';
        }
        return currentOption.description;
    }, [isSearchActive, currentOption, t]);

    return (
        <div className="relative flex-shrink-0" ref={containerRef}>
            <EditorTooltip
                title={t('imageEditor.search.title') || "Search Grounding"}
                status={{
                    enabled: isSearchActive,
                    labelOn: currentOption.badge,
                    labelOff: t('common.disabled') || 'Выключено'
                }}
                description={isMenuOpen ? undefined : tooltipDescription}
            >
                <button
                    type="button"
                    disabled={disabled}
                    onClick={handleButtonClick}
                    className={`h-[36px] px-2.5 flex-shrink-0 flex items-center gap-1.5 rounded-md cursor-pointer transition-all border outline-none select-none ${
                        isSearchActive 
                            ? 'bg-cyan-950/60 border-cyan-500/60 shadow-[0_0_10px_rgba(6,182,212,0.25)] text-cyan-200' 
                            : 'bg-gray-800 border-gray-700 hover:border-gray-600 hover:bg-gray-750 text-gray-400 hover:text-gray-200'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-label={`Search Grounding: ${isSearchActive ? currentOption.label : 'OFF'}`}
                >
                    <Search className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${isSearchActive ? 'text-cyan-400' : 'text-gray-400'}`} />
                    
                    {/* Toggle Pill matching neighbor crop / auto download */}
                    <div 
                        onClick={handleSwitchClick}
                        className={`w-8 h-4 rounded-full relative transition-colors flex-shrink-0 cursor-pointer ${
                            isSearchActive ? 'bg-cyan-500' : 'bg-gray-600'
                        }`}
                        title={isSearchActive ? (t('imageEditor.search.clickToTurnOff') || "Нажмите на переключатель, чтобы выключить") : (t('imageEditor.search.clickToTurnOn') || "Нажмите, чтобы включить")}
                    >
                        <div className={`absolute top-0.5 bottom-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                            isSearchActive ? 'translate-x-[16px]' : 'translate-x-[2px]'
                        }`} />
                    </div>

                    {isSearchActive && (
                        <div className="flex items-center gap-0.5 ml-0.5">
                            <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase">
                                {currentOption.badge}
                            </span>
                            <ChevronDown className={`w-3 h-3 text-cyan-300 transition-transform duration-150 ${isMenuOpen ? 'rotate-180 text-white' : ''}`} />
                        </div>
                    )}
                </button>
            </EditorTooltip>

            {/* Dropdown Menu popping out when switched ON or clicked */}
            {isMenuOpen && (
                <div 
                    className="absolute bottom-full mb-2 right-0 z-50 w-64 bg-gray-900/95 backdrop-blur-md border border-gray-700/80 rounded-lg shadow-2xl p-1.5 flex flex-col gap-1 text-xs select-none animate-in fade-in zoom-in-95 duration-100"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-800 text-[11px] font-semibold text-gray-300">
                        <span className="flex items-center gap-1.5">
                            <Search className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{t('imageEditor.search.title') || "Google Search Grounding"}</span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/50 font-mono uppercase font-bold">
                            {currentOption.badge}
                        </span>
                    </div>

                    <div className="flex flex-col gap-0.5 py-0.5 max-h-64 overflow-y-auto custom-scrollbar">
                        {options.map((opt) => {
                            const isSelected = (searchGrounding || 'none') === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handleSelectOption(opt.value)}
                                    className={`w-full text-left px-2.5 py-2 rounded-md flex items-start gap-2.5 transition-colors cursor-pointer ${
                                        isSelected 
                                            ? 'bg-cyan-950/70 text-cyan-100 border border-cyan-500/50 shadow-sm' 
                                            : 'hover:bg-gray-800/80 text-gray-300 hover:text-white border border-transparent'
                                    }`}
                                >
                                    <div className="mt-0.5 flex-shrink-0">
                                        {isSelected ? (
                                            <div className="w-3.5 h-3.5 rounded-full bg-cyan-500 flex items-center justify-center text-white">
                                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                            </div>
                                        ) : (
                                            <div className="w-3.5 h-3.5 rounded-full border border-gray-600" />
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="font-semibold text-xs leading-none flex items-center gap-1.5">
                                                {opt.icon}
                                                {opt.label}
                                            </span>
                                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-gray-800 text-gray-400">
                                                {opt.badge}
                                            </span>
                                        </div>
                                        <span className="text-[10.5px] text-gray-400 leading-tight mt-1">
                                            {opt.shortDesc}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="border-t border-gray-800 pt-1 mt-0.5">
                        <button
                            type="button"
                            onClick={handleTurnOff}
                            className="w-full px-2.5 py-1.5 text-[11px] text-gray-400 hover:text-rose-300 hover:bg-rose-950/40 rounded flex items-center justify-between transition-colors cursor-pointer"
                        >
                            <span className="flex items-center gap-1.5">
                                <Power className="w-3 h-3 text-gray-400" />
                                <span>{t('imageEditor.search.turnOff') || "Отключить Search"}</span>
                            </span>
                            <span className="text-[10px] font-mono text-gray-500">OFF</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
