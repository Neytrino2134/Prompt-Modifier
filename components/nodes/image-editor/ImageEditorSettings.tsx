
import React, { useMemo } from 'react';
import CustomSelect from '../../CustomSelect';
import { DebouncedTextarea } from '../../DebouncedTextarea';
import { ImageEditorState } from './types';
import { CustomCheckbox } from '../../CustomCheckbox';
import { useAppContext } from '../../../contexts/AppContext';

interface ImageEditorSettingsProps {
    state: ImageEditorState;
    onUpdateState: (updates: Partial<ImageEditorState>) => void;
    onCleanupInputB: () => void;
    isEditing: boolean;
    t: (key: string) => string;
    nodeId: string;
    deselectAllNodes: () => void;
}

export const ImageEditorSettings: React.FC<ImageEditorSettingsProps> = ({
    state,
    onUpdateState,
    onCleanupInputB,
    isEditing,
    t,
    nodeId,
    deselectAllNodes
}) => {
    const { isSequenceMode, isSequentialCombinationMode, isSequentialPromptMode, isSequentialEditingWithPrompts, enableAspectRatio, aspectRatio, enableOutpainting } = state;
    const { isBatchMode, setIsBatchMode } = useAppContext();

    const aspectRatioOptionsWithIcons = useMemo(() => [
        { value: 'Auto', label: 'Auto', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg> },
        { value: "1:1", label: "1:1", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="1" /></svg> },
        { value: "16:9", label: "16:9", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="8" width="20" height="8" rx="1" /></svg> },
        { value: "9:16", label: "9:16", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="8" y="2" width="8" height="20" rx="1" /></svg> },
        { value: "4:3", label: "4:3", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="6" width="18" height="12" rx="1" /></svg> },
        { value: "3:4", label: "3:4", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="3" width="12" height="18" rx="1" /></svg> }
    ], []);

    return (
        <div className="flex-shrink-0 space-y-2.5">
            {/* Batch API Synchronized Mode Toggle & Status Indicator */}
            <div 
                onClick={() => {
                    if (!isEditing) setIsBatchMode(!isBatchMode);
                }}
                className={`p-2 rounded-md border cursor-pointer select-none transition-all ${
                    isBatchMode 
                        ? 'bg-gray-900 border-gray-700 text-gray-200' 
                        : 'bg-gray-800/40 border-gray-700/50 hover:border-gray-600 text-gray-300'
                } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium">
                        <span className={`w-2 h-2 rounded-full ${isBatchMode ? 'bg-accent-secondary animate-pulse' : 'bg-gray-500'}`}></span>
                        <span>{t('batch.mode') || 'Batch API Mode'}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-800 text-accent-secondary border border-gray-700 font-mono font-semibold">
                            -50% Cost
                        </span>
                    </div>
                    <div className={`w-8 h-4 rounded-full relative transition-colors flex-shrink-0 ${isBatchMode ? 'bg-accent-secondary' : 'bg-gray-600'}`}>
                        <div className={`absolute top-0.5 bottom-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 ${isBatchMode ? 'translate-x-[16px]' : 'translate-x-[2px]'}`}></div>
                    </div>
                </div>
                <div className={`mt-1.5 text-[11px] leading-tight flex items-start gap-1 transition-colors ${
                    isBatchMode ? 'text-accent-secondary font-medium' : 'text-gray-400'
                }`}>
                    <span className={isBatchMode ? '' : 'opacity-70'}>⏳</span>
                    <span>{t('batch.statusDelayed') || 'Batch API Active (Delayed ~24h, -50% cost)'}</span>
                </div>
            </div>

            <div className="flex flex-col space-y-2">
                <div 
                    onClick={() => {
                        if (isEditing) return;
                        const checked = !isSequenceMode;
                        if (!checked) onCleanupInputB(); 
                        onUpdateState({ isSequenceMode: checked }); 
                    }}
                    className={`p-2.5 rounded-md border cursor-pointer select-none transition-all ${
                        isSequenceMode 
                            ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-100 shadow-[0_0_10px_rgba(99,102,241,0.15)]' 
                            : 'bg-gray-800/40 border-gray-700/50 hover:border-gray-600 hover:bg-gray-800 text-gray-300'
                    } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-medium">
                            <span className={`w-2 h-2 rounded-full ${isSequenceMode ? 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]' : 'bg-gray-500'}`}></span>
                            <span>{t('imageEditor.sequenceMode')}</span>
                        </div>
                        <div className={`w-8 h-4 rounded-full relative transition-colors flex-shrink-0 ${isSequenceMode ? 'bg-indigo-500' : 'bg-gray-600'}`}>
                            <div className={`absolute top-0.5 bottom-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 ${isSequenceMode ? 'translate-x-[16px]' : 'translate-x-[2px]'}`}></div>
                        </div>
                    </div>
                    <div className={`mt-2 text-[10.5px] leading-snug ${isSequenceMode ? 'text-indigo-200/90' : 'text-gray-400'}`}>
                        {t('imageEditor.sequenceModeHelp')}
                    </div>
                </div>
                
                {isSequenceMode && (
                    <div className="ml-6 flex flex-col space-y-1.5">
                        <CustomCheckbox
                            id={`seq-combo-toggle-${nodeId}`}
                            checked={isSequentialCombinationMode}
                            onChange={(checked) => {
                                if (!checked) {
                                    onCleanupInputB();
                                    onUpdateState({ 
                                        isSequentialCombinationMode: false, 
                                        isSequentialEditingWithPrompts: false // Must turn off editing mode
                                    }); 
                                } else {
                                    onUpdateState({ isSequentialCombinationMode: true }); 
                                }
                            }}
                            disabled={isEditing}
                            label={t('imageEditor.sequentialCombination')}
                            title={t('imageEditor.sequentialCombinationHelp')}
                        />
                        <CustomCheckbox
                            id={`seq-prompt-toggle-${nodeId}`}
                            checked={isSequentialPromptMode}
                            onChange={(checked) => onUpdateState({ isSequentialPromptMode: checked })}
                            disabled={isEditing}
                            label={t('imageEditor.sequentialPrompt')}
                            title={t('imageEditor.sequentialPromptHelp')}
                        />
                        <CustomCheckbox
                            id={`seq-edit-prompts-toggle-${nodeId}`}
                            checked={isSequentialEditingWithPrompts}
                            onChange={(checked) => {
                                if (checked) {
                                    // This mode is exclusive/dominant over Combination Mode regarding inputs
                                    onUpdateState({ 
                                        isSequentialEditingWithPrompts: true, 
                                        isSequentialCombinationMode: false,
                                        isSequentialPromptMode: true // Implicitly true as it's the core of this mode
                                    }); 
                                } else {
                                    onUpdateState({ isSequentialEditingWithPrompts: false });
                                }
                            }}
                            disabled={isEditing}
                            label={t('imageEditor.sequentialEditingWithPrompts')}
                            title={t('imageEditor.sequentialEditingWithPromptsHelp')}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

