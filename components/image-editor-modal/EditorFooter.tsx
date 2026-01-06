
import React from 'react';
import { useLanguage } from '../../localization';

interface EditorFooterProps {
    zoom: number;
    onZoomChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClose: () => void;
    onReset: () => void;
    onApply: () => void;
    isProcessing: boolean;
}

export const EditorFooter: React.FC<EditorFooterProps> = ({
    zoom,
    onZoomChange,
    onClose,
    onReset,
    onApply,
    isProcessing
}) => {
    const { t } = useLanguage();

    return (
        <div className="p-3 border-t border-gray-700 flex justify-between items-center bg-gray-900 gap-3 select-none">
             <div className="flex items-center space-x-4">
                 <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <span className="w-12 text-right">{Math.round(zoom * 100)}%</span>
                    <input 
                        type="range" 
                        min="0.1" 
                        max="4" 
                        step="0.1" 
                        value={zoom} 
                        onChange={onZoomChange}
                        className="w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                 </div>
             </div>

             <div className="flex space-x-3 items-center">
                <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-300 bg-gray-800 rounded-md hover:bg-gray-700 transition-colors border border-gray-600">
                    {t('imageEditor.action.cancel')}
                </button>
                 <button onClick={onReset} className="px-4 py-2 text-sm font-semibold text-red-200 bg-red-900/30 rounded-md hover:bg-red-900/50 border border-red-900/50 transition-colors">
                    {t('imageEditor.action.resetEdits')}
                </button>
                <button onClick={onApply} disabled={isProcessing} className="px-6 py-2 text-sm font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 transition-colors shadow-lg shadow-cyan-900/20 disabled:opacity-50 disabled:cursor-not-allowed">
                    {t('imageEditor.action.apply')}
                </button>
            </div>
        </div>
    );
};
