import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Banana, Sparkles, Zap, Image as ImageIcon, Check, ChevronDown, Cpu, ShieldCheck } from 'lucide-react';
import { EditorTooltip } from './EditorTooltip';
import { ImageEditorState } from './types';
import { ImageModelOption, isNanoBanana21Model } from '../../../services/modelConfig';

interface ModelSelectorDropdownProps {
    model: string;
    effectiveModel: string;
    modelOptions: ImageModelOption[];
    onUpdateState: (updates: Partial<ImageEditorState>) => void;
    disabled?: boolean;
    t: (key: string) => string;
}

interface EnrichedModelInfo {
    value: string;
    title: string;
    subtitle: string;
    badge: string;
    badgeColor: string;
    provider: 'google' | 'openai';
    description: string;
    highlightTag?: string;
}

const getModelIcon = (modelValue: string, className = "w-4 h-4") => {
    if (isNanoBanana21Model(modelValue)) {
        return (
            <div className="flex -space-x-1 items-center">
                <Banana className={`${className} text-amber-400`} />
                <Sparkles className="w-3 h-3 text-amber-300 relative -top-1" />
            </div>
        );
    }
    if (modelValue === 'gemini-3-pro-image-preview') {
        return (
            <div className="flex -space-x-1 items-center">
                <Banana className={`${className} text-yellow-400`} />
                <Sparkles className="w-3 h-3 text-yellow-300 relative -top-1" />
            </div>
        );
    }
    if (modelValue === 'gemini-3.1-flash-image') {
        return (
            <div className="flex -space-x-1 items-center">
                <Banana className={`${className} text-yellow-400`} />
                <Zap className="w-3 h-3 text-blue-400 relative -top-1" />
            </div>
        );
    }
    if (modelValue === 'gemini-3.1-flash-image-preview') {
        return (
            <div className="flex -space-x-1 items-center">
                <Banana className={`${className} text-gray-400`} />
                <Zap className="w-3 h-3 text-blue-300 relative -top-1" />
            </div>
        );
    }
    if (modelValue === 'gemini-2.5-flash-image') {
        return <Banana className={`${className} text-yellow-500`} />;
    }
    if (modelValue.startsWith('gpt-image')) {
        return <Cpu className={`${className} text-emerald-400`} />;
    }
    return <ImageIcon className={`${className} text-gray-400`} />;
};

const getModelShortDisplay = (modelValue: string, fallbackLabel: string) => {
    if (isNanoBanana21Model(modelValue)) return 'Nana Banana 2.1 (3.6)';
    if (modelValue === 'gemini-3-pro-image-preview') return 'Nano Banana Pro 3.0';
    if (modelValue === 'gemini-3.1-flash-image') return 'Nano Banana 2 (3.1)';
    if (modelValue === 'gemini-3.1-flash-image-preview') return 'Nano Banana 2 Lite';
    if (modelValue === 'gemini-2.5-flash-image') return 'Nano Banana (2.5)';
    if (modelValue === 'gpt-image-2.5-sunburst') return 'GPT-Image Sunburst';
    if (modelValue === 'gpt-image-2.5-flare') return 'GPT-Image Flare';
    if (modelValue === 'gpt-image-2') return 'GPT-Image-2';
    return fallbackLabel.replace(/\s*\(.*?\)\s*/g, '');
};

