
import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { CHAT_STYLES } from './constants';
import { Tooltip } from '../../Tooltip';
import { useLanguage } from '../../../localization';
import { useLLMModelConfig } from '../../../hooks/useLLMModelConfig';

interface ChatHeaderProps {
    currentStyle: string;
    currentModel: string;
    isChatting: boolean;
    onStyleChange: (style: string) => void;
    onModelChange: (model: string) => void;
    onMouseDown: (e: React.MouseEvent) => void;
}

const StyleButton = React.forwardRef<HTMLButtonElement, { id: string; label: string; icon: React.ReactNode; isActive: boolean; onClick: () => void; }>(({ label, icon, isActive, onClick }, ref) => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
        <button
            ref={ref}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseDown={e => e.stopPropagation()}
            className={`
                relative z-10 flex items-center justify-center px-4 py-1.5 transition-colors duration-200 rounded-md whitespace-nowrap
                ${isActive ? 'text-accent-text font-semibold' : 'text-gray-400 hover:text-gray-200'}
            `}
        >
            <span className={`relative z-10 mr-2 flex items-center justify-center transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}>{icon}</span>
            <span className="text-xs relative z-10">{label}</span>

            {/* Tooltip for inactive tabs */}
            {!isActive && isHovered && (
                 <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-700 text-slate-200 text-xs whitespace-nowrap rounded shadow-xl z-50 pointer-events-none animate-fade-in-up`}>
                    {label}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-700"></div>
                </div>
             )}
        </button>
    );
});

export const ChatHeader: React.FC<ChatHeaderProps> = ({ currentStyle, currentModel, isChatting, onStyleChange, onModelChange, onMouseDown }) => {
    const { t } = useLanguage();
    const { flashModel, proModel, flashLabel, proLabel } = useLLMModelConfig();
    // Memoize styles to prevent new array reference on every render, which causes infinite loop in useLayoutEffect
    const styles = useMemo(() => CHAT_STYLES(t), [t]);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const itemsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
    
    // State for the sliding background pill
    const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number; opacity: number }>({ left: 0, width: 0, opacity: 0 });

    const isFlash = currentModel === 'flash' || currentModel.includes('flash') || (!currentModel.includes('pro') && currentModel !== 'pro');

    const updateIndicator = () => {
        const item = itemsRef.current.get(currentStyle);
        const container = scrollContainerRef.current;
        
        if (item && container) {
            // Calculate position relative to the SCROLL CONTAINER, handling scroll offset
            // item.offsetLeft is relative to the parent div (the flex container inside scrollContainer)
            // We need to ensure we are targeting the flex container for the absolute pill
            
            setIndicatorStyle({
                left: item.offsetLeft,
                width: item.offsetWidth,
                opacity: 1
            });

            // Scroll into view logic
            const containerWidth = container.clientWidth;
            const itemLeft = item.offsetLeft;
            const itemWidth = item.offsetWidth;
            
            // Calculate center position
            const scrollTo = itemLeft - (containerWidth / 2) + (itemWidth / 2);
            
            container.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    // Use useLayoutEffect to update before browser paint to prevent flickering
    useLayoutEffect(() => {
        updateIndicator();
    }, [currentStyle, styles]); // Update on style change or language change (styles array change)
    
    // Also listen for resize to adjust pill width
    useEffect(() => {
        // Wrap updateIndicator to avoid dependency issues if it relies on closure vars that change (it relies on refs mostly)
        const handleResize = () => updateIndicator();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [currentStyle]);

    return (
        <div className="flex items-center bg-gray-900/40 px-1 pt-1 rounded-md mb-2 shrink-0 h-11 border-b border-gray-700/50 w-full select-none gap-2" onMouseDown={onMouseDown}>
            
            {/* Left Side: Scrollable Tabs Container */}
            <div 
                ref={scrollContainerRef}
                className="flex-1 min-w-0 h-full overflow-x-auto overflow-y-hidden hide-scrollbar mask-fade relative scroll-smooth group bg-gray-900/60 rounded-lg border border-gray-700/50"
                onWheel={(e) => e.stopPropagation()}
            >
                <div className="flex relative h-full items-center p-1 min-w-max">
                    {/* The Sliding Background Pill */}
                    <div 
                        className="absolute top-1 bottom-1 bg-gray-700 border border-gray-600 rounded-md shadow-sm transition-all duration-300 ease-out z-0"
                        style={{ 
                            left: `${indicatorStyle.left}px`, 
                            width: `${indicatorStyle.width}px`,
                            opacity: indicatorStyle.opacity,
                            // Ensure it doesn't jump vertically
                            height: 'calc(100% - 8px)' 
                        }}
                    />

                    {styles.map(s => (
                        <StyleButton
                            key={s.id}
                            ref={(el) => {
                                if (el) itemsRef.current.set(s.id, el);
                                else itemsRef.current.delete(s.id);
                            }}
                            id={s.id}
                            label={s.label}
                            icon={s.icon}
                            isActive={currentStyle === s.id}
                            onClick={() => onStyleChange(s.id)}
                        />
                    ))}
                </div>
            </div>
            
            {/* Right Side: Fixed Model Selector */}
            <div className="flex-shrink-0 flex items-center h-full py-0.5">
                <div className="relative flex bg-gray-800 rounded p-0.5 border border-gray-700 h-9 items-center w-16 isolate">
                    {/* Animated Background Pill */}
                    <div 
                        className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] bg-accent rounded-sm shadow-md transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] z-0 ${isFlash ? 'left-0.5' : 'left-[calc(50%+1px)]'}`} 
                    />

                    <Tooltip content={`Flash (${flashLabel || flashModel})`} position="top" className="h-full flex-1" usePortal={false}>
                        <button
                            onClick={() => onModelChange('flash')}
                            disabled={isChatting}
                            className={`relative z-10 w-full h-full flex items-center justify-center rounded-sm transition-colors duration-200 ${isFlash ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </button>
                    </Tooltip>
                    
                    <Tooltip content={`Pro (${proLabel || proModel})`} position="top" className="h-full flex-1" usePortal={false}>
                        <button
                            onClick={() => onModelChange('pro')}
                            disabled={isChatting}
                            className={`relative z-10 w-full h-full flex items-center justify-center rounded-sm transition-colors duration-200 ${!isFlash ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" />
                            </svg>
                        </button>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
};
