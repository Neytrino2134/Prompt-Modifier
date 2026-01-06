
import React, { useState } from 'react';
import { LineStyle, Tool } from '../types';
import { useLanguage } from '../localization';

interface ViewControlsToolbarProps {
  isSnapToGrid: boolean;
  onSnapToGridChange: () => void;
  lineStyle: LineStyle;
  onLineStyleChange: (style: LineStyle) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  scaleToSliderValue: (scale: number) => number;
  sliderValueToScale: (value: number) => number;
  onClearCanvas: (e: React.MouseEvent) => void;
  onSaveCanvas: () => void;
  onLoadCanvas: () => void;
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  isSmartGuidesEnabled: boolean;
  onSmartGuidesChange: () => void;
  onResetView?: () => void;
  vertical?: boolean;
}

const ToolButton: React.FC<{ title: string; onClick: (e: React.MouseEvent) => void; isActive?: boolean; children: React.ReactNode; hoverColor?: string; vertical?: boolean }> = ({ title, onClick, isActive = false, children, hoverColor, vertical = false }) => {
    // Theme Refactoring: Use bg-accent for active, hover:bg-accent for hover default
    const activeClass = isActive ? 'bg-accent text-white shadow-md shadow-accent/20' : `bg-gray-700 ${hoverColor || 'hover:bg-accent hover:text-white'} text-gray-300`;
    
    return (
        <div className="relative group flex items-center">
            <button
                onClick={onClick}
                className={`p-2 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-9 w-9 ${activeClass}`}
            >
                {children}
            </button>
            <div
                className={`absolute ${vertical ? 'left-full ml-2 top-1/2 -translate-y-1/2' : 'bottom-full left-1/2 -translate-x-1/2 mb-2'} px-3 py-1.5 bg-slate-700 text-slate-200 text-sm whitespace-nowrap rounded-md shadow-xl z-50 transition-opacity duration-200 opacity-0 pointer-events-none group-hover:opacity-100`}
                role="tooltip"
            >
              {title}
            </div>
        </div>
    );
};

const ViewControlsToolbar: React.FC<ViewControlsToolbarProps> = ({ isSnapToGrid, onSnapToGridChange, lineStyle, onLineStyleChange, zoom, onZoomChange, scaleToSliderValue, sliderValueToScale, onClearCanvas, onSaveCanvas, onLoadCanvas, activeTool, onToolChange, isSmartGuidesEnabled, onSmartGuidesChange, onResetView, vertical = false }) => {
    const { t } = useLanguage();

    const sliderValue = scaleToSliderValue(zoom);

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onZoomChange(sliderValueToScale(Number(e.target.value)));
    };

    const containerClasses = vertical 
        ? "flex flex-col-reverse items-center gap-2 select-none" 
        : "flex items-center space-x-2 select-none";

    const groupClasses = vertical
        ? "flex flex-col-reverse items-center gap-1"
        : "flex items-center space-x-1";

    return (
        <div className={containerClasses}>
            {/* Group 1: Zoom */}
            <div className={groupClasses}>
                 {/* Reset Camera Position Button */}
                 {onResetView && (
                     <ToolButton title={t('toolbar.resetCamera')} onClick={onResetView} vertical={vertical}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </ToolButton>
                 )}

                 <ToolButton title={t('toolbar.zoom')} onClick={() => onToolChange('zoom')} isActive={activeTool === 'zoom'} vertical={vertical}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </ToolButton>
                
                {/* Slider - Hidden in vertical mode to save space */}
                {!vertical && (
                    <div className="relative group flex items-center">
                        <input
                            type="range"
                            min="-100"
                            max="100"
                            step="1"
                            value={sliderValue}
                            onChange={handleSliderChange}
                            // Theme Refactoring: added accent-accent for browser native styling
                            className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-accent"
                        />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-700 text-slate-200 text-sm whitespace-nowrap rounded-md shadow-xl z-50 transition-opacity duration-200 opacity-0 pointer-events-none group-hover:opacity-100" role="tooltip">
                            Zoom
                        </div>
                    </div>
                )}
                
                <ToolButton title={t('toolbar.resetZoom')} onClick={() => onZoomChange(1)} vertical={vertical}>
                    <span className="text-xs font-semibold select-none">{Math.round(zoom * 100)}%</span>
                </ToolButton>
            </div>
            
            {!vertical && <div className="w-px h-6 bg-gray-700 mx-1"></div>}
            {vertical && <div className="h-px w-6 bg-gray-700 my-1"></div>}

            {/* Group 2: View options */}
            <div className={groupClasses}>
                <ToolButton title={`${t('toolbar.snapToGrid')} (Shift+W)`} onClick={onSnapToGridChange} isActive={isSnapToGrid} vertical={vertical}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="6" cy="6" r="1.5" /><circle cx="12" cy="6" r="1.5" /><circle cx="18" cy="6" r="1.5" /><circle cx="6" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="18" cy="12" r="1.5" /><circle cx="6" cy="18" r="1.5" /><circle cx="12" cy="18" r="1.5" /><circle cx="18" cy="18" r="1.5" /></svg>
                </ToolButton>
                <ToolButton title={`${t('toolbar.smartGuides')} (Shift+L)`} onClick={onSmartGuidesChange} isActive={isSmartGuidesEnabled} vertical={vertical}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" d="M12 3v18M3 12h18" />
                    </svg>
                </ToolButton>
                 <ToolButton title={`${t('toolbar.lineStyleSpaghetti')} (Shift+E)`} onClick={() => onLineStyleChange('spaghetti')} isActive={lineStyle === 'spaghetti'} vertical={vertical}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4c16 0 0 16 16 16" /></svg>
                </ToolButton>
                <ToolButton title={`${t('toolbar.lineStyleOrthogonal')} (Shift+E)`} onClick={() => onLineStyleChange('orthogonal')} isActive={lineStyle === 'orthogonal'} vertical={vertical}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8h8v8h8" /></svg>
                </ToolButton>
            </div>
            
            {!vertical && <div className="w-px h-6 bg-gray-700 mx-1"></div>}
            {vertical && <div className="h-px w-6 bg-gray-700 my-1"></div>}

            {/* Group 3: Canvas actions */}
            <div className={groupClasses}>
                <ToolButton title={t('toolbar.clearCanvas')} onClick={onClearCanvas} hoverColor="hover:bg-red-600" vertical={vertical}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                </ToolButton>

                {!vertical && <div className="w-px h-6 bg-gray-700 mx-1"></div>}
                {vertical && <div className="h-px w-6 bg-gray-700 my-1"></div>}
                
                <ToolButton title={t('toolbar.saveCanvas')} onClick={onSaveCanvas} vertical={vertical}>
                    <svg width="24" height="24" viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
                        <path d="M17.2928932,3.29289322 L21,7 L21,20 C21,20.5522847 20.5522847,21 20,21 L4,21 C3.44771525,21 3,20.5522847 3,20 L3,4 C3,3.44771525 3.44771525,3 4,3 L16.5857864,3 C16.8510029,3 17.1053568,3.10535684 17.2928932,3.29289322 Z" />
                        <rect width="10" height="8" x="7" y="13" />
                        <rect width="8" height="5" x="8" y="3" />
                    </svg>
                </ToolButton>
                <ToolButton title={t('toolbar.loadCanvas')} onClick={onLoadCanvas} vertical={vertical}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                    </svg>
                </ToolButton>
            </div>
        </div>
    );
};

export default ViewControlsToolbar;
