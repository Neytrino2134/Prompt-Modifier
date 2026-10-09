import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Brain, Check, ChevronDown, Power } from 'lucide-react';
import { EditorTooltip } from './EditorTooltip';
import { ImageEditorState } from './types';

interface ThinkingToggleDropdownProps {
    thinkingLevel?: string;
    availableThinkingLevels?: string[];
    onUpdateState: (updates: Partial<ImageEditorState>) => void;
    disabled?: boolean;
    t: (key: string) => string;
}

interface ThinkingOption {
    value: string;
    label: string;
    badge: string;
    shortDesc: string;
    description: string;
}

export const ThinkingToggleDropdown: React.FC<ThinkingToggleDropdownProps> = ({
    thinkingLevel,
    availableThinkingLevels = ['AUTO', 'MINIMAL', 'LOW', 'MEDIUM', 'HIGH'],
    onUpdateState,
    disabled = false,
    t
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const lastActiveLevelRef = useRef<string>(thinkingLevel && thinkingLevel !== 'OFF' ? thinkingLevel : 'AUTO');

    const allOptions: ThinkingOption[] = useMemo(() => [
        {
            value: 'AUTO',
            label: t('imageEditor.thinking.auto') || 'Auto Thinking',
            badge: 'Auto',
            shortDesc: t('imageEditor.thinking.autoShort') || 'Модель сама выбирает глубину рассуждений',
            description: t('imageEditor.thinking.autoDesc') || 'Автоматический режим (Auto Thinking). Модель самостоятельно определяет необходимую глубину рассуждений и планирования для данного запроса.'
        },
        {
            value: 'MINIMAL',
            label: t('imageEditor.thinking.minimal') || 'Minimal (Fast)',
            badge: 'Min',
            shortDesc: t('imageEditor.thinking.minimalShort') || 'Быстрая генерация с минимальным анализом',
            description: t('imageEditor.thinking.minimalDesc') || 'Минимальный уровень (Minimal). Быстрая генерация с минимальным временем размышления модели перед созданием изображения.'
        },
        {
            value: 'LOW',
            label: t('imageEditor.thinking.low') || 'Low',
            badge: 'Low',
            shortDesc: t('imageEditor.thinking.lowShort') || 'Базовый анализ композиции и структуры',
            description: t('imageEditor.thinking.lowDesc') || 'Низкий уровень (Low). Базовый анализ композиции и ключевых элементов сцены с высокой скоростью генерации.'
        },
        {
            value: 'MEDIUM',
            label: t('imageEditor.thinking.medium') || 'Medium (Default)',
            badge: 'Med',
            shortDesc: t('imageEditor.thinking.mediumShort') || 'Сбалансированное рассуждение и детализация',
            description: t('imageEditor.thinking.mediumDesc') || 'Средний уровень (Medium - По умолчанию). Сбалансированный анализ композиции, стилистики и анатомии сцены.'
        },
        {
            value: 'HIGH',
            label: t('imageEditor.thinking.high') || 'High (Deep)',
            badge: 'High',
            shortDesc: t('imageEditor.thinking.highShort') || 'Глубокое планирование сложных сцен',
            description: t('imageEditor.thinking.highDesc') || 'Глубокий уровень (High). Максимально детальное пошаговое планирование композиции, света, текстур и сложных инструкций.'
        }
    ], [t]);

    const options = useMemo(() => {
        return allOptions.filter(o => availableThinkingLevels.includes(o.value));
    }, [allOptions, availableThinkingLevels]);

    const isThinkActive = useMemo(() => {
        return !!thinkingLevel && thinkingLevel !== 'OFF' && thinkingLevel !== 'none';
    }, [thinkingLevel]);

    // If active thinkingLevel is not supported by current model, reset to 'AUTO'
    useEffect(() => {
        if (isThinkActive && thinkingLevel && availableThinkingLevels.length > 0 && !availableThinkingLevels.includes(thinkingLevel)) {
            onUpdateState({ thinkingLevel: availableThinkingLevels[0] || 'AUTO' });
        }
    }, [isThinkActive, thinkingLevel, availableThinkingLevels, onUpdateState]);

    const currentOption = useMemo(() => {
        return options.find(o => o.value === thinkingLevel) || options[0];
    }, [options, thinkingLevel]);

    // Keep track of the last active level so turning it back on restores previous selection
    useEffect(() => {
        if (isThinkActive && thinkingLevel) {
            lastActiveLevelRef.current = thinkingLevel;
        }
    }, [isThinkActive, thinkingLevel]);

    // Close menu when clicking outside
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
        if (!isThinkActive) {
            // Turn ON and immediately open dropdown menu with options
            const levelToSet = lastActiveLevelRef.current || 'AUTO';
            onUpdateState({ thinkingLevel: levelToSet });
            setIsMenuOpen(true);
        } else {
            // If already on, toggle dropdown menu
            setIsMenuOpen(prev => !prev);
        }
    };

    const handleSwitchClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (disabled) return;
        if (isThinkActive) {
            // Turn OFF
            lastActiveLevelRef.current = thinkingLevel || 'AUTO';
            onUpdateState({ thinkingLevel: 'OFF' });
            setIsMenuOpen(false);
        } else {
            // Turn ON and immediately drop down options menu
            const levelToSet = lastActiveLevelRef.current || 'AUTO';
            onUpdateState({ thinkingLevel: levelToSet });
            setIsMenuOpen(true);
        }
    };

    const handleSelectOption = (optValue: string) => {
        lastActiveLevelRef.current = optValue;
        onUpdateState({ thinkingLevel: optValue });
        setIsMenuOpen(false);
    };

    const handleTurnOff = (e: React.MouseEvent) => {
        e.stopPropagation();
        lastActiveLevelRef.current = thinkingLevel || 'AUTO';
        onUpdateState({ thinkingLevel: 'OFF' });
        setIsMenuOpen(false);
    };

    const tooltipDescription = useMemo(() => {
        if (!isThinkActive) {
            return t('imageEditor.thinking.offDesc') || 'Размышление модели отключено. Генерация выполняется без предварительного анализа и рассуждений.';
        }
        return currentOption.description;
    }, [isThinkActive, currentOption, t]);

    return (
        <div className="relative flex-shrink-0" ref={containerRef}>
            <EditorTooltip
                title={t('imageEditor.thinking.title') || "Thinking Mode"}
                status={{
                    enabled: isThinkActive,
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
                        isThinkActive 
                            ? 'bg-indigo-950/60 border-indigo-500/60 shadow-[0_0_10px_rgba(99,102,241,0.25)] text-indigo-200' 
                            : 'bg-gray-800 border-gray-700 hover:border-gray-600 hover:bg-gray-750 text-gray-400 hover:text-gray-200'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-label={`Thinking Mode: ${isThinkActive ? currentOption.label : 'OFF'}`}
                >
                    <Brain className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${isThinkActive ? 'text-indigo-400' : 'text-gray-400'}`} />
                    
                    {/* Toggle Pill matching neighbor crop / auto download */}
                    <div 
                        onClick={handleSwitchClick}
                        className={`w-8 h-4 rounded-full relative transition-colors flex-shrink-0 cursor-pointer ${
                            isThinkActive ? 'bg-indigo-500' : 'bg-gray-600'
                        }`}
                        title={isThinkActive ? (t('imageEditor.thinking.clickToTurnOff') || "Нажмите на переключатель, чтобы выключить") : (t('imageEditor.thinking.clickToTurnOn') || "Нажмите, чтобы включить")}
                    >
                        <div className={`absolute top-0.5 bottom-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                            isThinkActive ? 'translate-x-[16px]' : 'translate-x-[2px]'
                        }`} />
                    </div>

                    {isThinkActive && (
                        <div className="flex items-center gap-0.5 ml-0.5">
                            <span className="text-[10px] font-mono font-bold text-indigo-300 uppercase">
                                {currentOption.badge}
                            </span>
                            <ChevronDown className={`w-3 h-3 text-indigo-300 transition-transform duration-150 ${isMenuOpen ? 'rotate-180 text-white' : ''}`} />
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
                            <Brain className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{t('imageEditor.thinking.title') || "Thinking Mode"}</span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-700/50 font-mono uppercase font-bold">
                            {currentOption.badge}
                        </span>
                    </div>

                    <div className="flex flex-col gap-0.5 py-0.5 max-h-64 overflow-y-auto custom-scrollbar">
                        {options.map((opt) => {
                            const isSelected = (thinkingLevel || 'AUTO') === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handleSelectOption(opt.value)}
                                    className={`w-full text-left px-2.5 py-2 rounded-md flex items-start gap-2.5 transition-colors cursor-pointer ${
                                        isSelected 
                                            ? 'bg-indigo-950/70 text-indigo-100 border border-indigo-500/50 shadow-sm' 
                                            : 'hover:bg-gray-800/90 text-gray-300 hover:text-white border border-transparent'
                                    }`}
                                >
                                    <div className="mt-0.5 flex-shrink-0">
                                        {isSelected ? (
                                            <div className="w-3.5 h-3.5 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                            </div>
                                        ) : (
                                            <div className="w-3.5 h-3.5 rounded-full border border-gray-600" />
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="font-semibold text-xs leading-none">
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
                                <span>{t('imageEditor.thinking.turnOff') || "Отключить Thinking"}</span>
                            </span>
                            <span className="text-[10px] font-mono text-gray-500">OFF</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
