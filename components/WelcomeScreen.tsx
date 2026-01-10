
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage, getTranslation, LanguageCode, TranslationKey, languages } from '../localization';
import { useAppContext } from '../contexts/AppContext';

interface WelcomeScreenProps {
  onClose: () => void;
  isResumable?: boolean;
}

// Extracted Content Component for Dual Rendering (Ghost/Active)
const WelcomeContent: React.FC<{
    language: LanguageCode;
    globalLanguage: LanguageCode;
    apiKey: string;
    setApiKey: (val: string) => void;
    onSelectLanguage: (code: LanguageCode) => void;
    onStart: () => void;
    onDeveloperStart: () => void;
    onStartNew?: () => void; // New callback for resetting while in resume mode
    measureRef?: React.Ref<HTMLDivElement>;
    onCycleLanguage: (direction: number) => void;
    exitPhase: 'idle' | 'button-exit' | 'window-exit' | 'done';
    isResumable?: boolean;
    animationStage: number; // 0: Hidden, 1: Title Center, 2: Heartbeat, 3: Title Top, 4: Window In, 5: Extras
    triggerHeartbeat: boolean;
}> = ({ language, globalLanguage, apiKey, setApiKey, onSelectLanguage, onStart, onDeveloperStart, onStartNew, measureRef, onCycleLanguage, exitPhase, isResumable, animationStage, triggerHeartbeat }) => {
    
    const t = useCallback((key: TranslationKey, options?: { [key: string]: string | number }) => {
        return getTranslation(language, key, options);
    }, [language]);

    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const langMenuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input on mount
    useEffect(() => {
        // Only focus if stage is advanced enough to show window (Stage 4 now due to new step)
        if (animationStage >= 4) {
            const timer = setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                }
            }, 300); // Wait for window fade in
            return () => clearTimeout(timer);
        }
    }, [animationStage]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
                setIsLangMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedLangInfo = languages[globalLanguage];

    // Animation classes helper for Window
    // Window only appears at Stage 4
    const getWindowClass = () => {
        if (exitPhase === 'window-exit') return '-translate-y-[150vh] scale-75 opacity-0';
        if (exitPhase === 'button-exit') return 'scale-95';
        
        return animationStage >= 4
            ? 'opacity-100 translate-y-0 scale-100 blur-0' 
            : 'opacity-0 translate-y-12 scale-95 blur-sm pointer-events-none';
    };

    // Dynamic Easing for Title
    // Stage 0->1 (Enter): Elastic Jump
    // Stage 3 (Move Up): Smooth Ease-In-Out
    const titleEasing = animationStage <= 1 ? 'ease-[cubic-bezier(0.34,1.56,0.64,1)]' : 'ease-in-out';
    const titleDuration = animationStage <= 1 ? 'duration-1000' : 'duration-1000'; // Slow slide up

    return (
        <div ref={measureRef} className="w-full flex flex-col items-center text-center select-none">
            {/* Title Row with Navigation Arrows */}
            {/* 
               Animation Logic:
               Stage 0: Hidden below
               Stage 1: Moves to Center (via translate-y-[35vh]) and scales up.
               Stage 2: Heartbeat (Handled by inner div)
               Stage 3: Moves to Top (translate-y-0) and scales normal. 
            */}
            <div className={`
                w-full flex items-center justify-between md:justify-center gap-2 md:gap-12 mb-6 px-1 md:px-4 
                transition-all ${titleDuration} ${titleEasing}
                ${animationStage >= 1 ? 'opacity-100' : 'opacity-0'}
                ${animationStage <= 2 ? 'translate-y-[35vh] scale-125' : 'translate-y-0 scale-100'}
                ${exitPhase !== 'idle' ? 'opacity-0 scale-90 blur-sm' : ''}
            `}>
                 <button 
                    onClick={() => onCycleLanguage(-1)}
                    className={`w-10 h-10 md:w-16 md:h-16 flex-shrink-0 rounded-full border border-cyan-500/30 bg-gray-900/40 backdrop-blur-md text-cyan-400 hover:text-white hover:bg-cyan-500/20 hover:border-cyan-400 transition-all duration-700 shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] flex items-center justify-center group z-30 
                        ${animationStage >= 5 ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}
                    `}
                    aria-label="Previous Language"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-8 md:w-8 transform transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                 </button>

                {/* Massive Animated Gradient Text - Split into two lines */}
                {/* Heartbeat animation applied here */}
                <div className={`flex flex-col items-center justify-center z-20 gap-3 md:gap-8 py-2 ${triggerHeartbeat ? 'animate-heartbeat' : ''}`}>
                    <h1 
                        className="font-black tracking-tighter leading-none text-center animate-gradient-x bg-size-200 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-500 to-cyan-400 px-1 md:px-4 whitespace-nowrap"
                        style={{ fontSize: 'clamp(2rem, 7vw, 120px)' }}
                    >
                        {t('welcome.title')}
                    </h1>
                    <h1 
                        className="font-black tracking-tighter leading-none text-center animate-gradient-x bg-size-200 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-500 to-cyan-400 px-1 md:px-4 whitespace-nowrap"
                        style={{ fontSize: 'clamp(2rem, 7vw, 120px)' }}
                    >
                        {t('app.title')}
                    </h1>
                </div>

                <button 
                    onClick={() => onCycleLanguage(1)}
                    className={`w-10 h-10 md:w-16 md:h-16 flex-shrink-0 rounded-full border border-cyan-500/30 bg-gray-900/40 backdrop-blur-md text-cyan-400 hover:text-white hover:bg-cyan-500/20 hover:border-cyan-400 transition-all duration-700 shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] flex items-center justify-center group z-30
                         ${animationStage >= 5 ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}
                    `}
                    aria-label="Next Language"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-8 md:w-8 transform transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                 </button>
            </div>
            
            {/* Navigation Hint - Appears LAST from TOP */}
            <div className={`mb-8 h-6 flex items-center justify-center transition-all duration-1000 ease-out delay-100 ${animationStage >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`}>
                <p className="text-gray-400 text-sm font-medium tracking-wide bg-gray-900/40 px-3 py-1 rounded-full border border-gray-700/50 backdrop-blur-sm">
                    {t('welcome.navHint')}
                </p>
            </div>

            {/* Main Card Window Wrapper - Appears at Stage 4 */}
            <div className={`relative w-full max-w-[860px] mx-auto transition-all duration-1000 ease-out delay-100 ${getWindowClass()}`}>
                
                {/* Animated Ring */}
                <div className="welcome-ring"></div>

                {/* Main Card Window */}
                <div className="relative z-10 w-full bg-gray-800/80 backdrop-blur-xl rounded-3xl border border-gray-700 shadow-2xl overflow-visible">
                    <div className="p-8 md:p-10 space-y-8 text-left">
                        
                        {/* Description */}
                        <div className="space-y-4 w-full">
                            <p className="text-xl md:text-2xl text-gray-200 leading-relaxed font-light">
                                {t('welcome.description')}
                            </p>
                            <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
                        </div>

                        {/* Language Selection */}
                        <div className="space-y-2 relative z-50">
                             <label className="block text-xs font-medium text-gray-400 ml-1 uppercase tracking-wide">
                                 {t('welcome.selectLanguage' as TranslationKey) || 'Language'}
                             </label>

                             <div ref={langMenuRef} className="relative">
                                 <button
                                     onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                                     className="w-full py-3 px-4 rounded-xl bg-gray-900/60 border border-gray-600 hover:border-cyan-500 hover:bg-gray-800/80 transition-all duration-200 text-left flex items-center justify-between group outline-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                                 >
                                     <div className="flex items-center gap-3">
                                         <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xs font-bold text-gray-300 border border-gray-600 group-hover:border-cyan-400/50 transition-colors">
                                             {selectedLangInfo.short}
                                         </div>
                                         <span className="text-lg text-white font-medium">
                                             {selectedLangInfo.nativeName} <span className="text-gray-500 text-sm ml-1">({selectedLangInfo.name})</span>
                                         </span>
                                     </div>
                                     <svg 
                                        xmlns="http://www.w3.org/2000/svg" 
                                        className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${isLangMenuOpen ? 'rotate-180 text-cyan-400' : ''}`} 
                                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                                     >
                                         <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                     </svg>
                                 </button>

                                 {/* Dropdown Menu */}
                                 {isLangMenuOpen && (
                                     <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800/95 backdrop-blur-xl border border-gray-600 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar p-1 animate-fade-in-drop origin-top z-[100]">
                                         {Object.entries(languages).map(([code, info]) => (
                                             <button
                                                 key={code}
                                                 onClick={() => {
                                                     onSelectLanguage(code as LanguageCode);
                                                     setIsLangMenuOpen(false);
                                                 }}
                                                 className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition-colors ${
                                                     globalLanguage === code 
                                                     ? 'bg-cyan-600/20 text-cyan-400' 
                                                     : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                                 }`}
                                             >
                                                 <div className="flex items-center gap-3">
                                                     <span className="text-xs font-bold w-6 text-gray-500">{info.short}</span>
                                                     <span className="font-medium">{info.nativeName}</span>
                                                 </div>
                                                 {globalLanguage === code && (
                                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400" viewBox="0 0 20 20" fill="currentColor">
                                                         <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                     </svg>
                                                 )}
                                             </button>
                                         ))}
                                     </div>
                                 )}
                             </div>
                        </div>

                        {/* API Key Input */}
                        <div className="space-y-4 text-left w-full pt-4 border-t border-gray-700/50">
                            <div className="space-y-1">
                                <div className="flex justify-between items-center px-1 mb-1">
                                    <label htmlFor="welcome-api-key" className="block text-sm font-medium text-gray-400">
                                        {t('welcome.apiKeyLabel')}
                                    </label>
                                    <a 
                                        href="https://aistudio.google.com/app/apikey" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                                    >
                                        {t('welcome.getKeyLink')}
                                    </a>
                                </div>
                                <div className="relative">
                                    <input
                                        ref={inputRef}
                                        type="password"
                                        id="welcome-api-key"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder={t('welcome.apiKeyPlaceholder')}
                                        className="w-full p-4 bg-gray-900/60 border border-gray-500 rounded-xl text-white outline-none focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200 shadow-inner select-text"
                                    />
                                </div>
                                <div className="flex items-center justify-center pt-2">
                                     <div className="flex items-center space-x-1.5 text-gray-500 bg-gray-900/30 px-3 py-1 rounded-full border border-gray-700/30">
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                        <span className="text-[10px] md:text-xs font-medium">{t('welcome.apiKeyHelp')}</span>
                                     </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Action Button with Animation */}
                        <div className="pt-2 flex flex-col gap-3">
                             <button
                                onClick={onStart}
                                className="w-full py-4 text-lg font-bold text-white bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-600 bg-size-200 animate-gradient-x shadow-cyan-900/30 rounded-xl shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center gap-3 group relative overflow-hidden"
                            >
                                <div className={`flex items-center gap-3 transition-all duration-500 ease-[cubic-bezier(0.68,-0.55,0.27,1.55)] ${exitPhase !== 'idle' ? 'translate-x-[200px] opacity-0' : 'translate-x-0 opacity-100'}`}>
                                    <span>{isResumable ? t('welcome.resume') : t('welcome.letsGo')}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </div>
                            </button>

                            {/* Start New Button - Always visible if Resumable */}
                            {isResumable && onStartNew && (
                                <div className="mt-2 w-full">
                                    <button 
                                        onClick={onStartNew}
                                        className="w-full py-3 border border-gray-600 hover:border-gray-400 text-gray-400 hover:text-white rounded-xl transition-all duration-200 text-sm font-semibold"
                                    >
                                        {t('welcome.startNew')}
                                    </button>
                                </div>
                            )}

                            <div>
                                <button 
                                    onClick={onDeveloperStart}
                                    className="w-full py-3 border border-gray-700 hover:border-cyan-500/50 text-gray-500 hover:text-cyan-400 rounded-xl transition-all duration-200 text-xs font-semibold tracking-wide bg-transparent hover:bg-gray-800/30"
                                >
                                    {t('welcome.iAmDeveloper')}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* External Link Buttons - Appear from bottom */}
            <div className={`mt-10 flex flex-col md:flex-row gap-4 transition-all duration-1000 ease-out ${animationStage >= 5 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95 pointer-events-none'}`}>
                <a 
                    href="https://scriptmodifier2.netlify.app/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 px-6 py-3 rounded-full bg-gray-900/60 hover:bg-gray-800 border border-gray-700 hover:border-cyan-500/50 text-gray-400 hover:text-cyan-400 transition-all duration-300 backdrop-blur-sm shadow-lg hover:shadow-cyan-500/10"
                >
                    <span className="font-semibold tracking-wide text-sm">Go to Script Modifier on Netlify</span>
                     {/* Netlify Icon */}
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 2L2 19.777h20L12 2zm0 3.7l6.6 11.677H5.4L12 5.7z"/></svg>
                </a>
                
                <a 
                    href="https://github.com/Neytrino2134/Script-Modifier" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 px-6 py-3 rounded-full bg-gray-900/60 hover:bg-gray-800 border border-gray-700 hover:border-purple-500/50 text-gray-400 hover:text-purple-400 transition-all duration-300 backdrop-blur-sm shadow-lg hover:shadow-purple-500/10"
                >
                    <span className="font-semibold tracking-wide text-sm">Go to Script Modifier on GitHub</span>
                    {/* GitHub Icon */}
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>
                </a>
            </div>
        </div>
    );
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onClose, isResumable = false }) => {
  const context = useAppContext();
  const { language: globalLanguage, setSecondaryLanguage, setLanguage, t } = useLanguage();
  
  const [apiKey, setApiKey] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [exitPhase, setExitPhase] = useState<'idle' | 'button-exit' | 'window-exit' | 'done'>('idle');
  const [animationStage, setAnimationStage] = useState(0); 
  const [triggerHeartbeat, setTriggerHeartbeat] = useState(false);
  
  // Animation states
  const [visualLang, setVisualLang] = useState<LanguageCode>(globalLanguage);
  const [ghostLang, setGhostLang] = useState<LanguageCode | null>(null);
  const [ghostOpacity, setGhostOpacity] = useState(0);
  const [containerHeight, setContainerHeight] = useState<number | undefined>(undefined);
  
  const measureRef = useRef<HTMLDivElement>(null);
  const transitionTimeout = useRef<any>(null);

  // Sync state if it changes externally
  useEffect(() => {
     if (!ghostLang) setVisualLang(globalLanguage);
  }, [globalLanguage, ghostLang]);

  // Height measurement
  useEffect(() => {
    if (!measureRef.current) return;
    const updateHeight = () => {
        if (measureRef.current) {
            setContainerHeight(measureRef.current.offsetHeight);
        }
    };
    const observer = new ResizeObserver(updateHeight);
    observer.observe(measureRef.current);
    updateHeight();
    return () => observer.disconnect();
  }, [visualLang, animationStage]); // Re-measure on stage change

  useEffect(() => {
    const storedKey = localStorage.getItem('settings_userApiKey');
    if (storedKey) setApiKey(storedKey);
    
    // Initial reveal of overlay
    requestAnimationFrame(() => setIsVisible(true));

    // Staged Animation Sequence
    setTimeout(() => setAnimationStage(1), 100);   // 1. Title floats up to Center (Elastic)
    
    // Heartbeat logic
    // 2. Heartbeat! (Started at 1600ms to center it better in idle time)
    setTimeout(() => setTriggerHeartbeat(true), 1600); 

    // 3. Exit (Stop heartbeat and move up)
    // Slower heartbeat needs more time.
    setTimeout(() => {
        setTriggerHeartbeat(false);
        setAnimationStage(3); // 3. Title slides Up (Smoothly)
    }, 3600); // 3600ms allows for 1.5s animation + buffers
    
    setTimeout(() => setAnimationStage(4), 4400);  // 4. Window appears
    setTimeout(() => setAnimationStage(5), 5000);  // 5. Extras (Links/Hint/Background Icon)
  }, []);

  const handleReloadApp = () => {
      window.location.reload();
  };

  const handleSelectLanguage = (code: LanguageCode) => {
      if (code === globalLanguage) return;
      
      if (transitionTimeout.current) clearTimeout(transitionTimeout.current);

      // 1. Snapshot current visual state as Ghost
      setGhostLang(visualLang);
      setGhostOpacity(1); 
      
      // 2. Switch main visual state
      setVisualLang(code);
      
      // 3. Update Global Context
      if (code === 'en') {
          setLanguage('en');
      } else {
          setSecondaryLanguage(code);
          setLanguage(code); 
      }

      // 4. Trigger Cross-Fade
      requestAnimationFrame(() => {
          requestAnimationFrame(() => {
              setGhostOpacity(0);
          });
      });
      
      // 5. Cleanup Ghost
      transitionTimeout.current = setTimeout(() => {
          setGhostLang(null);
      }, 200); 
  };

  const handleCycleLanguage = useCallback((direction: number) => {
      const langKeys = Object.keys(languages) as LanguageCode[];
      const currentIndex = langKeys.indexOf(visualLang);
      let newIndex = currentIndex + direction;
      
      if (newIndex < 0) newIndex = langKeys.length - 1;
      if (newIndex >= langKeys.length) newIndex = 0;
      
      handleSelectLanguage(langKeys[newIndex]);
  }, [visualLang, globalLanguage]);

  // Keyboard Support
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'ArrowLeft') {
              handleCycleLanguage(-1);
          } else if (e.key === 'ArrowRight') {
              handleCycleLanguage(1);
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCycleLanguage]);

  const triggerExit = (performReset: boolean, suppressTutorial: boolean = false, languageOverride?: LanguageCode) => {
    localStorage.setItem('hasVisited', 'true');
    setExitPhase('button-exit');
    
    // Perform reset only if requested (New Session or Fresh Start)
    if (performReset && context) {
        if (context.resetCanvasToDefault) {
            context.resetCanvasToDefault(languageOverride || visualLang);
        }
        
        if (suppressTutorial) {
             // Developer explicitly skips
             localStorage.setItem('tutorial_completed', 'true');
        } else {
            // Explicitly start tutorial if starting fresh
            localStorage.removeItem('tutorial_completed');
            setTimeout(() => {
                 if (context.startTutorial) {
                     context.startTutorial();
                 }
            }, 500);
        }
    }
    
    setTimeout(() => { }, 200);
    setTimeout(() => { setExitPhase('window-exit'); }, 400);
    setTimeout(() => { 
        onClose();
    }, 1000);
  };

  const handleStandardStart = () => {
    localStorage.setItem('settings_useDevKey', 'false');
    if (apiKey.trim()) {
      localStorage.setItem('settings_userApiKey', apiKey.trim());
    }
    triggerExit(!isResumable, false);
  };

  const handleStartNew = () => {
    localStorage.setItem('settings_useDevKey', 'false');
    if (apiKey.trim()) {
      localStorage.setItem('settings_userApiKey', apiKey.trim());
    }
    triggerExit(true, false); 
  };

  const handleDeveloperStart = () => {
    localStorage.setItem('settings_useDevKey', 'true');
    if (context) context.setIsInstantCloseEnabled(true);
    
    // Auto-select Russian language
    setSecondaryLanguage('ru');
    setLanguage('ru');
    setVisualLang('ru');

    // Force reset to apply Russian titles to the default nodes (true), suppress tutorial (true), use 'ru' override
    triggerExit(true, true, 'ru');
  };

  return (
    <div 
        className={`fixed inset-0 bg-[#111827] z-[200] flex flex-col items-center justify-center overflow-hidden text-white px-4 custom-scrollbar transition-all duration-700 select-none ${exitPhase === 'window-exit' ? 'opacity-0' : 'opacity-100'}`}
        onMouseDown={(e) => {
            // Prevent default behavior (text selection) unless interacting with the input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }
            e.preventDefault();
        }}
    >
        <style>{`
            .bg-size-200 { background-size: 200% auto; }
            @keyframes gradient-x {
                0% { background-position: 0% 50%; }
                100% { background-position: -200% 50%; }
            }
            .animate-gradient-x {
                animation: gradient-x 3s linear infinite;
            }
            @keyframes heartbeat {
                0% { transform: scale(1); }
                25% { transform: scale(0.95); }
                50% { transform: scale(1.05); }
                75% { transform: scale(0.95); }
                100% { transform: scale(1); }
            }
            .animate-heartbeat {
                animation: heartbeat 1.5s ease-in-out; 
            }
        `}</style>
        
        {/* Top Right Badges */}
        <div className={`absolute top-4 right-4 z-50 flex items-center gap-4 transition-opacity duration-700 ${animationStage >= 3 ? 'opacity-100' : 'opacity-0'}`}>
            {/* Reload Button */}
            <button 
                onClick={handleReloadApp}
                className="transition-all duration-300 hover:opacity-100 opacity-60 hover:scale-110 p-1"
                title={t('dialog.settings.reload')}
            >
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-white">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                 </svg>
            </button>

            {/* GitHub Repository */}
            <a 
                href="https://github.com/Neytrino2134/Prompt-Modifier" 
                target="_blank" 
                rel="noopener noreferrer"
                className="transition-all duration-300 hover:opacity-100 opacity-60 hover:scale-110"
                title="View Source on GitHub"
            >
                <svg width="32" height="32" viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg" className="fill-white">
                    <path fillRule="evenodd" clipRule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" />
                </svg>
            </a>

            {/* Netlify Badge */}
            <div className="transition-opacity hover:opacity-100 opacity-80">
                <a href="https://www.netlify.com" target="_blank" rel="noopener noreferrer">
                    <img src="https://www.netlify.com/assets/badges/netlify-badge-color-accent.svg" alt="Deploys by Netlify" />
                </a>
            </div>
        </div>

      {/* Background Decoration - Now appears at Stage 5 */}
      <div className={`absolute -bottom-20 -right-20 pointer-events-none fixed transition-all duration-1000 ${animationStage >= 5 ? 'opacity-5 translate-x-0' : 'opacity-0 translate-x-20'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-[600px] h-[600px] text-white transform rotate-[-15deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="0.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>

      <div 
        className={`relative z-10 w-full flex flex-col items-center text-center transition-all duration-700 ease-out transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        <div className="relative w-full transition-[height] duration-200 ease-in-out" style={{ height: containerHeight ? `${containerHeight}px` : 'auto' }}>
            
            {/* Active Content */}
            <div className="relative w-full z-10">
                <WelcomeContent 
                    language={visualLang}
                    globalLanguage={globalLanguage}
                    apiKey={apiKey}
                    setApiKey={setApiKey}
                    onSelectLanguage={handleSelectLanguage}
                    onStart={handleStandardStart}
                    onDeveloperStart={handleDeveloperStart}
                    onStartNew={handleStartNew}
                    measureRef={measureRef}
                    onCycleLanguage={handleCycleLanguage}
                    exitPhase={exitPhase}
                    isResumable={isResumable}
                    animationStage={animationStage}
                    triggerHeartbeat={triggerHeartbeat}
                />
            </div>

            {/* Ghost Content (Static, fully visible to prevent jumps) */}
            {ghostLang && (
                <div 
                    className="absolute top-0 left-0 w-full z-20 pointer-events-none transition-opacity duration-200 ease-linear"
                    style={{ opacity: ghostOpacity }}
                >
                    <WelcomeContent 
                        language={ghostLang}
                        globalLanguage={globalLanguage}
                        apiKey={apiKey}
                        setApiKey={setApiKey}
                        onSelectLanguage={handleSelectLanguage}
                        onStart={handleStandardStart}
                        onDeveloperStart={handleDeveloperStart}
                        onCycleLanguage={handleCycleLanguage}
                        exitPhase='idle'
                        isResumable={isResumable}
                        animationStage={5} // Force full visibility for ghost
                        triggerHeartbeat={false}
                    />
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default WelcomeScreen;
