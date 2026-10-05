import React from 'react';
import { useLanguage } from '../../../localization';
import { Zap, Terminal, Link, Unlink, Layers, Box, Square } from 'lucide-react';

interface ThreeDHeaderProps {
    isApiKeyMissing: boolean;
    mode: 'image_to_3d' | 'multiview_to_3d';
    onModeChange: (mode: 'image_to_3d' | 'multiview_to_3d') => void;
    onBakeAndDisconnect: () => void;
    hasIncomingConnections: boolean;
    canBake: boolean;
    isTripoConfigured: boolean;
    tripoBalance: number | null;
    isBalanceLoading: boolean;
    onRefreshBalance: () => void;
    activeTab: 'preview3d' | 'rendered';
    onTabChange: (tab: 'preview3d' | 'rendered') => void;
    onOpenDebugConsole?: () => void;
    // Batch Mode Toggle
    isBatchMode?: boolean;
    onToggleBatchMode?: (isBatch: boolean) => void;
    isBatchRunning?: boolean;
}

const ThreeDHeaderComponent: React.FC<ThreeDHeaderProps> = ({
    isApiKeyMissing,
    mode,
    onModeChange,
    onBakeAndDisconnect,
    hasIncomingConnections,
    canBake,
    isTripoConfigured,
    tripoBalance,
    isBalanceLoading,
    onRefreshBalance,
    activeTab,
    onTabChange,
    onOpenDebugConsole,
    isBatchMode = false,
    onToggleBatchMode,
    isBatchRunning = false,
}) => {
    const { t } = useLanguage();

    return (
        <>
            {/* API Warning Notice if not enabled or no key */}
            {isApiKeyMissing && (
                <div className="bg-amber-950/80 border-b border-amber-600/40 p-2 px-3 text-amber-200 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>{t('threed.apiKeyMissing') || 'Tripo AI API key is not configured or disabled in Settings.'}</span>
                    </div>
                </div>
            )}

            {/* Mode & Navigation Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-800/80 border-b border-gray-700/60 flex-wrap gap-2">
                {/* Mode Selector & Chain Link/Disconnect button */}
                <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 bg-gray-900/90 p-0.5 rounded-md border border-gray-700/50">
                        <button
                            onClick={() => onModeChange('multiview_to_3d')}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                                mode === 'multiview_to_3d'
                                    ? 'bg-cyan-600 text-white shadow-sm'
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                            }`}
                            title="Multiview images (Front, Back, Left, Right) to 3D model"
                        >
                            {t('threed.mode.multiviewTo3d') || 'Multiview to 3D (4 Views)'}
                        </button>
                        <button
                            onClick={() => onModeChange('image_to_3d')}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                                mode === 'image_to_3d'
                                    ? 'bg-cyan-600 text-white shadow-sm'
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                            }`}
                            title="Single image to 3D model"
                        >
                            {t('threed.mode.imageTo3d') || 'Image to 3D (1 Image)'}
                        </button>
                    </div>

                    {/* Chain/Unlink Icon: Disconnect connecting lines & embed images into 3D node */}
                    <button
                        type="button"
                        onClick={onBakeAndDisconnect}
                        disabled={!canBake}
                        className={`p-1.5 rounded transition-all flex items-center justify-center border ${
                            hasIncomingConnections
                                ? 'bg-cyan-950/80 hover:bg-cyan-900 border-cyan-500/70 text-cyan-300 shadow-sm'
                                : 'bg-gray-900/60 hover:bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
                        }`}
                        title={
                            hasIncomingConnections
                                ? "Разорвать входящие соединительные линии и встроить (запечь) изображения в 3D ноду"
                                : "Встроить текущие входные изображения в 3D ноду"
                        }
                    >
                        {hasIncomingConnections ? <Unlink className="w-3.5 h-3.5 text-cyan-300" /> : <Link className="w-3.5 h-3.5" />}
                    </button>
                </div>

                {/* View Switcher: 3D Single View vs 3D Batch Dashboard vs 2D Render */}
                <div className="flex items-center space-x-1">
                    {/* Batch Mode Switcher Button */}
                    {onToggleBatchMode && (
                        <button
                            type="button"
                            onClick={() => onToggleBatchMode(!isBatchMode)}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center space-x-1.5 border ${
                                isBatchMode 
                                    ? 'bg-purple-700 text-white border-purple-500 shadow-md shadow-purple-950/50' 
                                    : 'bg-gray-900/80 text-gray-300 hover:text-white hover:bg-gray-800 border-gray-700/60'
                            }`}
                            title={isBatchMode ? "Выйти из Batch режима в обычный просмотр" : "Переключить в режим пакетной генерации 3D (Batch)"}
                        >
                            <Layers className={`w-3.5 h-3.5 ${isBatchMode ? 'text-yellow-300' : 'text-purple-400'}`} />
                            <span>3D Batch Mode</span>
                            {isBatchRunning && (
                                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                            )}
                        </button>
                    )}

                    {/* Tripo Token / Credit Balance Badge */}
                    {isTripoConfigured && tripoBalance !== null && (
                        <button
                            type="button"
                            onClick={onRefreshBalance}
                            disabled={isBalanceLoading}
                            className="flex items-center space-x-1 px-2 py-1 bg-yellow-950/70 border border-yellow-600/50 hover:border-yellow-400/80 rounded text-yellow-300 hover:text-yellow-100 hover:bg-yellow-900/80 transition-all text-[11px] font-mono shadow-sm"
                            title="Баланс токенов Tripo 3D • Нажмите для обновления"
                        >
                            <Zap className={`w-3 h-3 text-yellow-400 ${isBalanceLoading ? 'animate-spin' : ''}`} />
                            <span className="font-semibold">{tripoBalance}</span>
                            <span className="text-[10px] text-yellow-400/80">cr</span>
                        </button>
                    )}

                    {!isBatchMode && (
                        <>
                            <button
                                onClick={() => onTabChange('preview3d')}
                                className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center space-x-1 ${
                                    activeTab === 'preview3d'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                                }`}
                            >
                                <Box className="h-3.5 w-3.5" />
                                <span>{t('threed.tab.preview3d') || '3D Preview'}</span>
                            </button>
                            <button
                                onClick={() => onTabChange('rendered')}
                                className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center space-x-1 ${
                                    activeTab === 'rendered'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                                }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth={2}></rect>
                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                    <path d="M21 15l-5-5L5 21" strokeWidth={2}></path>
                                </svg>
                                <span>{t('threed.tab.rendered') || 'Render 2D'}</span>
                            </button>
                        </>
                    )}

                    {/* Logs & Diagnostics Console Button */}
                    {onOpenDebugConsole && (
                        <button
                            type="button"
                            onClick={onOpenDebugConsole}
                            className="px-2 py-1 rounded text-xs font-medium text-gray-400 hover:text-cyan-300 hover:bg-gray-700/50 flex items-center space-x-1 transition-colors border border-gray-700/40"
                            title="Открыть системные логи и консоль отладки"
                        >
                            <Terminal className="w-3.5 h-3.5" />
                            <span>Логи</span>
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

export const ThreeDHeader = React.memo(ThreeDHeaderComponent);
