import React from 'react';
import { useLanguage } from '../../../localization';
import { Terminal } from 'lucide-react';

interface ThreeDFooterProps {
    isGenerating: boolean;
    localStatusMsg: string;
    localProgress: number;
    errorMessage?: string;
    onDismissError: () => void;
    onOpenDebugConsole?: () => void;
    modelUrl?: string;
    taskId?: string;
    isApiKeyMissing: boolean;
    onDownloadGlb: () => void;
    onCancel: () => void;
    onGenerate: () => void;
}

export const ThreeDFooter: React.FC<ThreeDFooterProps> = ({
    isGenerating,
    localStatusMsg,
    localProgress,
    errorMessage,
    onDismissError,
    onOpenDebugConsole,
    modelUrl,
    taskId,
    isApiKeyMissing,
    onDownloadGlb,
    onCancel,
    onGenerate
}) => {
    const { t } = useLanguage();

    return (
        <div className="p-3 bg-gray-900 border-t border-gray-800 flex flex-col space-y-2 shrink-0 relative z-20">
            {/* Status Bar / Progress Bar */}
            {isGenerating && (
                <div className="flex flex-col space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="text-cyan-400 font-medium animate-pulse">{localStatusMsg || 'Generating 3D model...'}</span>
                        <span className="text-gray-400 font-mono">{localProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-950 rounded-full h-1.5 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full transition-all duration-300"
                            style={{ width: `${localProgress}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {errorMessage && !isGenerating && (
                <div className="text-[11px] text-red-300 bg-red-950/60 p-2 rounded border border-red-800/80 flex flex-col gap-1.5 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-1.5 min-w-0">
                            <span className="text-red-400 font-bold shrink-0">⚠️ Ошибка:</span>
                            <span className="break-words font-medium">{errorMessage}</span>
                        </div>
                        <button 
                            onClick={onDismissError} 
                            className="text-red-400 hover:text-white p-0.5 rounded hover:bg-red-900/50 shrink-0"
                            title="Закрыть"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-red-900/50">
                        <span className="text-[10px] text-red-400/80">Проверьте API ключ в Настройках или консоль логов</span>
                        {onOpenDebugConsole && (
                            <button
                                type="button"
                                onClick={onOpenDebugConsole}
                                className="text-[10px] px-2 py-0.5 bg-red-900/80 hover:bg-red-800 text-red-100 rounded border border-red-700 font-semibold transition-colors flex items-center gap-1 shadow-sm"
                            >
                                <Terminal className="w-3 h-3" />
                                <span>Открыть логи</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-2">
                    {modelUrl && (
                        <button
                            onClick={onDownloadGlb}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-medium text-xs flex items-center space-x-1.5 transition-colors shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>{t('threed.downloadGlb') || 'Download .GLB'}</span>
                        </button>
                    )}
                    {taskId && (
                        <span className="text-[10px] text-gray-500 font-mono">
                            Task: {taskId.slice(0, 8)}...
                        </span>
                    )}
                </div>

                <div className="flex items-center space-x-2">
                    {isGenerating ? (
                        <button
                            onClick={onCancel}
                            className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded font-medium text-xs transition-colors"
                        >
                            {t('threed.cancel') || 'Cancel'}
                        </button>
                    ) : (
                        <button
                            onClick={onGenerate}
                            disabled={isApiKeyMissing}
                            className={`px-4 py-1.5 rounded font-medium text-xs flex items-center space-x-1.5 transition-all shadow-md ${
                                isApiKeyMissing
                                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white hover:shadow-cyan-500/20'
                            }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                            </svg>
                            <span>{t('threed.generate') || 'Generate 3D Model'}</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
