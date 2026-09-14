import React, { useMemo, useState, useEffect } from 'react';
import type { NodeContentProps } from '../../types';
import CustomSelect from '../CustomSelect';
import { useAppContext } from '../../contexts/AppContext';
import { 
    getAvailableVideoModels, 
    getConfiguredVideoModel, 
    isOmniModel,
    LLM_CONFIG_CHANGE_EVENT 
} from '../../services/modelConfig';

export const VideoOutputNode: React.FC<NodeContentProps> = ({ 
    node, 
    isGeneratingVideo, 
    isExecutingChain, 
    onAspectRatioChange, 
    onResolutionChange, 
    onModelChange,
    onDurationChange,
    onUseBatchChange,
    onVideoModeChange,
    onAutoDownloadChange, 
    onGenerateVideo, 
    onStopVideo,
    onStopChainExecution, 
    onExecuteChain, 
    t, 
    isGlobalProcessing 
}) => {
    const appContext = useAppContext();
    const addToast = appContext?.addToast;
    const [availableModels, setAvailableModels] = useState(() => getAvailableVideoModels());

    useEffect(() => {
        const handleConfigChange = () => {
            setAvailableModels(getAvailableVideoModels());
        };
        window.addEventListener(LLM_CONFIG_CHANGE_EVENT, handleConfigChange);
        return () => window.removeEventListener(LLM_CONFIG_CHANGE_EVENT, handleConfigChange);
    }, []);

    const selectedModel = node.model || getConfiguredVideoModel() || 'gemini-omni-1.1-flash';
    const isOmni = isOmniModel(selectedModel);

    const modelOptions = useMemo(() => {
        return availableModels.map(m => ({
            value: m.id,
            label: `${m.name}${m.isOmni ? ' ⚡ (Omni)' : ''}`
        }));
    }, [availableModels]);

    const aspectRatios = isOmni ? ["16:9", "9:16", "1:1"] : ["16:9", "9:16"];
    const resolutions: ('720p' | '1080p')[] = ['720p', '1080p'];
    const durations = [
        { value: '5s', label: '5s' },
        { value: '10s', label: '10s' }
    ];

    const videoModes: Array<{ value: 'text_to_video' | 'image_to_video' | 'video_edit'; label: string; icon: string }> = [
        { value: 'text_to_video', label: t('node.content.videoMode.text_to_video') || 'Text to Video', icon: '📝' },
        { value: 'image_to_video', label: t('node.content.videoMode.image_to_video') || 'Image to Video', icon: '🖼️' },
        { value: 'video_edit', label: t('node.content.videoMode.video_edit') || 'Video Edit', icon: '🎬' }
    ];

    const isBusy = isGeneratingVideo || isExecutingChain;

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!node.value) return;
        const link = document.createElement('a');
        link.href = node.value;
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        link.download = `Video_${node.id.slice(0, 5)}_${date}_${time}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (addToast) addToast(t('toast.downloadSuccess') || 'Video downloaded', 'success');
    };

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!node.value) return;
        try {
            await navigator.clipboard.writeText(node.value);
            if (addToast) addToast(t('toast.copiedToClipboard') || 'Video URL copied to clipboard', 'info');
        } catch (err) {
            console.error("Copy video link failed", err);
        }
    };

    return (
        <div className="flex flex-col h-full w-full min-h-0 justify-between select-none">
            {/* Dynamic Resizable Video Preview Container */}
            <div 
                className="relative w-full flex-1 min-h-[140px] bg-gradient-to-b from-gray-950 to-gray-900 rounded-lg overflow-hidden border border-gray-700/70 shadow-inner group flex items-center justify-center transition-all duration-150"
                onMouseDown={(e) => e.stopPropagation()}
            >
                {node.value ? (
                    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black/60">
                        <video
                            src={node.value}
                            controls
                            playsInline
                            className="object-contain w-full h-full max-h-full"
                        />
                        
                        {/* Hover Overlay Quick Actions */}
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 pointer-events-auto">
                            <button
                                onClick={handleCopy}
                                title={t('node.action.copy') || 'Copy Video URL'}
                                className="p-1.5 rounded-md bg-gray-900/80 hover:bg-cyan-600 text-gray-200 hover:text-white border border-gray-700/80 shadow-md backdrop-blur-sm transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                            <button
                                onClick={handleDownload}
                                title={t('node.action.download') || 'Download MP4'}
                                className="p-1.5 rounded-md bg-gray-900/80 hover:bg-cyan-600 text-gray-200 hover:text-white border border-gray-700/80 shadow-md backdrop-blur-sm transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </button>
                        </div>

                        {/* Video Info Tag */}
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono text-cyan-300 border border-cyan-500/30 opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none">
                            {node.resolution || '720p'} • {node.aspectRatio || '16:9'} {isOmni && `• ${node.duration || '5s'}`}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-gray-500 space-y-2 p-4 text-center">
                        <div className="p-3 rounded-full bg-gray-800/60 border border-gray-700/40 text-gray-400">
                            <svg className="w-7 h-7 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <span className="text-xs font-medium text-gray-400">
                            {t('node.content.previewPlaceholder') || 'Video preview will appear here'}
                        </span>
                        <span className="text-[10px] text-gray-500 max-w-[200px] leading-tight">
                            Connect prompt, reference image, or video inputs
                        </span>
                    </div>
                )}
                
                {/* Active Generation / Processing Overlay */}
                <div className={`absolute inset-0 bg-gray-950/85 backdrop-blur-sm flex flex-col items-center justify-center text-white z-30 transition-opacity duration-300 ${isBusy ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                    <div className="relative flex items-center justify-center mb-3">
                        <div className="absolute w-12 h-12 rounded-full border border-cyan-500/30 animate-ping"></div>
                        <svg className="animate-spin h-9 w-9 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                    <span className="text-xs font-semibold text-cyan-200 tracking-wide">
                        {isExecutingChain ? (t('node.content.processingChain') || 'Executing Chain...') : (t('node.content.generating') || 'Generating Video...')}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-0.5">
                        {selectedModel}
                    </span>
                    {onStopVideo && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onStopVideo(node.id);
                            }}
                            className="mt-3 px-3 py-1 text-xs font-semibold text-red-300 bg-red-950/80 border border-red-700/60 rounded-md hover:bg-red-900 transition-all shadow-sm active:scale-95"
                        >
                            {t('node.action.stop') || 'Cancel Generation'}
                        </button>
                    )}
                </div>
            </div>

            {/* Anchored Controls Section */}
            <div className="flex-shrink-0 space-y-2 mt-2 w-full">
                {/* Video Model Selector */}
                <div>
                    <label htmlFor={`video-model-${node.id}`} className="block text-[11px] font-medium mb-1 text-gray-400 uppercase tracking-wider">
                        {t('node.content.videoModel') || 'Video Model'}
                    </label>
                    <CustomSelect
                        id={`video-model-${node.id}`}
                        value={selectedModel}
                        onChange={(value) => onModelChange && onModelChange(node.id, value)}
                        disabled={isBusy}
                        options={modelOptions}
                    />
                </div>

                {/* Omni Specific: Video Mode Segmented Selector */}
                {isOmni && onVideoModeChange && (
                    <div>
                        <label className="block text-[11px] font-medium mb-1 text-gray-400 uppercase tracking-wider">
                            {t('node.content.videoMode') || 'Generation Mode'}
                        </label>
                        <div className="grid grid-cols-3 gap-1 p-0.5 bg-gray-950/60 rounded-lg border border-gray-800">
                            {videoModes.map((mode) => {
                                const active = (node.videoMode || 'text_to_video') === mode.value;
                                return (
                                    <button
                                        key={mode.value}
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => onVideoModeChange(node.id, mode.value)}
                                        className={`py-1 px-1 rounded-md text-[11px] font-medium transition-all flex items-center justify-center gap-1 truncate ${
                                            active 
                                                ? 'bg-cyan-600 text-white shadow-sm font-semibold' 
                                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                                        } ${isBusy ? 'cursor-not-allowed opacity-60' : ''}`}
                                        title={mode.label}
                                    >
                                        <span>{mode.icon}</span>
                                        <span className="truncate">{mode.label.split(' ')[0]}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Grid for Aspect Ratio, Resolution & Duration */}
                <div className={`grid ${isOmni ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5`}>
                    {/* Aspect Ratio */}
                    <div>
                        <label htmlFor={`aspect-ratio-${node.id}`} className="block text-[11px] font-medium mb-1 text-gray-400">
                            {t('node.content.aspectRatio') || 'Aspect'}
                        </label>
                        <CustomSelect
                            id={`aspect-ratio-${node.id}`}
                            value={node.aspectRatio || '16:9'}
                            onChange={(value) => onAspectRatioChange(node.id, value)}
                            disabled={isBusy}
                            options={aspectRatios.map(ratio => ({ value: ratio, label: ratio }))}
                        />
                    </div>

                    {/* Resolution */}
                    <div>
                        <label htmlFor={`resolution-${node.id}`} className="block text-[11px] font-medium mb-1 text-gray-400">
                            Resolution
                        </label>
                        <CustomSelect
                            id={`resolution-${node.id}`}
                            value={node.resolution || '720p'}
                            onChange={(value) => onResolutionChange(node.id, value as '720p' | '1080p')}
                            disabled={isBusy}
                            options={resolutions.map(res => ({ value: res, label: res }))}
                        />
                    </div>

                    {/* Duration (Omni) */}
                    {isOmni && onDurationChange && (
                        <div>
                            <label htmlFor={`video-duration-${node.id}`} className="block text-[11px] font-medium mb-1 text-gray-400">
                                {t('node.content.duration') || 'Duration'}
                            </label>
                            <CustomSelect
                                id={`video-duration-${node.id}`}
                                value={node.duration || '5s'}
                                onChange={(value) => onDurationChange(node.id, value)}
                                disabled={isBusy}
                                options={durations}
                            />
                        </div>
                    )}
                </div>

                {/* Batch API Mode Toggle Switch (AI Image Editor Style) */}
                {onUseBatchChange && (
                    <div 
                        onClick={() => {
                            if (!isBusy) onUseBatchChange(node.id, !node.useBatch);
                        }}
                        className={`p-2 rounded-lg border cursor-pointer select-none transition-all ${
                            node.useBatch 
                                ? 'bg-gray-900 border-gray-700 text-gray-200 shadow-sm' 
                                : 'bg-gray-800/40 border-gray-700/50 hover:border-gray-600 text-gray-300'
                        } ${isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-medium">
                                <span className={`w-2 h-2 rounded-full ${node.useBatch ? 'bg-accent-secondary animate-pulse' : 'bg-gray-500'}`}></span>
                                <span>{t('batch.mode') || 'Batch API Mode'}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-800 text-accent-secondary border border-gray-700 font-mono font-semibold">
                                    -50% Cost
                                </span>
                            </div>
                            <div className={`w-8 h-4 rounded-full relative transition-colors flex-shrink-0 ${node.useBatch ? 'bg-accent-secondary' : 'bg-gray-600'}`}>
                                <div className={`absolute top-0.5 bottom-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 ${node.useBatch ? 'translate-x-[16px]' : 'translate-x-[2px]'}`}></div>
                            </div>
                        </div>
                        <div className={`mt-1.5 text-[11px] leading-tight flex items-start gap-1 transition-colors ${
                            node.useBatch ? 'text-accent-secondary font-medium' : 'text-gray-400'
                        }`}>
                            <span className={node.useBatch ? '' : 'opacity-70'}>⏳</span>
                            <span>{t('batch.statusDelayed') || 'Batch API Active (Delayed ~24h, -50% cost)'}</span>
                        </div>
                    </div>
                )}

                {/* Auto Download Toggle Switch (AI Image Editor Style) */}
                <div 
                    onClick={() => {
                        if (!isBusy) onAutoDownloadChange(node.id, !node.autoDownload);
                    }}
                    className={`h-[34px] flex items-center justify-between px-2.5 rounded-lg border cursor-pointer transition-all select-none ${
                        node.autoDownload 
                            ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200 shadow-sm' 
                            : 'bg-gray-800/40 border-gray-700/50 hover:border-gray-600 text-gray-300'
                    } ${isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <div className="flex items-center gap-2 text-xs font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>{t('node.content.autoDownload') || 'Auto Download'}</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full relative transition-colors flex-shrink-0 ${node.autoDownload ? 'bg-cyan-500' : 'bg-gray-600'}`}>
                        <div className={`absolute top-0.5 bottom-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 ${node.autoDownload ? 'translate-x-[16px]' : 'translate-x-[2px]'}`}></div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-0.5">
                    {isGeneratingVideo ? (
                        <button
                            type="button"
                            onClick={() => onStopVideo && onStopVideo(node.id)}
                            className="w-1/2 px-3 h-[36px] font-bold text-xs text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow-md shadow-red-950/40"
                        >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span>{t('node.action.stop') || 'Stop'}</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onGenerateVideo(node.id)}
                            disabled={isBusy}
                            className={`w-1/2 px-3 h-[36px] font-bold text-xs text-white rounded-lg disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-1.5 shadow-md ${
                                node.useBatch
                                    ? 'bg-accent-secondary hover:bg-accent-secondary-hover active:bg-accent-secondary shadow-md'
                                    : 'bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 shadow-cyan-950/40'
                            }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="truncate">Generate Video</span>
                        </button>
                    )}

                    {isExecutingChain ? (
                        <button
                            type="button"
                            onClick={onStopChainExecution}
                            className="w-1/2 px-3 h-[36px] font-bold text-xs text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all flex items-center justify-center space-x-1 shadow-md shadow-red-950/40"
                            title="Остановить выполнение цепочки"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span>Stop Chain</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onExecuteChain(node.id)}
                            disabled={isBusy}
                            className="w-1/2 px-3 h-[36px] font-bold text-xs text-white bg-teal-600 hover:bg-teal-500 active:bg-teal-700 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow-md shadow-teal-950/40"
                            title={t('node.action.executeChainTitle') || 'Execute Chain'}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span>{t('node.action.executeChain') || 'Chain'}</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
