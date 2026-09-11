import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getTranslation, LanguageCode, TranslationKey, languages, useLanguage } from '../localization';
import { APP_VERSION } from '../version';
import { useAppContext } from '../contexts/AppContext';
import { CustomCheckbox } from './CustomCheckbox';
import { 
    isOpenAiEnabled, 
    setOpenAiEnabled, 
    getOpenAiApiKey, 
    setOpenAiApiKey 
} from '../services/modelConfig';

interface WelcomeScreenProps {
  onClose: () => void;
  isResumable?: boolean;
}

type ScreenMode = 'hero' | 'setup';

interface WelcomeContentProps {
    language: LanguageCode;
    globalLanguage: LanguageCode;
    screenMode: ScreenMode;
    setScreenMode: (mode: ScreenMode) => void;
    apiKey: string;
    setApiKey: (key: string) => void;
    openAiEnabled: boolean;
    setOpenAiEnabledState: (enabled: boolean) => void;
    openAiApiKey: string;
    setOpenAiApiKeyState: (key: string) => void;
    onSelectLanguage: (code: LanguageCode) => void;
    onStart: () => void;
    onStartNew?: () => void;
    onCycleLanguage: (direction: number) => void;
    exitPhase: 'idle' | 'button-exit' | 'window-exit' | 'done';
    isResumable: boolean;
    animationStage: number;
    triggerHeartbeat: boolean;
}