const enrichModel = (opt: ImageModelOption): EnrichedModelInfo => {
    const val = opt.value;
    const isGoogle = opt.provider === 'google' || val.startsWith('gemini') || isNanoBanana21Model(val);

    if (isNanoBanana21Model(val)) {
        return {
            value: val,
            title: 'Nana Banana 2.1 (3.6 Flash)',
            subtitle: 'gemini-nano-banana-2.1',
            badge: '4K • Thinking • Search',
            badgeColor: 'bg-amber-950/80 text-amber-300 border-amber-600/50',
            provider: 'google',
            description: 'Флагманское мультимодальное редактирование с режимом размышлений (Thinking), генерацией в 4K и живым поиском Google Grounding.',
            highlightTag: 'Next-Gen Flagship'
        };
    }
    if (val === 'gemini-3-pro-image-preview') {
        return {
            value: val,
            title: 'Nano Banana Pro 3.0',
            subtitle: 'gemini-3-pro-image-preview',
            badge: 'Pro • Multi-Input Inpaint',
            badgeColor: 'bg-yellow-950/80 text-yellow-300 border-yellow-600/50',
            provider: 'google',
            description: 'Продвинутая модель для сложного инпейнтинга, точечной модификации объектов и композиции нескольких входных кадров.',
            highlightTag: 'Pro Edition'
        };
    }
    if (val === 'gemini-3.1-flash-image') {
        return {
            value: val,
            title: 'Nano Banana 2 (3.1 Flash)',
            subtitle: 'gemini-3.1-flash-image',
            badge: 'Fast • Style Transfer',
            badgeColor: 'bg-blue-950/80 text-blue-300 border-blue-600/50',
            provider: 'google',
            description: 'Высокоскоростная трансформация изображений, стилизация и быстрая обработка пакетных очередей.'
        };
    }
    if (val === 'gemini-3.1-flash-image-preview') {
        return {
            value: val,
            title: 'Nano Banana 2 Lite',
            subtitle: 'gemini-3.1-flash-image-preview',
            badge: 'Lite • Preview',
            badgeColor: 'bg-gray-800 text-gray-300 border-gray-600/50',
            provider: 'google',
            description: 'Облегчённая превью-модель для моментальной проверки идей и быстрых черновых генераций.'
        };
    }
    if (val === 'gemini-2.5-flash-image') {
        return {
            value: val,
            title: 'Nano Banana (2.5 Flash)',
            subtitle: 'gemini-2.5-flash-image',
            badge: 'Standard 2.5',
            badgeColor: 'bg-gray-800 text-gray-300 border-gray-600/50',
            provider: 'google',
            description: 'Базовая мультимодальная модель для стандартного редактирования и манипуляций со снимками.'
        };
    }
    if (val === 'gpt-image-2.5-sunburst') {
        return {
            value: val,
            title: 'GPT-Image-2.5 Sunburst',
            subtitle: 'gpt-image-2.5-sunburst',
            badge: 'High Precision • Edits',
            badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50',
            provider: 'openai',
            description: 'Максимальная точность проработки тонких деталей, инпейнтинг и фотореалистичная интеграция объектов.',
            highlightTag: 'Precision'
        };
    }
    if (val === 'gpt-image-2.5-flare') {
        return {
            value: val,
            title: 'GPT-Image-2.5 Flare',
            subtitle: 'gpt-image-2.5-flare',
            badge: 'Fast • Primary',
            badgeColor: 'bg-cyan-950/80 text-cyan-300 border-cyan-600/50',
            provider: 'openai',
            description: 'Быстрая флагманская модель нового поколения OpenAI для интерактивного редактирования.'
        };
    }
    if (val === 'gpt-image-2') {
        return {
            value: val,
            title: 'GPT-Image-2',
            subtitle: 'gpt-image-2',
            badge: 'Custom Quality & Size',
            badgeColor: 'bg-teal-950/80 text-teal-300 border-teal-600/50',
            provider: 'openai',
            description: 'Модель OpenAI с поддержкой тонкой настройки качества (Standard / HD) и кастомных форматов вывода.'
        };
    }

    return {
        value: val,
        title: opt.label,
        subtitle: val,
        badge: isGoogle ? 'Google' : 'OpenAI',
        badgeColor: 'bg-gray-800 text-gray-300 border-gray-600',
        provider: isGoogle ? 'google' : 'openai',
        description: opt.description || 'Модель искусственного интеллекта для генерации и редактирования изображений.'
    };
};

