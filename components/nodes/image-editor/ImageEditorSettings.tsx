
import React, { useMemo } from 'react';
import CustomSelect from '../../CustomSelect';
import { DebouncedTextarea } from '../../DebouncedTextarea';
import { ImageEditorState } from './types';
import { CustomCheckbox } from '../../CustomCheckbox';

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
    const { isSequenceMode, isSequentialCombinationMode, isSequentialPromptMode, isSequentialEditingWithPrompts, enableAspectRatio, aspectRatio, enableOutpainting, outpaintingPrompt } = state;

    const aspectRatioOptionsWithIcons = useMemo(() => [
        { value: 'Auto', label: 'Auto', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg> },
        { value: "1:1", label: "1:1", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="1" /></svg> },
        { value: "16:9", label: "16:9", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="8" width="20" height="8" rx="1" /></svg> },
        { value: "9:16", label: "9:16", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="8" y="2" width="8" height="20" rx="1" /></svg> },
        { value: "4:3", label: "4:3", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="6" width="18" height="12" rx="1" /></svg> },
        { value: "3:4", label: "3:4", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="3" width="12" height="18" rx="1" /></svg> }
    ], []);

    return (
        <div className="flex-shrink-0 space-y-2">
            <div className="flex flex-col space-y-2">
                <CustomCheckbox
                    id={`sequence-mode-toggle-${nodeId}`}
                    checked={isSequenceMode}
                    onChange={(checked) => {
                        if (!checked) onCleanupInputB(); 
                        onUpdateState({ isSequenceMode: checked }); 
                    }}
                    disabled={isEditing}
                    label={t('imageEditor.sequenceMode')}
                    title={t('imageEditor.sequenceModeHelp')}
                />
                
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

            <CustomCheckbox
                id={`aspect-ratio-toggle-${nodeId}`}
                checked={enableAspectRatio}
                onChange={(checked) => { 
                    onUpdateState({ enableAspectRatio: checked, aspectRatio: 'Auto', enableOutpainting: checked ? enableOutpainting : false }); 
                }}
                label={t('node.content.enableAspectRatioFormatting')}
            />
            
            {enableAspectRatio && (
                <>
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">{t('node.content.aspectRatio')}</label>
                        <CustomSelect value={aspectRatio || '1:1'} onChange={(v) => onUpdateState({ aspectRatio: v })} disabled={isEditing} options={aspectRatioOptionsWithIcons} />
                    </div>
                </>
            )}
        </div>
    );
};
