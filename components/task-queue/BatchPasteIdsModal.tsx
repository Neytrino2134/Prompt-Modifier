import React from 'react';
import { FileText, X, Loader2, Download } from 'lucide-react';

interface BatchPasteIdsModalProps {
    batchPasteText: string;
    setBatchPasteText: (val: string) => void;
    isBatchProcessing: boolean;
    onSubmit: () => void;
    onClose: () => void;
}

export const BatchPasteIdsModal: React.FC<BatchPasteIdsModalProps> = ({
    batchPasteText,
    setBatchPasteText,
    isBatchProcessing,
    onSubmit,
    onClose
}) => {
    return (
        <div 
            className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div 
                className="bg-gray-900 border border-purple-800/80 rounded-xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden text-gray-200 animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950/80">
                    <div className="flex items-center gap-2">
                        <span className="p-1 rounded bg-purple-950 text-purple-300 border border-purple-800">
                            <FileText className="w-4 h-4" />
                        </span>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-100">
                                Массовый запрос моделей по Task IDs
                            </h3>
                            <p className="text-[10px] text-gray-400">
                                Вставьте список Task ID через перевод строки, пробел или запятую
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 space-y-3">
                    <textarea
                        value={batchPasteText}
                        onChange={(e) => setBatchPasteText(e.target.value)}
                        placeholder="task_8708c9f0-c5b5-4b19-b6eb-95fb31336bb3&#10;task_12345678-abcd-ef01-2345-6789abcdef01&#10;..."
                        rows={6}
                        className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-xs font-mono text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
                    />
                    <div className="text-[11px] text-gray-400 flex items-center justify-between">
                        <span>API Endpoint: <code className="text-purple-300">POST /v3/tasks/list</code></span>
                        <span>Распознано: {batchPasteText.split(/[\s,;\n\r]+/).filter(Boolean).length} ID</span>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 bg-gray-950/60">
                    <button
                        onClick={() => {
                            setBatchPasteText('');
                            onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors"
                    >
                        Отмена
                    </button>

                    <button
                        onClick={onSubmit}
                        disabled={isBatchProcessing || !batchPasteText.trim()}
                        className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                    >
                        {isBatchProcessing ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Запрос...</span>
                            </>
                        ) : (
                            <>
                                <Download className="w-3.5 h-3.5" />
                                <span>Запросить все модели</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
