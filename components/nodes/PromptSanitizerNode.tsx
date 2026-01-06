
import React from 'react';
import type { NodeContentProps } from '../../types';

export const PromptSanitizerNode: React.FC<NodeContentProps> = ({ node, onSanitize, isSanitizing, t, onSelectNode }) => (
    <div className="flex flex-col h-full">
        <div className="relative flex-grow min-h-0 mb-2">
            <textarea
                readOnly
                value={node.value}
                placeholder={t('node.content.sanitizedPromptHere')}
                className="absolute inset-0 w-full h-full p-2 bg-gray-700 border-none rounded-md resize-none focus:outline-none"
                onWheel={e => e.stopPropagation()}
                onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}
            />
        </div>
        <button
            onClick={() => onSanitize(node.id)}
            disabled={isSanitizing}
            className="w-full px-4 py-2 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
        >
            {isSanitizing ? t('node.content.sanitizing') : t('node.action.sanitize')}
        </button>
    </div>
);
