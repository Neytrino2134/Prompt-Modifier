
import React from 'react';
import { useLanguage } from '../../localization';

interface EditorHeaderProps {
    onClose: () => void;
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({ onClose, onPointerDown, onPointerMove, onPointerUp }) => {
    const { t } = useLanguage();

    return (
        <div 
            onPointerDown={onPointerDown} 
            onPointerMove={onPointerMove} 
            onPointerUp={onPointerUp}
            className="p-3 border-b border-gray-700 flex justify-between items-center cursor-move bg-gray-900 select-none"
        >
            <h2 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {t('imageEditor.title')}
            </h2>
            <button onClick={onClose} className="p-1 text-gray-400 rounded-full hover:bg-gray-600 hover:text-white transition-colors" onPointerDown={e => e.stopPropagation()}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
    );
};
