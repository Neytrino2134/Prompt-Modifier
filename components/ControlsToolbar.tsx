
import React, { useState, useRef, useEffect } from 'react';
import { Tool } from '../types';
import { useLanguage } from '../localization';

interface ControlsToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
}

const ToolButton: React.FC<{ title: string; onClick: () => void; isActive?: boolean; children: React.ReactNode; }> = ({ title, onClick, isActive = false, children }) => {
    // Theme Refactoring: Use bg-accent for active state
    const activeClass = isActive ? 'bg-accent text-white shadow-md shadow-accent/20' : 'bg-gray-700 hover:bg-accent hover:text-white text-gray-300';
    
    return (
        <div className="relative group flex items-center">
            <button
                onClick={onClick}
                aria-label={title}
                className={`p-2 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-9 w-9 ${activeClass}`}
            >
                {children}
            </button>
            <div
              className={`absolute left-full ml-3 px-3 py-1.5 bg-slate-700 text-slate-200 text-sm whitespace-nowrap rounded-md shadow-xl z-50 transition-opacity duration-200 opacity-0 pointer-events-none group-hover:opacity-100`}
              role="tooltip"
            >
              {title}
            </div>
        </div>
    );
};

const ControlsToolbar: React.FC<ControlsToolbarProps> = ({ activeTool, onToolChange }) => {
    const { t } = useLanguage();
    const [positionY, setPositionY] = useState(56);
    const isDragging = useRef(false);
    const dragStart = useRef({ y: 0, initialTop: 0 });
    const toolbarRef = useRef<HTMLDivElement>(null);

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

        // Apply constraints (56px margin)
        const margin = 56;
        const windowHeight = window.innerHeight;
        const toolbarHeight = toolbarRef.current?.offsetHeight || 0;

        // Clamp top
        if (newTop < margin) newTop = margin;
        
        // Clamp bottom
        if (newTop + toolbarHeight > windowHeight - margin) {
            newTop = windowHeight - toolbarHeight - margin;
        }
        
        setPositionY(newTop);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        isDragging.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    return (
        <div 
            ref={toolbarRef}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ top: `${positionY}px` }}
            className="absolute left-2 z-20 bg-gray-900/50 backdrop-blur-md p-1 rounded-lg shadow-lg flex flex-col items-center gap-1 border border-gray-700"
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
