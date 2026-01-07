
import React from 'react';
import { ToolButton } from './SharedUI';
import { useLanguage } from '../../localization';
import { EyedropperIcon } from '../icons/AppIcons'; // Import icon

interface EditorFloatingToolbarProps {
    activeTool: string;
    setActiveTool: (t: any) => void;
    onFit: () => void;
    onFill: () => void;
    onFlip: () => void;
}

export const EditorFloatingToolbar: React.FC<EditorFloatingToolbarProps> = ({
    activeTool,
    setActiveTool,
    onFit,
    onFill,
    onFlip
}) => {
    const { t } = useLanguage();

    return (
        <>
            {/* Left Toolbar */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-20 bg-gray-900/80 backdrop-blur-sm p-1.5 rounded-lg border border-gray-700 shadow-lg">
                 <ToolButton 
                     title={t('imageEditor.tool.transform')} 
                     onClick={() => setActiveTool('transform')} 
                     active={activeTool === 'transform'} 
                     icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>}
                 />
                 <ToolButton 
                     title={t('imageEditor.tool.hand')} 
                     onClick={() => setActiveTool('hand')} 
                     active={activeTool === 'hand'} 
                     icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" /></svg>}
                 />
                 <ToolButton 
                     title={t('imageEditor.tool.zoom')} 
                     onClick={() => setActiveTool('zoom')} 
                     active={activeTool === 'zoom'} 
                     icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" /></svg>}
                 />
                 <div className="w-full h-px bg-gray-700 my-1"></div>
                 <ToolButton 
                     title={t('imageEditor.tool.pencil')} 
                     onClick={() => setActiveTool('pencil')} 
                     active={activeTool === 'pencil'} 
                     icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>}
                 />
                 <ToolButton 
                     title={t('imageEditor.tool.rectangle')} 
                     onClick={() => setActiveTool('rectangle')} 
                     active={activeTool === 'rectangle'} 
                     icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /></svg>}
                 />
                 <ToolButton 
                     title="Eyedropper"
                     onClick={() => setActiveTool('eyedropper')} 
                     active={activeTool === 'eyedropper'} 
                     icon={<EyedropperIcon className="h-5 w-5" />}
                 />
            </div>

            {/* Top Center Toolbar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 z-20 bg-gray-900/80 backdrop-blur-sm p-1.5 rounded-lg border border-gray-700 shadow-lg">
                <ToolButton 
                    title={t('imageEditor.action.fit')}
                    onClick={onFit}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25" /></svg>}
                    tooltipPosition="bottom"
                />
                <ToolButton 
                    title={t('imageEditor.action.fill')}
                    onClick={onFill}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>}
                    tooltipPosition="bottom"
                />
                 <ToolButton 
                    title={t('node.action.flipImage')}
                    onClick={onFlip}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>}
                    tooltipPosition="bottom"
                />
            </div>
        </>
    );
};
