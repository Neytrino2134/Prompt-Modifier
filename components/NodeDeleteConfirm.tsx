
import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../localization';
import { Point } from '../types';

interface NodeDeleteConfirmProps {
  position: Point;
  onConfirm: (dontShowAgain: boolean) => void;
  onCancel: () => void;
  count?: number;
}

const NodeDeleteConfirm: React.FC<NodeDeleteConfirmProps> = ({ position, onConfirm, onCancel, count = 1 }) => {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Capture Space or Enter to confirm
        if (e.code === 'Space' || e.code === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            onConfirm(dontShowAgain);
        } else if (e.code === 'KeyX') {
            // Hotkey 'X' triggers "Don't show again" + Confirm
            e.preventDefault();
            e.stopPropagation();
            onConfirm(true);
        } else if (e.code === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
        }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onCancel();
      }
    };
    
    // Use capture: true for keydown to intercept Space before it triggers global shortcuts
    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onConfirm, onCancel, dontShowAgain]);

  // Adjust position to stay on screen if needed (basic clamp)
  const x = Math.min(Math.max(0, position.x), window.innerWidth - 220);
  const y = Math.min(Math.max(0, position.y), window.innerHeight - 150);

  return (
    <div 
      ref={ref}
      className="fixed z-[100] bg-[#374151] shadow-2xl rounded-xl p-4 flex flex-col items-center justify-center space-y-4 select-none animate-fade-in-up min-w-[220px] border-2 border-transparent animate-border-flash"
      style={{ left: x, top: y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span className="text-sm font-semibold text-gray-100 whitespace-nowrap mt-1">
        {count > 1 ? t('dialog.deleteNode.titlePlural') : t('dialog.deleteNode.title')}
      </span>
      <div className="flex items-center justify-center space-x-4 w-full pb-1">
        <button 
            onClick={() => onConfirm(dontShowAgain)}
            className="flex flex-row items-center space-x-2 group focus:outline-none px-3 py-1.5 rounded-lg hover:bg-gray-600/50 transition-colors"
            title={t('dialog.deleteNode.confirmTooltip')}
        >
            <div className="text-gray-400 group-hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors uppercase font-bold tracking-wider">
                {t('dialog.deleteNode.confirm')}
            </span>
        </button>
        
        <button 
            onClick={onCancel}
            className="flex flex-row items-center space-x-2 group focus:outline-none px-3 py-1.5 rounded-lg hover:bg-gray-600/50 transition-colors"
            title={t('dialog.deleteNode.cancelTooltip')}
        >
             <div className="text-gray-400 group-hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </div>
            <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors uppercase font-bold tracking-wider">
                {t('dialog.deleteNode.cancel')}
            </span>
        </button>
      </div>
      
      <div className="flex items-center space-x-2 pt-2 border-t border-gray-600/50 w-full justify-center cursor-pointer" onClick={() => setDontShowAgain(!dontShowAgain)}>
            <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-500 text-accent focus:ring-accent bg-gray-700 cursor-pointer"
            />
            <label className="text-xs text-gray-400 select-none cursor-pointer">
                {t('dialog.deleteNode.dontShowAgain')} <span className="text-gray-500 font-mono ml-1">(X)</span>
            </label>
      </div>
    </div>
  );
};

export default NodeDeleteConfirm;