export const ModelSelectorDropdown: React.FC<ModelSelectorDropdownProps> = ({
    model,
    effectiveModel,
    modelOptions,
    onUpdateState,
    disabled = false,
    t
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const enrichedList = useMemo(() => {
        return modelOptions.map(enrichModel);
    }, [modelOptions]);

    const googleGroup = useMemo(() => {
        return enrichedList.filter(m => m.provider === 'google');
    }, [enrichedList]);

    const openAiGroup = useMemo(() => {
        return enrichedList.filter(m => m.provider === 'openai');
    }, [enrichedList]);

    const activeModelInfo = useMemo(() => {
        return enrichedList.find(m => m.value === effectiveModel) || enrichedList[0];
    }, [enrichedList, effectiveModel]);

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

    const handleSelectModel = (value: string) => {
        onUpdateState({ model: value });
        setIsOpen(false);
    };

    return (
        <div className="relative flex-shrink-0" ref={containerRef}>
            <EditorTooltip
                title={activeModelInfo ? activeModelInfo.title : "AI Model"}
                status={{
                    enabled: true,
                    labelOn: activeModelInfo?.provider === 'google' ? 'Gemini' : 'OpenAI'
                }}
                description={isOpen ? undefined : activeModelInfo?.description}
            >
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && setIsOpen(prev => !prev)}
                    className={`h-[38px] px-3 min-w-[200px] max-w-[230px] flex-shrink-0 flex items-center justify-between gap-2 rounded-md cursor-pointer transition-all border outline-none select-none ${
                        isOpen 
                            ? 'bg-gray-800 border-indigo-500/70 shadow-[0_0_12px_rgba(99,102,241,0.25)] text-white' 
                            : 'bg-gray-800/90 border-gray-600 hover:border-gray-500 hover:bg-gray-750 text-gray-200'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-label={`Model: ${activeModelInfo ? activeModelInfo.title : effectiveModel}`}
                >
                    <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                        {getModelIcon(effectiveModel, "w-4 h-4 flex-shrink-0")}
                        <div className="flex flex-col text-left truncate">
                            <span className="text-xs font-semibold truncate text-white leading-tight">
                                {activeModelInfo ? getModelShortDisplay(effectiveModel, activeModelInfo.title) : effectiveModel}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono leading-none truncate">
                                {activeModelInfo?.provider === 'google' ? 'Google Gemini' : 'OpenAI'}
                            </span>
                        </div>
                    </div>

                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180 text-white' : ''}`} />
                </button>
            </EditorTooltip>

            {/* Dropdown Menu with Subgroups & Rich Cards */}
            {isOpen && (
                <div 
                    className="absolute bottom-full mb-2 left-0 z-50 w-[360px] bg-gray-900/95 backdrop-blur-md border border-gray-700/80 rounded-xl shadow-2xl p-2 flex flex-col gap-2 text-xs select-none animate-in fade-in zoom-in-95 duration-100 max-h-[520px] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-2 py-1 border-b border-gray-800 text-[11px] font-semibold text-gray-300">
                        <span className="flex items-center gap-1.5 text-gray-200">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Выбор модели генерации</span>
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                            {enrichedList.length} моделей
                        </span>
                    </div>

                    {/* Scrollable Model Cards List */}
                    <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1 max-h-[440px]">
                        {/* Group: Google Gemini */}
                        {googleGroup.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between px-2 pt-1 text-[10.5px] font-bold uppercase tracking-wider text-amber-400/90">
                                    <div className="flex items-center gap-1.5">
                                        <Banana className="w-3 h-3 text-amber-400" />
                                        <span>Google Gemini / Nano Banana</span>
                                    </div>
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40 font-mono">
                                        {googleGroup.length}
                                    </span>
                                </div>

                                <div className="flex flex-col gap-1">
                                    {googleGroup.map((item) => {
                                        const isSelected = item.value === effectiveModel;
                                        return (
                                            <button
                                                key={item.value}
                                                type="button"
                                                onClick={() => handleSelectModel(item.value)}
                                                className={`w-full text-left p-2.5 rounded-lg flex items-start gap-2.5 transition-all cursor-pointer border ${
                                                    isSelected 
                                                        ? 'bg-gradient-to-r from-indigo-950/70 to-purple-950/50 border-indigo-500/60 shadow-[0_0_12px_rgba(99,102,241,0.2)] text-white' 
                                                        : 'bg-gray-800/50 hover:bg-gray-800 border-gray-700/60 hover:border-gray-600 text-gray-300 hover:text-white'
                                                }`}
                                            >
                                                <div className="mt-0.5 flex-shrink-0">
                                                    {getModelIcon(item.value, "w-4 h-4")}
                                                </div>

                                                <div className="flex flex-col flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-1.5">
                                                        <span className="font-semibold text-xs leading-tight text-white truncate">
                                                            {item.title}
                                                        </span>
                                                        {item.highlightTag && (
                                                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold uppercase flex-shrink-0">
                                                                {item.highlightTag}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className={`text-[9.5px] px-1.5 py-0.2 rounded border font-mono ${item.badgeColor}`}>
                                                            {item.badge}
                                                        </span>
                                                    </div>

                                                    <p className="text-[10.5px] text-gray-400 leading-snug mt-1.5">
                                                        {item.description}
                                                    </p>
                                                </div>

                                                <div className="mt-1 flex-shrink-0">
                                                    {isSelected ? (
                                                        <div className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-sm">
                                                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-4 h-4 rounded-full border border-gray-600" />
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Group: OpenAI */}
                        {openAiGroup.length > 0 && (
                            <div className="flex flex-col gap-1.5 pt-1 border-t border-gray-800/80">
                                <div className="flex items-center justify-between px-2 pt-1 text-[10.5px] font-bold uppercase tracking-wider text-emerald-400/90">
                                    <div className="flex items-center gap-1.5">
                                        <Cpu className="w-3 h-3 text-emerald-400" />
                                        <span>OpenAI Models</span>
                                    </div>
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 font-mono">
                                        {openAiGroup.length}
                                    </span>
                                </div>

                                <div className="flex flex-col gap-1">
                                    {openAiGroup.map((item) => {
                                        const isSelected = item.value === effectiveModel;
                                        return (
                                            <button
                                                key={item.value}
                                                type="button"
                                                onClick={() => handleSelectModel(item.value)}
                                                className={`w-full text-left p-2.5 rounded-lg flex items-start gap-2.5 transition-all cursor-pointer border ${
                                                    isSelected 
                                                        ? 'bg-gradient-to-r from-emerald-950/70 to-teal-950/50 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.2)] text-white' 
                                                        : 'bg-gray-800/50 hover:bg-gray-800 border-gray-700/60 hover:border-gray-600 text-gray-300 hover:text-white'
                                                }`}
                                            >
                                                <div className="mt-0.5 flex-shrink-0">
                                                    {getModelIcon(item.value, "w-4 h-4")}
                                                </div>

                                                <div className="flex flex-col flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-1.5">
                                                        <span className="font-semibold text-xs leading-tight text-white truncate">
                                                            {item.title}
                                                        </span>
                                                        {item.highlightTag && (
                                                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold uppercase flex-shrink-0">
                                                                {item.highlightTag}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className={`text-[9.5px] px-1.5 py-0.2 rounded border font-mono ${item.badgeColor}`}>
                                                            {item.badge}
                                                        </span>
                                                    </div>

                                                    <p className="text-[10.5px] text-gray-400 leading-snug mt-1.5">
                                                        {item.description}
                                                    </p>
                                                </div>

                                                <div className="mt-1 flex-shrink-0">
                                                    {isSelected ? (
                                                        <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                                                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-4 h-4 rounded-full border border-gray-600" />
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
