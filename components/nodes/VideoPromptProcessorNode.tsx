
import React, { useMemo } from 'react';
import type { NodeContentProps } from '../../types';
import { DebouncedTextarea } from '../DebouncedTextarea';

export const VideoPromptProcessorNode: React.FC<NodeContentProps> = ({ node, onValueChange, onEnhanceVideo, isEnhancingVideo, onProcessChainForward, isExecutingChain, t, onSelectNode, connectedInputs, getUpstreamNodeValues }) => {
    
    const parsedValue = useMemo(() => {
        try {
            const parsed = JSON.parse(node.value || '{}');
            if (typeof parsed === 'object' && parsed !== null) {
                // If it's the old format (just string in node.value usually, but here we handle JSON)
                return { 
                    inputPrompt: parsed.inputPrompt || '',
                    prompt: parsed.prompt || parsed.value || '' // Handle fallback if saved differently
                };
            }
            // Fallback for simple string value
            return { inputPrompt: '', prompt: node.value || '' };
        } catch {
             return { inputPrompt: '', prompt: node.value || '' };
        }
    }, [node.value]);

    const isInputConnected = connectedInputs?.has(undefined);

    const upstreamText = useMemo(() => {
        if (!isInputConnected) return '';
        const values = getUpstreamNodeValues(node.id);
        return values.filter(v => typeof v === 'string').join(', ');
    }, [isInputConnected, getUpstreamNodeValues, node.id, node.value]);

    const handleInputChange = (newInput: string) => {
        onValueChange(node.id, JSON.stringify({
            ...parsedValue,
            inputPrompt: newInput
        }));
    };

    return (
        <div className="flex flex-col h-full space-y-2">
            {/* Input Section */}
             <div className="flex-1 flex flex-col min-h-0">
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">
                    {isInputConnected ? t('node.content.connectedPlaceholder') : 'Input Prompt'}
                </label>
                <DebouncedTextarea
                    value={isInputConnected ? upstreamText : parsedValue.inputPrompt}
                    onDebouncedChange={handleInputChange}
                    placeholder={t('node.content.editPromptPlaceholder')}
                    className={`w-full h-full p-2 bg-input border-none rounded-md resize-none focus:ring-2 focus:ring-cyan-500 focus:outline-none ${isInputConnected ? 'text-gray-400 cursor-not-allowed' : 'text-white'}`}
                    onWheel={e => e.stopPropagation()}
                    onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}
                    readOnly={isInputConnected}
                />
            </div>

            {/* Output Section */}
            <div className="flex-1 flex flex-col min-h-0">
                 <label className="text-[10px] font-bold text-cyan-400 uppercase mb-1">
                    Video Prompt
                </label>
                <textarea
                    readOnly
                    value={parsedValue.prompt}
                    placeholder={t('node.content.enhancedPromptHere')}
                    className="w-full h-full p-2 bg-input border-none rounded-md resize-none focus:outline-none"
                    onWheel={e => e.stopPropagation()}
                    onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}
                />
            </div>
            
            <div className="flex space-x-2 pt-1">
                <button
                    onClick={() => onEnhanceVideo(node.id)}
                    disabled={isEnhancingVideo || isExecutingChain}
                    className="w-1/2 px-4 py-2 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
                >
                    {isEnhancingVideo ? t('node.content.enhancing') : t('node.content.enhancePrompt')}
                </button>
                <button
                    onClick={() => onProcessChainForward(node.id)}
                    disabled={isEnhancingVideo || isExecutingChain}
                    className="w-1/2 px-4 py-2 font-bold text-white bg-accent-secondary rounded-md hover:bg-accent-secondary-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    <span>{isExecutingChain ? t('node.content.processingChain') : t('node.action.processChainForward')}</span>
                </button>
            </div>
        </div>
    );
};
