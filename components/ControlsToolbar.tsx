import React, { useState, useRef, useEffect } from 'react';
import { Tool } from '../types';
import { useLanguage } from '../localization';
import { useAppContext } from '../contexts/AppContext';

interface ControlsToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
}

const ToolButton: React.FC<{ 
  title: string; 
  shortcut?: string;
  onClick: () => void; 
  isActive?: boolean; 
  children: React.ReactNode; 
  isModern?: boolean;
}> = ({ title, shortcut, onClick, isActive = false, children, isModern = false }) => {
    const activeClass = isActive 
        ? 'bg-accent text-white shadow-md shadow-accent/30' 
        : isModern 
            ? 'bg-gray-800/60 hover:bg-accent hover:text-white text-gray-300 border border-gray-700/40'
            : 'bg-gray-700 hover:bg-accent hover:text-white text-gray-300';
    
    return (
        <div className="relative group flex items-center">
            <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onClick}
                aria-label={title}
                className={`p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-0 outline-none select-none flex items-center justify-center h-9 w-9 ${activeClass}`}
            >
                {children}
            </button>
            <div
              className={`absolute left-full ml-2.5 px-2.5 py-1 bg-gray-900/90 text-gray-200 text-xs font-medium whitespace-nowrap rounded-md shadow-xl z-50 border border-gray-700/60 backdrop-blur-md transition-opacity duration-150 opacity-0 pointer-events-none group-hover:opacity-100 flex items-center gap-1.5`}
              role="tooltip"
            >
              <span>{title}</span>
              {shortcut && (
                <span className="px-1 py-0.2 bg-gray-800 text-[10px] text-accent font-mono rounded border border-gray-700">
                  {shortcut}
                </span>
              )}
            </div>
        </div>
    );
};