const WelcomeContent: React.FC<WelcomeContentProps> = ({
    language,
    globalLanguage,
    screenMode,
    setScreenMode,
    apiKey,
    setApiKey,
    openAiEnabled,
    setOpenAiEnabledState,
    openAiApiKey,
    setOpenAiApiKeyState,
    onSelectLanguage,
    onStart,
    onStartNew,
    onCycleLanguage,
    exitPhase,
    isResumable,
    animationStage,
    triggerHeartbeat
}) => {
    const t = useCallback((key: string, options?: { [key: string]: string | number }) => {
        return getTranslation(language, key as TranslationKey, options);
    }, [language]);

    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [showGeminiKey, setShowGeminiKey] = useState(false);
    const [showOpenAiKey, setShowOpenAiKey] = useState(false);
    const langMenuRef = useRef<HTMLDivElement>(null);

    const hasGeminiKey = Boolean(apiKey && apiKey.trim().length > 0);
    const hasEnvKey = Boolean(typeof process !== 'undefined' && process.env && process.env.API_KEY);
    const hasConfiguredKey = hasGeminiKey || hasEnvKey;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
                setIsLangMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedLangInfo = languages[language] || languages['en'];

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
            
            {/* SCREEN 1: HERO VIEW (No Card Panel, Big Bold Typography, Beautiful Button) */}
            {screenMode === 'hero' && (
                <div className={`w-full flex flex-col items-center text-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    animationStage === 0 ? 'opacity-0 scale-90 translate-y-12' : 'opacity-100 scale-100 translate-y-0'
                }`}>
                    
                    {/* Language Cycler Controls at Top */}
                    <div className={`mb-6 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900/80 border border-gray-700/80 backdrop-blur-xl shadow-lg transition-all duration-500 app-region-no-drag relative z-30 ${
                        animationStage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
                    }`}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onCycleLanguage(-1);
                            }}
                            className="p-1.5 rounded-full text-gray-400 hover:text-cyan-400 hover:bg-gray-800 active:scale-95 transition-all cursor-pointer"
                            title="Previous Language (Left Arrow)"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <span className="text-xs font-semibold text-gray-200 font-mono tracking-wider px-2 select-none">
                            {selectedLangInfo.nativeName} ({selectedLangInfo.short})
                        </span>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onCycleLanguage(1);
                            }}
                            className="p-1.5 rounded-full text-gray-400 hover:text-cyan-400 hover:bg-gray-800 active:scale-95 transition-all cursor-pointer"
                            title="Next Language (Right Arrow)"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    {/* Massive Display Title */}
                    <div className="space-y-4 mb-8">
                        <h2 className="text-base sm:text-xl md:text-2xl font-bold uppercase tracking-[0.25em] text-cyan-400/90 font-mono drop-shadow">
                            {t('welcome.title')}
                        </h2>

                        <div className={`relative inline-block ${triggerHeartbeat ? 'animate-heartbeat' : ''}`}>
                            {/* Ambient Glow behind title */}
                            <div className="absolute -inset-6 bg-gradient-to-r from-cyan-500/30 via-sky-400/30 to-blue-600/30 blur-3xl rounded-full opacity-70 pointer-events-none"></div>

                            <h1 className="relative text-5xl sm:text-7xl md:text-8xl font-black tracking-tight leading-none text-white drop-shadow-[0_10px_25px_rgba(0,168,255,0.35)]">
                                <span className="text-gradient-shimmer select-none">
                                    {t('app.title')}
                                </span>
                            </h1>
                        </div>

                        <div className="flex items-center justify-center gap-3 pt-2">
                            <span className="text-xs sm:text-sm text-gray-300 font-light tracking-wide max-w-md">
                                {t('app.subtitle')}
                            </span>
                            <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-500/50 shadow-sm">
                                {APP_VERSION.startsWith('v') ? APP_VERSION : `v${APP_VERSION}`}
                            </span>
                        </div>
                    </div>

                    {/* Status indicator pill if configured */}
                    {hasConfiguredKey && (
                        <div className="mb-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-medium shadow-lg backdrop-blur-md animate-in fade-in duration-500">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                            </span>
                            <span>{t('welcome.apiKeyConfigured')}</span>
                        </div>
                    )}

                    {/* HERO BUTTON SECTION (No bulky card, pure beautiful interactive buttons) */}
                    <div className="w-full max-w-md space-y-4 pt-2 app-region-no-drag">
                        
                        {/* CASE 1: API is NOT configured -> Primary Hero Button: "Перейти к настройкам" */}
                        {!hasConfiguredKey ? (
                            <div className="space-y-4">
                                <button
                                    type="button"
                                    onClick={() => setScreenMode('setup')}
                                    className="w-full py-4 px-8 text-lg font-black text-white btn-gradient-animated rounded-2xl shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-400/50 transform hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 group border border-cyan-300/40"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-200 group-hover:rotate-12 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="tracking-wide">{t('welcome.goToSettings')}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform group-hover:translate-x-1.5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </button>

                                <div className="flex items-center justify-center text-xs">
                                    <button
                                        type="button"
                                        onClick={onStart}
                                        className="text-gray-400 hover:text-gray-200 underline underline-offset-4 transition-colors py-1 px-3 rounded hover:bg-gray-800/40"
                                    >
                                        {t('welcome.continueWithoutKey')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* CASE 2: API is configured -> Main Button: Resume / Start New + Additional Settings Button */
                            <div className="space-y-3">
                                <div className="space-y-2.5">
                                    {/* Primary Resume / Launch Button */}
                                    <button
                                        type="button"
                                        onClick={onStart}
                                        className="w-full py-4 px-8 text-lg font-black text-white btn-gradient-animated rounded-2xl shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-400/50 transform hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 group border border-cyan-300/40"
                                    >
                                        <div className={`flex items-center gap-3 transition-all duration-300 ${exitPhase !== 'idle' ? 'translate-x-12 opacity-0' : 'translate-x-0 opacity-100'}`}>
                                            <span className="tracking-wide">{isResumable ? t('welcome.resume') : t('welcome.letsGo')}</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform group-hover:translate-x-1.5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </div>
                                    </button>

                                    {/* Start New Canvas Button (if resumable) */}
                                    {isResumable && onStartNew && (
                                        <button 
                                            type="button"
                                            onClick={onStartNew}
                                            className="w-full py-3.5 px-6 border border-gray-600 hover:border-gray-400 bg-gray-900/50 hover:bg-gray-800/80 text-gray-200 hover:text-white rounded-xl transition-all duration-200 text-sm font-bold flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                            </svg>
                                            <span>{t('welcome.startNew')}</span>
                                        </button>
                                    )}
                                </div>

                                {/* Additional Sleek Settings Button */}
                                <div className="flex items-center justify-center pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setScreenMode('setup')}
                                        className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-gray-900/60 border border-gray-700/80 hover:border-cyan-500/50 hover:bg-gray-800 text-xs font-semibold text-gray-300 hover:text-cyan-300 transition-all duration-200 group shadow-sm backdrop-blur-md"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 group-hover:text-cyan-400 group-hover:rotate-45 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span>{t('welcome.settingsBtn')}</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            )}

            {/* SCREEN 2: DEDICATED SETUP & PREFERENCES PANEL */}
            {screenMode === 'setup' && (
                <div className="w-full max-w-xl animate-in fade-in zoom-in-95 duration-300 app-region-no-drag">
                    
                    {/* Compact Brand Header */}
                    <div className="flex items-center justify-between mb-4 px-2">
                        <button
                            type="button"
                            onClick={() => setScreenMode('hero')}
                            className="inline-flex items-center gap-2 py-1.5 px-3.5 rounded-xl bg-gray-900/80 border border-gray-700 hover:border-cyan-500 hover:bg-gray-800 text-xs font-semibold text-gray-200 hover:text-white transition-all group backdrop-blur-md shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                            <span>{t('welcome.back')}</span>
                        </button>

                        <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                                {t('app.title')}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                                v{APP_VERSION}
                            </span>
                        </div>
                    </div>

                    {/* Settings Panel Glass Card */}
                    <div className="relative w-full bg-gray-800/90 backdrop-blur-2xl rounded-3xl border border-gray-700/90 shadow-2xl p-6 sm:p-8 space-y-6 text-left">
                        
                        {/* Panel Title & Note */}
                        <div className="space-y-1 pb-3 border-b border-gray-700/60">
                            <h3 className="text-lg font-bold text-white tracking-tight">
                                {t('welcome.setupAndLaunch')}
                            </h3>
                            <p className="text-xs text-gray-400">
                                {t('welcome.apiKeyStageSubtitle')}
                            </p>
                        </div>

                        {/* Language Selection */}
                        <div className="space-y-2 relative z-50">
                            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                                {t('welcome.selectLanguage' as TranslationKey) || 'Language'}
                            </label>

                            <div ref={langMenuRef} className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                                    className="w-full py-2.5 px-3.5 rounded-xl bg-gray-900/80 border border-gray-600 hover:border-cyan-500 hover:bg-gray-800 transition-all duration-200 text-left flex items-center justify-between group outline-none focus:ring-2 focus:ring-cyan-500/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xs font-bold text-gray-200 border border-gray-600 group-hover:border-cyan-400/50 transition-colors">
                                            {selectedLangInfo.short}
                                        </div>
                                        <span className="text-sm font-medium text-white">
                                            {selectedLangInfo.nativeName} <span className="text-gray-400 text-xs ml-1">({selectedLangInfo.name})</span>
                                        </span>
                                    </div>
                                    <svg 
                                        xmlns="http://www.w3.org/2000/svg" 
                                        className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${isLangMenuOpen ? 'rotate-180 text-cyan-400' : ''}`} 
                                        fill="none" 
                                        viewBox="0 0 24 24" 
                                        stroke="currentColor" 
                                        strokeWidth={2}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {isLangMenuOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-2 p-1.5 bg-gray-900/95 border border-gray-700 rounded-2xl shadow-2xl backdrop-blur-xl z-50 max-h-56 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                            {(Object.keys(languages) as LanguageCode[]).map((code) => {
                                                const lang = languages[code];
                                                const isSelected = language === code;
                                                return (
                                                    <button
                                                        key={code}
                                                        type="button"
                                                        onClick={() => {
                                                            onSelectLanguage(code);
                                                            setIsLangMenuOpen(false);
                                                        }}
                                                        className={`w-full p-2 rounded-xl flex items-center gap-2.5 transition-all duration-150 text-left ${
                                                            isSelected 
                                                                ? 'bg-gradient-to-r from-cyan-950 to-blue-950 border border-cyan-500/50 text-white shadow-sm' 
                                                                : 'hover:bg-gray-800/80 text-gray-300 hover:text-white border border-transparent'
                                                        }`}
                                                    >
                                                        <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${
                                                            isSelected ? 'bg-cyan-500 text-black' : 'bg-gray-800 text-gray-400'
                                                        }`}>
                                                            {lang.short}
                                                        </div>
                                                        <div className="flex flex-col min-w-0 flex-1">
                                                            <span className="text-xs font-semibold truncate leading-tight">{lang.nativeName}</span>
                                                            <span className="text-[10px] text-gray-400 truncate leading-tight">{lang.name}</span>
                                                        </div>
                                                        {isSelected && (
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-cyan-400 ml-auto flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Google Gemini API Key */}
                        <div className="space-y-2.5 p-4 rounded-2xl bg-gray-900/80 border border-gray-700/80">
                            <div className="flex items-center justify-between">
                                <label htmlFor="settings-gemini-key-input" className="text-xs font-bold text-gray-200 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                                    <span>{t('welcome.geminiProvider')}</span>
                                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                                        Primary
                                    </span>
                                </label>
                                <a 
                                    href="https://aistudio.google.com/app/apikey" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 font-medium transition-colors"
                                >
                                    <span>{t('welcome.getKeyLink')}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </a>
                            </div>

                            <div className="relative">
                                <input
                                    id="settings-gemini-key-input"
                                    type={showGeminiKey ? 'text' : 'password'}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder={t('welcome.apiKeyPlaceholder')}
                                    autoFocus
                                    className="w-full py-2.5 pl-3.5 pr-20 bg-gray-950/90 border border-gray-600 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all font-mono placeholder-gray-500 shadow-inner"
                                />
                                
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    {apiKey && (
                                        <button
                                            type="button"
                                            onClick={() => setApiKey('')}
                                            className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
                                            title="Clear"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setShowGeminiKey(!showGeminiKey)}
                                        className="p-1 text-gray-400 hover:text-cyan-400 transition-colors"
                                        title={showGeminiKey ? t('welcome.hideKey') : t('welcome.showKey')}
                                    >
                                        {showGeminiKey ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                                <span>{t('welcome.apiKeyHelp')}</span>
                            </p>
                        </div>

                        {/* Optional OpenAI API */}
                        <div className="space-y-3 p-4 rounded-2xl bg-gray-900/50 border border-gray-700/60">
                            <div className="flex items-center justify-between">
                                <CustomCheckbox
                                    checked={openAiEnabled}
                                    onChange={(checked) => setOpenAiEnabledState(checked)}
                                    label={t('welcome.openaiToggleLabel')}
                                />
                                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700 font-mono">
                                    Optional
                                </span>
                            </div>

                            {openAiEnabled && (
                                <div className="space-y-2 pt-2 border-t border-gray-800 animate-in fade-in slide-in-from-top-2 duration-150">
                                    <div className="flex items-center justify-between">
                                        <label htmlFor="settings-openai-key-input" className="text-xs font-semibold text-gray-300">
                                            {t('welcome.openaiApiKeyLabel')}
                                        </label>
                                        <a 
                                            href="https://platform.openai.com/api-keys" 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 font-medium transition-colors"
                                        >
                                            <span>{t('welcome.openaiGetKeyLink')}</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </a>
                                    </div>

                                    <div className="relative">
                                        <input
                                            id="settings-openai-key-input"
                                            type={showOpenAiKey ? 'text' : 'password'}
                                            value={openAiApiKey}
                                            onChange={(e) => setOpenAiApiKeyState(e.target.value)}
                                            placeholder={t('welcome.openaiApiKeyPlaceholder')}
                                            className="w-full py-2.5 pl-3.5 pr-20 bg-gray-950/90 border border-gray-600 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono placeholder-gray-500 shadow-inner"
                                        />
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                            {openAiApiKey && (
                                                <button
                                                    type="button"
                                                    onClick={() => setOpenAiApiKeyState('')}
                                                    className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
                                                    title="Clear"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setShowOpenAiKey(!showOpenAiKey)}
                                                className="p-1 text-gray-400 hover:text-emerald-400 transition-colors"
                                                title={showOpenAiKey ? t('welcome.hideKey') : t('welcome.showKey')}
                                            >
                                                {showOpenAiKey ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2 flex flex-col sm:flex-row gap-3">
                            <button
                                type="button"
                                onClick={onStart}
                                className="flex-1 py-3.5 px-6 text-base font-bold text-white btn-gradient-animated rounded-xl shadow-lg shadow-cyan-950/50 hover:shadow-cyan-500/20 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 group border border-cyan-300/30"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                <span>{t('welcome.launchCanvas')}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setScreenMode('hero')}
                                className="py-3.5 px-5 border border-gray-600 hover:border-gray-400 bg-gray-900/50 hover:bg-gray-800 text-gray-300 hover:text-white rounded-xl transition-all duration-200 text-sm font-semibold flex items-center justify-center gap-1.5"
                            >
                                <span>{t('welcome.back')}</span>
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onClose, isResumable = false }) => {
  const context = useAppContext();
  const { language: globalLanguage, setSecondaryLanguage, setLanguage, t } = useLanguage();
  
  // Stored Keys State
  const [apiKey, setApiKey] = useState('');
  const [openAiEnabled, setOpenAiEnabledState] = useState<boolean>(() => isOpenAiEnabled());
  const [openAiApiKey, setOpenAiApiKeyState] = useState<string>(() => getOpenAiApiKey());

  // Screen Mode: 'hero' (Big Animated Title + Clean Button) vs 'setup' (Panel)
  const [screenMode, setScreenMode] = useState<ScreenMode>('hero');

  const [isVisible, setIsVisible] = useState(false);
  const [exitPhase, setExitPhase] = useState<'idle' | 'button-exit' | 'window-exit' | 'done'>('idle');
  const [animationStage, setAnimationStage] = useState(0); 
  const [triggerHeartbeat, setTriggerHeartbeat] = useState(false);
  
  // Active visual language
  const [visualLang, setVisualLang] = useState<LanguageCode>(globalLanguage);

  // Sync state if it changes externally
  useEffect(() => {
     setVisualLang(globalLanguage);
  }, [globalLanguage]);

  useEffect(() => {
    const storedKey = localStorage.getItem('settings_userApiKey');
    if (storedKey) setApiKey(storedKey);
    
    // Initial reveal of overlay
    requestAnimationFrame(() => setIsVisible(true));

    // Staged Animation Sequence
    setTimeout(() => setAnimationStage(1), 80);    // Title enters
    setTimeout(() => setTriggerHeartbeat(true), 900); // Heartbeat pulse
    
    setTimeout(() => {
        setTriggerHeartbeat(false);
        setAnimationStage(3); // Controls / Buttons reveal
    }, 1800);
  }, []);

  const handleReloadApp = () => {
      window.location.reload();
  };

  const handleSelectLanguage = (code: LanguageCode) => {
      setVisualLang(code);
      if (code === 'en') {
          setLanguage('en');
      } else {
          setSecondaryLanguage(code);
          setLanguage(code); 
      }
  };

  const handleCycleLanguage = useCallback((direction: number) => {
      const langKeys = Object.keys(languages) as LanguageCode[];
      const currentIndex = langKeys.indexOf(visualLang);
      const validIndex = currentIndex >= 0 ? currentIndex : 0;
      let newIndex = validIndex + direction;
      
      if (newIndex < 0) newIndex = langKeys.length - 1;
      if (newIndex >= langKeys.length) newIndex = 0;
      
      handleSelectLanguage(langKeys[newIndex]);
  }, [visualLang, setLanguage, setSecondaryLanguage]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
              return;
          }
          if (e.key === 'ArrowLeft') {
              handleCycleLanguage(-1);
          } else if (e.key === 'ArrowRight') {
              handleCycleLanguage(1);
          } else if (e.key === 'Escape' && screenMode === 'setup') {
              setScreenMode('hero');
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCycleLanguage, screenMode]);

  const triggerExit = (performReset: boolean, suppressTutorial: boolean = false, languageOverride?: LanguageCode) => {
    localStorage.setItem('hasVisited', 'true');
    setExitPhase('button-exit');
    
    // Save keys to persistence
    if (apiKey.trim()) {
      localStorage.setItem('settings_userApiKey', apiKey.trim());
    }
    setOpenAiEnabled(openAiEnabled);
    if (openAiApiKey.trim()) {
      setOpenAiApiKey(openAiApiKey.trim());
    }

    if (performReset && context) {
        if (context.resetCanvasToDefault) {
            context.resetCanvasToDefault(languageOverride || visualLang);
        }
        
        if (suppressTutorial) {
             localStorage.setItem('tutorial_completed', 'true');
        } else {
            localStorage.removeItem('tutorial_completed');
            setTimeout(() => {
                 if (context.startTutorial) {
                     context.startTutorial();
                 }
            }, 500);
        }
    }
    
    setTimeout(() => { setExitPhase('window-exit'); }, 250);
    setTimeout(() => { 
        onClose();
    }, 700);
  };

  const handleStandardStart = () => {
    triggerExit(!isResumable, false);
  };

  const handleStartNew = () => {
    triggerExit(true, false); 
  };

  return (
    <div 
        className={`fixed inset-0 bg-[#0b0f19]/95 backdrop-blur-xl z-[200] overflow-y-auto overflow-x-hidden custom-scrollbar transition-all duration-500 select-none app-region-drag ${
            exitPhase === 'window-exit' ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
        }`}
        onMouseDown={(e) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }
        }}
    >
        {/* Ambient Floating Glow Circles */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-cyan-600/15 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="min-h-screen w-full flex flex-col items-center justify-center py-12 px-4 relative z-10 pointer-events-auto">
            <style>{`
                .text-gradient-shimmer {
                    background: linear-gradient(
                        110deg,
                        #0284c7 0%,
                        #0ea5e9 20%,
                        #38bdf8 40%,
                        #7dd3fc 50%,
                        #38bdf8 60%,
                        #0ea5e9 80%,
                        #0284c7 100%
                    );
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    animation: textShimmerMove 5.5s linear infinite;
                }
                @keyframes textShimmerMove {
                    0% { background-position: 0% 50%; }
                    100% { background-position: -200% 50%; }
                }

                .btn-gradient-animated {
                    background: linear-gradient(
                        90deg,
                        #0284c7 0%,
                        #00b4d8 25%,
                        #2563eb 50%,
                        #00b4d8 75%,
                        #0284c7 100%
                    );
                    background-size: 200% 100%;
                    animation: btnGradientLoop 5s linear infinite;
                }
                @keyframes btnGradientLoop {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 200% 50%; }
                }

                @keyframes heartbeat {
                    0% { transform: scale(1); }
                    25% { transform: scale(0.97); }
                    50% { transform: scale(1.03); }
                    75% { transform: scale(0.97); }
                    100% { transform: scale(1); }
                }
                .animate-heartbeat {
                    animation: heartbeat 1.2s ease-in-out; 
                }
            `}</style>
            
            {/* Top Right Quick Actions */}
            <div className={`absolute top-4 right-4 z-50 flex items-center gap-2.5 transition-opacity duration-500 app-region-no-drag ${animationStage >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                {/* Reload Button */}
                <button 
                    type="button"
                    onClick={handleReloadApp}
                    className="p-2 rounded-xl bg-gray-900/70 border border-gray-700/70 text-gray-400 hover:text-white hover:border-gray-500 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm backdrop-blur-md"
                    title={t('dialog.settings.reload')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>

                {/* GitHub Repository */}
                <a 
                    href="https://github.com/Neytrino2134/Prompt-Modifier" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-gray-900/70 border border-gray-700/70 text-gray-400 hover:text-white hover:border-gray-500 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm backdrop-blur-md"
                    title="View Source on GitHub"
                >
                    <svg width="16" height="16" viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg" className="fill-current">
                        <path fillRule="evenodd" clipRule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" />
                    </svg>
                </a>
            </div>

            {/* Main Stage Presentation */}
            <div className={`relative z-10 w-full flex flex-col items-center text-center transition-all duration-500 ease-out transform ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
                <WelcomeContent 
                    language={visualLang}
                    globalLanguage={globalLanguage}
                    screenMode={screenMode}
                    setScreenMode={setScreenMode}
                    apiKey={apiKey}
                    setApiKey={setApiKey}
                    openAiEnabled={openAiEnabled}
                    setOpenAiEnabledState={setOpenAiEnabledState}
                    openAiApiKey={openAiApiKey}
                    setOpenAiApiKeyState={setOpenAiApiKeyState}
                    onSelectLanguage={handleSelectLanguage}
                    onStart={handleStandardStart}
                    onStartNew={handleStartNew}
                    onCycleLanguage={handleCycleLanguage}
                    exitPhase={exitPhase}
                    isResumable={isResumable}
                    animationStage={animationStage}
                    triggerHeartbeat={triggerHeartbeat}
                />
            </div>
        </div>
    </div>
  );
};

export default WelcomeScreen;
