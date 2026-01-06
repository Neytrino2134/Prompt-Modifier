
import React, { useMemo } from 'react';
import CustomSelect from '../CustomSelect';
import { ButtonWithTooltip } from './SharedUI';
import { useLanguage } from '../../localization';

interface EditorSidebarProps {
    resolution: string; setResolution: (v: string) => void;
    aspectRatio: string; setAspectRatio: (v: string) => void;
    backgroundType: string; setBackgroundType: (v: string) => void;
    activeTool: string;
    isSnappingEnabled: boolean; setIsSnappingEnabled: (v: boolean) => void;
    isFreeAspect: boolean; setIsFreeAspect: (v: boolean) => void;
    drawColor: string; setDrawColor: (v: string) => void;
    brushSize: number; setBrushSize: (v: number) => void;
    modificationPrompt: string; setModificationPrompt: (v: string) => void;
    isProcessing: boolean;
    handleRequestModification: () => void;
    handleRemoveObject: () => void;
    handleRemoveBackground: () => void; // New prop
    canvasSize: { width: number; height: number };
}

export const EditorSidebar: React.FC<EditorSidebarProps> = ({
    resolution, setResolution,
    aspectRatio, setAspectRatio,
    backgroundType, setBackgroundType,
    activeTool,
    isSnappingEnabled, setIsSnappingEnabled,
    isFreeAspect, setIsFreeAspect,
    drawColor, setDrawColor,
    brushSize, setBrushSize,
    modificationPrompt, setModificationPrompt,
    isProcessing,
    handleRequestModification,
    handleRemoveObject,
    handleRemoveBackground, // New prop
    canvasSize
}) => {
    const { t } = useLanguage();
    const palette = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e', '#ffffff', '#9ca3af', '#4b5563', '#000000'];

    const resolutionOptions = useMemo(() => {
        const raw = [
            { value: 'auto', label: 'Auto (Fit Image)', type: 'auto' },
            { value: '1920x1080', label: '1920x1080', type: 'landscape' },
            { value: '1080x1920', label: '1080x1920', type: 'portrait' },
            { value: '512x512', label: '512x512', type: 'square' },
            { value: '1024x1024', label: '1024x1024', type: 'square' },
            { value: '2048x2048', label: '2048x2048', type: 'square' },
            { value: '4096x4096', label: '4096x4096', type: 'square' },
        ];
        return raw.map(opt => {
            let icon;
            switch (opt.type) {
                case 'landscape': icon = <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="7" width="20" height="10" rx="1" /></svg>; break;
                case 'portrait': icon = <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="2" width="10" height="20" rx="1" /></svg>; break;
                case 'square': icon = <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="1" /></svg>; break;
                case 'auto': icon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>; break;
            }
            return { value: opt.value, label: opt.label, icon };
        });
    }, []);

    const aspectRatioOptions = useMemo(() => {
        const raw = [
            { value: 'free', label: 'Free', type: 'free' },
            { value: '16:9', label: '16:9', type: 'landscape' },
            { value: '9:16', label: '9:16', type: 'portrait' },
            { value: '4:3', label: '4:3', type: 'landscape_slight' },
            { value: '3:4', label: '3:4', type: 'portrait_slight' },
            { value: '1:1', label: '1:1', type: 'square' },
        ];
        return raw.map(opt => {
            let icon;
            switch (opt.type) {
                case 'free': icon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>; break;
                case 'landscape': icon = <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="8" width="20" height="8" rx="1" /></svg>; break;
                case 'portrait': icon = <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="8" y="2" width="10" height="20" rx="1" /></svg>; break;
                case 'landscape_slight': icon = <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="6" width="18" height="12" rx="1" /></svg>; break;
                case 'portrait_slight': icon = <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="3" width="12" height="18" rx="1" /></svg>; break;
                case 'square': icon = <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="1" /></svg>; break;
            }
            return { value: opt.value, label: opt.label, icon };
        });
    }, []);

    return (
        <div 
            className="w-64 p-4 border-r border-gray-700 flex-shrink-0 flex flex-col bg-gray-800 overflow-y-auto overflow-x-hidden custom-scrollbar select-none"
            onWheel={(e) => e.stopPropagation()}
        >
             {/* Settings */}
             <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">{t('imageEditor.canvasResolution')}</label>
                    <CustomSelect value={resolution} onChange={setResolution} options={resolutionOptions} />
                    <p className="text-[10px] text-gray-500 mt-1 text-right">{canvasSize.width} x {canvasSize.height} px</p>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">{t('node.content.aspectRatio')}</label>
                    <CustomSelect value={aspectRatio} onChange={setAspectRatio} options={aspectRatioOptions} disabled={resolution !== 'auto'} />
                </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">{t('imageEditor.background')}</label>
                    <div className="flex space-x-2 bg-gray-900/50 p-2 rounded-md border border-gray-600 justify-between items-center">
                        <button 
                            onClick={() => setBackgroundType('checkerboard')}
                            className={`w-6 h-6 rounded border border-gray-500 focus:outline-none transition-transform hover:scale-110 overflow-hidden ${backgroundType === 'checkerboard' ? 'ring-2 ring-cyan-500 scale-110' : ''}`} 
                            title="Checkerboard (Transparent)"
                        >
                            <div className="w-full h-full bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAIklEQVQYV2NkYGD4z8DAwMgwMoyCQAwMDAwMjAyDQAwM4wA+2wz/m6j50AAAAABJRU5ErkJggg==')]"></div>
                        </button>
                        {['#ffffff', '#808080', '#000000', '#1f2937'].map(bg => (
                            <button key={bg} onClick={() => setBackgroundType(bg)} className={`w-6 h-6 rounded-full border border-gray-500 focus:outline-none transition-transform hover:scale-110 ${backgroundType === bg ? 'ring-2 ring-cyan-500 scale-110' : ''}`} style={{ backgroundColor: bg }} />
                        ))}
                         <input type="color" value={backgroundType !== 'checkerboard' ? backgroundType : '#ffffff'} onChange={(e) => setBackgroundType(e.target.value)} className="w-6 h-6 p-0 rounded-full border-none overflow-hidden cursor-pointer" />
                    </div>
                </div>
             </div>
             
             {/* Tool Settings */}
             {activeTool === 'transform' && (
                <div className="mt-4 space-y-2">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('imageEditor.toolSettings')}</div>
                    <div className="bg-gray-700/50 p-2 rounded space-y-2">
                        <div className="flex items-center space-x-2">
                            <input 
                                type="checkbox" 
                                id="snap-toggle" 
                                checked={isSnappingEnabled} 
                                onChange={(e) => setIsSnappingEnabled(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-500 text-accent focus:ring-accent cursor-pointer"
                            />
                            <label htmlFor="snap-toggle" className="text-xs text-gray-300 cursor-pointer select-none">{t('imageEditor.snapToEdges')}</label>
                        </div>
                         <div className="flex items-center space-x-2">
                            <input 
                                type="checkbox" 
                                id="free-aspect-toggle" 
                                checked={isFreeAspect} 
                                onChange={(e) => setIsFreeAspect(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-500 text-accent focus:ring-accent cursor-pointer"
                            />
                            <label htmlFor="free-aspect-toggle" className="text-xs text-gray-300 cursor-pointer select-none">{t('imageEditor.freeAspect')}</label>
                        </div>
                    </div>
                </div>
             )}

             {/* Brush Settings */}
             {(activeTool === 'pencil' || activeTool === 'rectangle') && (
                 <div className="mt-4 space-y-2">
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Style</label>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {palette.map(color => (
                            <button key={color} onClick={() => setDrawColor(color)} className={`w-6 h-6 rounded-full border ${drawColor === color ? 'border-white ring-1 ring-cyan-500' : 'border-gray-600'}`} style={{ backgroundColor: color }} />
                        ))}
                         <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)} className="w-6 h-6 p-0 rounded-full border-none overflow-hidden cursor-pointer" />
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-400 w-8">Size</span>
                        <input type="range" min="1" max="50" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="flex-grow h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                        <span className="text-xs text-gray-300 w-6 text-right">{brushSize}</span>
                    </div>
                 </div>
             )}

             {/* SPACER */}
             <div className="flex-grow"></div>

             {/* BOTTOM SECTION: AI Tools */}
             <div className="space-y-4 mt-4 border-t border-gray-700 pt-4">
                <div className="space-y-2">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('imageEditor.section.aiRequest')}</div>
                    <textarea 
                        value={modificationPrompt}
                        onChange={(e) => setModificationPrompt(e.target.value)}
                        placeholder={t('imageEditor.input.modificationPlaceholder')}
                        className="w-full p-2 bg-gray-900/50 border border-gray-600 rounded-md text-xs text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none resize-none select-text"
                        rows={3}
                    />
                    <button 
                        onClick={handleRequestModification}
                        disabled={isProcessing || !modificationPrompt.trim()}
                        className="w-full px-3 py-1.5 text-xs font-bold text-white bg-cyan-600 rounded hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                    >
                        {isProcessing ? 'Processing...' : t('imageEditor.action.sendRequest')}
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <ButtonWithTooltip
                        title={t('imageEditor.tooltip.removeObject')}
                        onClick={handleRemoveObject} 
                        disabled={isProcessing}
                        className="text-white bg-red-600 hover:bg-red-700 border border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                        {isProcessing ? '...' : t('imageEditor.action.removeObject')}
                    </ButtonWithTooltip>

                    <ButtonWithTooltip
                        title="Remove background keeping main object"
                        onClick={handleRemoveBackground}
                        disabled={isProcessing}
                        className="text-white bg-teal-600 hover:bg-teal-700 border border-teal-500 shadow-[0_0_15px_rgba(13,148,136,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                         {isProcessing ? '...' : t('imageEditor.action.removeBackground')}
                    </ButtonWithTooltip>
                </div>
             </div>
        </div>
    );
};
