import React, { useState } from 'react';
import { ViewingJsonlData } from './types';

interface JsonlInspectorModalProps {
    viewingJsonl: ViewingJsonlData;
    onClose: () => void;
    downloadBatchJsonl?: (jobId: string) => void;
    addToast?: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
}

export const JsonlInspectorModal: React.FC<JsonlInspectorModalProps> = ({
    viewingJsonl,
    onClose,
    downloadBatchJsonl,
    addToast
}) => {
    const [copiedJsonl, setCopiedJsonl] = useState(false);

    return (
        <div 
            className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div 
                className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden text-gray-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950/60">
                    <div className="flex items-center gap-2 truncate">
                        <span className="text-accent-secondary font-mono text-sm">📄</span>
                        <h3 className="text-sm font-semibold text-gray-100">
                            JSONL Batch Request
                        </h3>
                        <span className="text-xs text-gray-500 font-mono truncate">
                            ({viewingJsonl.name})
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 flex-1 overflow-y-auto font-mono text-xs leading-relaxed space-y-3">
                    <p className="text-gray-400 text-[11px]">
                        Фактическая строка JSONL, отправляемая в OpenAI Batch API (endpoint /v1/images/edits или /v1/images/generations):
                    </p>
                    <div className="relative">
                        <pre className="p-3 rounded-lg bg-gray-950 border border-gray-800 text-accent-secondary text-[11px] overflow-x-auto whitespace-pre-wrap break-all max-h-96 select-all">
                            {viewingJsonl.content}
                        </pre>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 bg-gray-950/40">
                    <button
                        onClick={() => {
                            if (downloadBatchJsonl) {
                                downloadBatchJsonl(viewingJsonl.id);
                            }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Скачать .jsonl</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(viewingJsonl.content);
                                setCopiedJsonl(true);
                                if (addToast) addToast('Строка JSONL скопирована в буфер обмена!', 'success');
                                setTimeout(() => setCopiedJsonl(false), 2000);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                                copiedJsonl 
                                    ? 'bg-accent-secondary text-white' 
                                    : 'bg-gray-800 hover:bg-gray-700 text-accent-secondary border border-gray-700'
                            }`}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            <span>{copiedJsonl ? 'Скопировано!' : 'Копировать JSONL'}</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors"
                        >
                            Закрыть
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
