
import React, { useState } from 'react';
import { CHAT_STYLES } from './constants';
import { Tooltip } from '../../Tooltip';
import { useLanguage } from '../../../localization';

interface ChatHeaderProps {
    currentStyle: string;
    currentModel: string;
    isChatting: boolean;
    onStyleChange: (style: string) => void;
    onModelChange: (model: string) => void;
    onMouseDown: (e: React.MouseEvent) => void;
}

const StyleButton: React.FC<{ id: string; label: string; icon: React.ReactNode; isActive: boolean; onClick: () => void; }> = ({ label, icon, isActive, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseDown={e => e.stopPropagation()}
            className={`
                relative flex items-center justify-center px-3 py-1.5 transition-all duration-300 ease-in-out h-full overflow-hidden
                rounded-t-md rounded-b-none border-b-2
                ${isActive 
                    ? 'bg-gray-800 text-accent-text border-accent flex-grow shadow-[inset_0_-2px_10px_rgba(0,0,0,0.3)]' 
                    : 'bg-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/30 border-transparent flex-none'
                }
            `}
        >
            <span className={`z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}>{icon}</span>
            
            {/* Label Animation */}
            <div className={`overflow-hidden transition-all duration-300 ${isActive ? 'max-w-[120px] ml-2 opacity-100' : 'max-w-0 ml-0 opacity-0'}`}>
                <span className="text-xs font-bold whitespace-nowrap">{label}</span>
            </div>

            {/* Tooltip for inactive tabs */}
            {!isActive && isHovered && (
                 <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-700 text-slate-200 text-xs whitespace-nowrap rounded shadow-xl z-50 pointer-events-none animate-fade-in-up`}>
                    {label}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-700"></div>
                </div>
             )}
        </button>
    );
};

export const ChatHeader: React.FC<ChatHeaderProps> = ({ currentStyle, currentModel, isChatting, onStyleChange, onModelChange, onMouseDown }) => {
    const { t } = useLanguage();
    const styles = CHAT_STYLES(t);

    return (
        <div className="flex items-end bg-gray-900/30 px-1 pt-1 rounded-md mb-2 shrink-0 justify-between gap-2 h-10 border-b border-gray-700/50" onMouseDown={onMouseDown}>
            <div className="flex gap-1 flex-1 h-full items-end">
                {styles.map(s => (
                    <StyleButton
                        key={s.id}
                        id={s.id}
                        label={s.label}
                        icon={s.icon}
                        isActive={currentStyle === s.id}
                        onClick={() => onStyleChange(s.id)}
                    />
                ))}
            </div>
            
            {/* Model Selector - Icon Buttons */}
            <div className="relative flex bg-gray-800 rounded p-0.5 border border-gray-700 h-8 items-center w-16 isolate self-center">
                {/* Animated Background Pill */}
                <div 
                    className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] bg-accent rounded-sm shadow-md transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] z-0 ${currentModel === 'gemini-3-flash-preview' ? 'left-0.5' : 'left-[calc(50%+1px)]'}`} 
                />

                <Tooltip content="Flash 3.0" position="top" className="h-full flex-1" usePortal={false}>
                    <button
                        onClick={() => onModelChange('gemini-3-flash-preview')}
                        disabled={isChatting}
                        className={`relative z-10 w-full h-full flex items-center justify-center rounded-sm transition-colors duration-200 ${currentModel === 'gemini-3-flash-preview' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </button>
                </Tooltip>
                
                <Tooltip content="Pro 3.0" position="top" className="h-full flex-1" usePortal={false}>
                    <button
                        onClick={() => onModelChange('gemini-3-pro-preview')}
                        disabled={isChatting}
                        className={`relative z-10 w-full h-full flex items-center justify-center rounded-sm transition-colors duration-200 ${currentModel === 'gemini-3-pro-preview' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" />
                        </svg>
                    </button>
                </Tooltip>
            </div>
        </div>
    );
};
