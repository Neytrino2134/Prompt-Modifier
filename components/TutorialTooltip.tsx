
import React from 'react';
import { useLanguage } from '../localization';

interface TutorialTooltipProps {
    children: React.ReactNode;
    content: string;
    isActive: boolean;
    position?: 'top' | 'bottom' | 'left' | 'right';
    pulseColor?: string;
    className?: string;
    onSkip?: () => void;
    onNext?: () => void;
    isFinishStep?: boolean;
}

export const TutorialTooltip: React.FC<TutorialTooltipProps> = ({ 
    children, 
    content, 
    isActive, 
    position = 'top',
    pulseColor = 'rgba(34, 211, 238, 0.8)',
    className = '',
    onSkip,
    onNext,
    isFinishStep = false
}) => {
    const { t } = useLanguage();

    if (!isActive) return <>{children}</>;

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-3',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-3',
        left: 'right-full top-1/2 -translate-y-1/2 mr-3',
        right: 'left-full top-1/2 -translate-y-1/2 ml-3',
    };

    const arrowClasses = {
        top: 'top-full left-1/2 -translate-x-1/2 border-t-cyan-900',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-cyan-900',
        left: 'left-full top-1/2 -translate-y-1/2 border-l-cyan-900',
        right: 'right-full top-1/2 -translate-y-1/2 border-r-cyan-900',
    };

    return (
        <div className={`relative inline-flex ${className}`} style={{ zIndex: 1000 }}>
             {/* Pulse Ring */}
            <div className="absolute inset-0 rounded-md pointer-events-none tutorial-ring" style={{ boxShadow: `0 0 0 0 ${pulseColor}` }}></div>
            
            {children}
            
            {/* Tooltip */}
            <div className={`absolute ${positionClasses[position]} z-[1001] w-max max-w-[250px] pointer-events-auto`}>
                 <div className="bg-cyan-900 border border-cyan-500 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-2xl relative animate-bounce-gentle">
                      <div className="mb-2">{content}</div>
                      <div className="flex justify-end border-t border-cyan-700/50 pt-1 mt-1 gap-2">
                          {onNext && (
                              <button 
                                  onClick={(e) => { e.stopPropagation(); onNext(); }}
                                  className="text-[10px] text-cyan-300 hover:text-white underline decoration-cyan-500/50 hover:decoration-white transition-all"
                              >
                                  {t('tutorial.next')}
                              </button>
                          )}
                          
                          {onSkip && (
                              <button 
                                  onClick={(e) => { e.stopPropagation(); onSkip(); }}
                                  className="text-[10px] text-gray-400 hover:text-white underline decoration-gray-500/50 hover:decoration-white transition-all"
                              >
                                  {isFinishStep ? t('tutorial.finish') : t('tutorial.skip')}
                              </button>
                          )}
                      </div>
                      <div className={`absolute border-4 border-transparent ${arrowClasses[position]}`}></div>
                 </div>
            </div>
        </div>
    );
};