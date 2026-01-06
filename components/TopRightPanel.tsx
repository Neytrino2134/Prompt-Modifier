
import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { ActiveOperation } from '../types';
import { TutorialTooltip } from './TutorialTooltip';
import { useLanguage } from '../localization';

const useFps = () => {
  const [fps, setFps] = useState(0);
  const frameCount = useRef(0);
  const lastFrameTime = useRef(performance.now());
  const animationFrameId = useRef(0);

  useEffect(() => {
    const loop = () => {
      const now = performance.now();
      frameCount.current++;
      if (now >= lastFrameTime.current + 1000) {
        setFps(frameCount.current);
        frameCount.current = 0;
        lastFrameTime.current = now;
      }
      animationFrameId.current = requestAnimationFrame(loop);
    };

    animationFrameId.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  return fps;
};

const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10); 
    return `${seconds}.${milliseconds.toString().padStart(2, '0')}s`;
};

const TopRightPanel: React.FC = () => {
    const context = useAppContext();
    const fps = useFps();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { language } = useLanguage();

    // Timer State
    const [elapsedTime, setElapsedTime] = useState(0);
    const [lastResult, setLastResult] = useState(0);
    const startTimeRef = useRef<number | null>(null);
    const timerRafRef = useRef<number | null>(null);
    
    // Auto-Save Countdown State
    const [secondsToSave, setSecondsToSave] = useState<number | null>(null);

    // Save Success State
    const [showSavedState, setShowSavedState] = useState(false);
    const prevAutoSavingRef = useRef(false);

    if (!context) return null;
    const { 
        activeOperations, 
        t, 
        tutorialStep, 
        skipTutorial, 
        advanceTutorial,
        nextAutoSaveTime,
        isAutoSaving
    } = context;
    
    const operations: ActiveOperation[] = Array.from(activeOperations.values());
    const currentOp = operations.length > 0 ? operations[operations.length - 1] : null;
    const isProcessing = operations.length > 0;
    
    // Check for tutorial step
    const isTutorialActive = tutorialStep === 'image_output_generating';

    useEffect(() => {
        if (isProcessing) {
            // Start Timer if not already running
            if (startTimeRef.current === null) {
                startTimeRef.current = performance.now();
                setElapsedTime(0);
            }

            const loop = () => {
                if (startTimeRef.current !== null) {
                    setElapsedTime(performance.now() - startTimeRef.current);
                    timerRafRef.current = requestAnimationFrame(loop);
                }
            };
            timerRafRef.current = requestAnimationFrame(loop);
        } else {
            // Stop Timer
            if (startTimeRef.current !== null) {
                const finalTime = performance.now() - startTimeRef.current;
                setLastResult(finalTime);
                setElapsedTime(0); // Reset live display, we will show lastResult
                startTimeRef.current = null;
            }
            if (timerRafRef.current) {
                cancelAnimationFrame(timerRafRef.current);
                timerRafRef.current = null;
            }
        }

        return () => {
            if (timerRafRef.current) cancelAnimationFrame(timerRafRef.current);
        };
    }, [isProcessing]);
    
    // Auto Save Monitor
    useEffect(() => {
        if (!nextAutoSaveTime) {
            setSecondsToSave(null);
            return;
        }

        const interval = setInterval(() => {
            const now = Date.now();
            const diff = nextAutoSaveTime - now;
            
            if (diff > 0 && diff <= 10000) {
                 setSecondsToSave(Math.ceil(diff / 1000));
            } else {
                setSecondsToSave(null);
            }
        }, 200);

        return () => clearInterval(interval);
    }, [nextAutoSaveTime]);

    // Handle "Saved" Success State
    useEffect(() => {
        if (prevAutoSavingRef.current && !isAutoSaving) {
            // Transition from Saving -> Not Saving
            setShowSavedState(true);
            const timer = setTimeout(() => setShowSavedState(false), 2000);
            return () => clearTimeout(timer);
        }
        prevAutoSavingRef.current = isAutoSaving;
    }, [isAutoSaving]);

    // Determine what time to show
    const timeDisplay = isProcessing ? elapsedTime : lastResult;

    return (
        <div className="fixed top-2 right-2 z-50 flex flex-col items-end pointer-events-none select-none">
             <TutorialTooltip 
                content={t('tutorial.step3b')} 
                isActive={!!isTutorialActive} 
                position="bottom" 
                onSkip={skipTutorial} 
                onNext={advanceTutorial}
             >
                 <div className={`bg-gray-900/50 backdrop-blur-md rounded-lg shadow-lg border border-gray-700 p-1 flex items-center space-x-2 pointer-events-auto transition-all duration-300`}>
                    
                    {!isCollapsed && (
                        <>
                            {/* Status Group */}
                            <div className="flex items-center space-x-3 px-2 min-w-[140px]">
                                 {currentOp ? (
                                     <>
                                        <div className="relative flex h-3 w-3 flex-shrink-0">
                                            {/* Use Theme Accent for Ping and Dot */}
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
                                        </div>
                                        <div className="flex flex-col leading-tight min-w-0">
                                            {/* Use Theme Accent for Text */}
                                            <span className="text-[10px] font-bold text-accent-text uppercase tracking-wider truncate">Processing</span>
                                            <span className="text-xs text-gray-300 whitespace-nowrap truncate max-w-[150px]" title={currentOp.description}>
                                                 {currentOp.description}
                                            </span>
                                        </div>
                                     </>
                                 ) : isAutoSaving ? (
                                     <>
                                        {/* Theme Accent for pulse */}
                                        <div className="relative flex h-3.5 w-3.5 flex-shrink-0 text-accent-text animate-pulse">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                                                <path fillRule="evenodd" d="M19.5 21a3 3 0 003-3V9a3 3 0 00-3-3h-5.379a.75.75 0 01-.53-.22L11.47 3.66A2.25 2.25 0 009.879 3H4.5a3 3 0 00-3 3v12a3 3 0 003 3h15zm-6.75-10.5a.75.75 0 00-1.5 0v4.19l-1.72-1.72a.75.75 0 00-1.06 1.06l3 3a.75.75 0 001.06 0l3-3a.75.75 0 10-1.06-1.06l-1.72 1.72V10.5z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="flex flex-col leading-tight">
                                             <span className="text-[10px] font-bold text-accent-text uppercase tracking-wider">System</span>
                                             <span className="text-xs text-accent-text">Saving...</span>
                                         </div>
                                     </>
                                 ) : showSavedState ? (
                                    <>
                                       <div className="relative flex h-3.5 w-3.5 flex-shrink-0 text-accent-text">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                                                <path d="M11.47 3.84a.75.75 0 011.06 0l8.635 8.635a.75.75 0 11-1.06 1.06l-8.635-8.635a.75.75 0 010-1.06z" />
                                                <path d="M19.5 21a3 3 0 003-3V9a3 3 0 00-3-3h-5.379a.75.75 0 01-.53-.22L11.47 3.66A2.25 2.25 0 009.879 3H4.5a3 3 0 00-3 3v12a3 3 0 003 3h15z" opacity="0.5"/>
                                                <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                                            </svg>
                                       </div>
                                       <div className="flex flex-col leading-tight">
                                            <span className="text-[10px] font-bold text-accent-text uppercase tracking-wider">System</span>
                                            <span className="text-xs text-white">Saved</span>
                                        </div>
                                    </>
                                 ) : (
                                     <>
                                         <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] flex-shrink-0"></div>
                                         <div className="flex flex-col leading-tight">
                                             <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">System</span>
                                             <span className="text-xs text-gray-300">
                                                 {secondsToSave !== null ? `Saving in ${secondsToSave}s...` : 'Ready'}
                                             </span>
                                         </div>
                                     </>
                                 )}
                            </div>

                            {/* Divider */}
                            <div className="w-px h-8 bg-gray-700 mx-1"></div>

                            {/* Timer Group */}
                            <div className="flex flex-col items-center justify-center px-2 min-w-[60px]">
                                <span className={`text-lg font-bold font-mono leading-none ${isProcessing ? 'text-accent-text' : 'text-gray-400'}`}>
                                    {formatTime(timeDisplay)}
                                </span>
                                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider leading-none mt-0.5">Time</span>
                            </div>

                            {/* Divider */}
                            <div className="w-px h-8 bg-gray-700 mx-1"></div>

                            {/* FPS Group */}
                            <div className="flex flex-col items-center justify-center px-2 min-w-[50px]">
                                 <span className="text-lg font-bold text-accent-text font-mono leading-none">
                                    {fps}
                                </span>
                                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider leading-none mt-0.5">FPS</span>
                            </div>
                        </>
                    )}

                     {/* Expand/Collapse Button */}
                     <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-2 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-9 w-9 bg-gray-700 hover:bg-accent hover:text-white text-gray-300 ml-1"
                        aria-label={isCollapsed ? "Expand Panel" : "Collapse Panel"}
                        title={isCollapsed ? "Expand" : "Collapse"}
                    >
                        {isCollapsed ? (
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                        ) : (
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        )}
                    </button>
                 </div>
             </TutorialTooltip>
        </div>
    );
}

export default TopRightPanel;