const ControlsToolbar: React.FC<ControlsToolbarProps> = ({ activeTool, onToolChange }) => {
    const { t } = useLanguage();
    const { isStatusBarOpen, headerHeight, panelStyle, isPanelAutoHide } = useAppContext();

    const isModern = panelStyle === 'modern';
    const [isHovered, setIsHovered] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Safe zone calculation based on AppHeader height and status bar visibility
    const baseHeaderHeight = headerHeight > 0 ? headerHeight : (isStatusBarOpen ? 112 : 76);
    const minTopMargin = isModern ? baseHeaderHeight + 10 : baseHeaderHeight + 14;

    const [positionY, setPositionY] = useState(minTopMargin);
    const isDragging = useRef(false);
    const dragStart = useRef({ y: 0, initialTop: positionY });
    const toolbarRef = useRef<HTMLDivElement>(null);
    const prevStatusBarOpenRef = useRef<boolean | undefined>(undefined);

    const handleMouseEnter = () => {
        if (leaveTimerRef.current) {
            clearTimeout(leaveTimerRef.current);
            leaveTimerRef.current = null;
        }
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = setTimeout(() => {
            setIsHovered(false);
        }, 350);
    };

    useEffect(() => {
        return () => {
            if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
        };
    }, []);

    // Shift toolbar down when status bar opens, and up when status bar closes
    useEffect(() => {
        if (prevStatusBarOpenRef.current === undefined) {
            prevStatusBarOpenRef.current = isStatusBarOpen;
            setPositionY(prev => Math.max(minTopMargin, prev));
            return;
        }

        if (prevStatusBarOpenRef.current !== isStatusBarOpen) {
            const shift = isStatusBarOpen ? 34 : -34;
            prevStatusBarOpenRef.current = isStatusBarOpen;
            setPositionY(prev => Math.max(minTopMargin, prev + shift));
        } else {
            setPositionY(prev => Math.max(minTopMargin, prev));
        }
    }, [isStatusBarOpen, minTopMargin]);

    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        isDragging.current = true;
        dragStart.current = { y: e.clientY, initialTop: positionY };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging.current) return;
        const dy = e.clientY - dragStart.current.y;
        
        let newTop = dragStart.current.initialTop + dy;

        // Apply dynamic safe zone constraints
        const minBottomMargin = 56;
        const windowHeight = window.innerHeight;
        const toolbarHeight = toolbarRef.current?.offsetHeight || 0;

        // Clamp top to safe zone
        if (newTop < minTopMargin) newTop = minTopMargin;
        
        // Clamp bottom
        if (newTop + toolbarHeight > windowHeight - minBottomMargin) {
            newTop = windowHeight - toolbarHeight - minBottomMargin;
        }
        
        setPositionY(newTop);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        isDragging.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    // Auto-collapse check for modern mode:
    const shouldCollapse = isModern && isPanelAutoHide && !isPinned && !isHovered;

    if (isModern) {
        return (
            <div 
                ref={toolbarRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onMouseDown={(e) => e.stopPropagation()}
                style={{ 
                    top: `${positionY}px`,
                    transform: shouldCollapse ? 'translateX(calc(-100% + 14px))' : 'translateX(0)',
                }}
                className={`fixed left-0 z-30 transition-transform duration-300 ease-out select-none flex items-center ${isDragging.current ? 'cursor-ns-resize' : ''}`}
            >
                {/* Main Edge Panel */}
                <div className="bg-gray-900/60 backdrop-blur-md border-y border-r border-gray-700/40 shadow-xl rounded-r-xl p-1.5 flex flex-col items-center gap-1.5 text-gray-300">
                    {/* Panel Title & Drag Bar */}
                    <div 
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        className="w-full py-1 flex items-center justify-center cursor-ns-resize hover:bg-gray-800/40 rounded transition-colors group"
                        title="Drag vertically"
                    >
                        <div className="w-5 h-1 bg-gray-500/70 rounded-full group-hover:bg-accent transition-colors" />
                    </div>

                    {/* Tools */}
                    <ToolButton title={t('toolbar.edit')} shortcut="V" onClick={() => onToolChange('edit')} isActive={activeTool === 'edit'} isModern={true}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </ToolButton>
                    <ToolButton title={t('toolbar.cutter')} shortcut="C" onClick={() => onToolChange('cutter')} isActive={activeTool === 'cutter'} isModern={true}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </ToolButton>
                    <ToolButton title={t('toolbar.selection')} shortcut="S" onClick={() => onToolChange('selection')} isActive={activeTool === 'selection'} isModern={true}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" d="M3.75 3.75h16.5v16.5H3.75z" /></svg>
                    </ToolButton>
                    <ToolButton title={t('toolbar.reroute')} shortcut="R" onClick={() => onToolChange('reroute')} isActive={activeTool === 'reroute'} isModern={true}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                    </ToolButton>

                    <div className="w-6 h-px bg-gray-700/40 my-0.5" />

                    {/* Pin/Unpin Toggle */}
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setIsPinned(p => !p)}
                        className={`p-1.5 rounded-lg transition-all text-xs flex items-center justify-center h-8 w-8 focus:outline-none focus:ring-0 outline-none select-none border ${
                            isPinned
                                ? 'bg-accent/20 text-accent border-accent/40 shadow-sm'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40 border-transparent'
                        }`}
                        title={isPinned ? t('panel.unpin') : t('panel.pin')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                    </button>
                </div>

                {/* Micro Handle Indicator Strip (Visible when collapsed) - No white border */}
                <div 
                    className={`w-3.5 h-16 bg-gray-900/60 backdrop-blur-md border-y border-r border-gray-700/30 rounded-r-md flex flex-col items-center justify-center cursor-pointer transition-opacity duration-200 shadow-md ${
                        shouldCollapse ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                    title={t('panel.revealHint')}
                >
                    <div className="w-1 h-6 bg-accent/90 rounded-full shadow-[0_0_6px_var(--color-accent)] animate-pulse" />
                </div>
            </div>
        );
    }

    // Classic Style
    return (
        <div 
            ref={toolbarRef}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ top: `${positionY}px` }}
            className={`absolute left-2 z-20 bg-gray-900/50 backdrop-blur-md p-1 rounded-lg shadow-lg flex flex-col items-center gap-1 border border-gray-700 ${isDragging.current ? '' : 'transition-[top] duration-200 ease-out'}`}
        >
            {/* Drag Handle */}
            <div 
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="w-full h-3 flex items-center justify-center cursor-ns-resize group hover:bg-gray-800/50 rounded-t-lg -mt-0.5"
                title="Drag vertically"
            >
                <div className="w-6 h-1 bg-gray-600 rounded-full group-hover:bg-gray-400 transition-colors"></div>
            </div>

            {/* Tools */}
            <ToolButton title={t('toolbar.edit')} onClick={() => onToolChange('edit')} isActive={activeTool === 'edit'}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </ToolButton>
            <ToolButton title={t('toolbar.cutter')} onClick={() => onToolChange('cutter')} isActive={activeTool === 'cutter'}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </ToolButton>
            <ToolButton title={t('toolbar.selection')} onClick={() => onToolChange('selection')} isActive={activeTool === 'selection'}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" d="M3.75 3.75h16.5v16.5H3.75z" /></svg>
            </ToolButton>
            <ToolButton title={t('toolbar.reroute')} onClick={() => onToolChange('reroute')} isActive={activeTool === 'reroute'}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
            </ToolButton>
        </div>
    );
};

export default ControlsToolbar;
