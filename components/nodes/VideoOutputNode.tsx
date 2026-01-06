
import React from 'react';
import type { NodeContentProps } from '../../types';
import CustomSelect from '../CustomSelect';

export const VideoOutputNode: React.FC<NodeContentProps> = ({ node, isGeneratingVideo, isExecutingChain, onAspectRatioChange, onResolutionChange, onAutoDownloadChange, onGenerateVideo, onStopChainExecution, onExecuteChain, t, isGlobalProcessing }) => {
    const aspectRatios = ["16:9", "9:16"];
    const resolutions: ('720p' | '1080p')[] = ['720p', '1080p'];
    
    return (
        <div className="flex flex-col h-full">
            <div className="relative w-full flex-grow bg-gray-700 rounded-md flex items-center justify-center overflow-hidden mb-2">
                {node.value ? (
                    <video
                        src={node.value}
                        controls
                        className="object-contain w-full h-full"
                    />
                ) : (
                    <span className="text-gray-400">Video will appear here</span>
                )}
                <div className={`absolute inset-0 bg-gray-800/70 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10 transition-opacity duration-300 ${(isGeneratingVideo || (isExecutingChain && !node.value)) ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="mt-2 font-semibold">{isExecutingChain ? t('node.content.processingChain') : t('node.content.generating')}</span>
                </div>
            </div>
             <div className="mb-2">
                <label htmlFor={`aspect-ratio-${node.id}`} className={`block text-xs font-medium mb-1 text-gray-400`}>
                    {t('node.content.aspectRatio')}
                </label>
                <CustomSelect
                    id={`aspect-ratio-${node.id}`}
                    value={node.aspectRatio || '16:9'}
                    onChange={(value) => onAspectRatioChange(node.id, value)}
                    disabled={isGeneratingVideo || isExecutingChain}
                    options={aspectRatios.map(ratio => ({ value: ratio, label: ratio }))}
                />
            </div>
             <div className="mb-2">
                <label htmlFor={`resolution-${node.id}`} className={`block text-xs font-medium mb-1 text-gray-400`}>
                    Resolution
                </label>
                <CustomSelect
                    id={`resolution-${node.id}`}
                    value={node.resolution || '720p'}
                    onChange={(value) => onResolutionChange(node.id, value as '720p' | '1080p')}
                    disabled={isGeneratingVideo || isExecutingChain}
                    options={resolutions.map(res => ({ value: res, label: res }))}
                />
            </div>
            <div className="flex items-center space-x-2 mb-2">
                <input
                    type="checkbox"
                    id={`auto-download-toggle-${node.id}`}
                    checked={!!node.autoDownload}
                    onChange={(e) => onAutoDownloadChange(node.id, e.target.checked)}
                    disabled={isGeneratingVideo || isExecutingChain}
                    className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent bg-gray-700 cursor-pointer"
                    onMouseDown={(e) => e.stopPropagation()}
                />
                <label htmlFor={`auto-download-toggle-${node.id}`} className="text-sm text-gray-300 select-none cursor-pointer">
                    {t('node.content.autoDownload')}
                </label>
            </div>
            <div className="flex space-x-2">
                <button
                    onClick={() => onGenerateVideo(node.id)}
                    disabled={isGeneratingVideo || isExecutingChain || isGlobalProcessing}
                    className="w-1/2 px-4 py-2 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
                >
                    {isGeneratingVideo ? t('node.content.generating') : 'Generate Video'}
                </button>
                {isExecutingChain ? (
                    <button
                        onClick={onStopChainExecution}
                        className="w-1/2 px-4 py-2 font-bold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors duration-200 flex items-center justify-center space-x-2"
                        title="Остановить выполнение"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>Stop</span>
                    </button>
                ) : (
                    <button
                        onClick={() => onExecuteChain(node.id)}
                        disabled={isGeneratingVideo || isExecutingChain || isGlobalProcessing}
                        className="w-1/2 px-4 py-2 font-bold text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2"
                        title={t('node.action.executeChainTitle')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{t('node.action.executeChain')}</span>
                    </button>
                )}
            </div>
        </div>
    );
};
