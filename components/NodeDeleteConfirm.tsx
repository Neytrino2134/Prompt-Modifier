
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
  
  // Dragging state
  const [currentPosition, setCurrentPosition] = useState(position);
  const dragStartRef = useRef<{ x: number, y: number } | null>(null);
  const isDraggingRef = useRef(false);

  // Initialize position once (clamped to viewport)
  useEffect(() => {
    const x = Math.min(Math.max(0, position.x), window.innerWidth - 220);
    const y = Math.min(Math.max(0, position.y), window.innerHeight - 150);
    setCurrentPosition({ x, y });
  }, []); // Run only once on mount to respect initial prop but allow movement

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' || e.code === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            onConfirm(dontShowAgain);
        } else if (e.code === 'KeyX') {
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
      if (isDraggingRef.current) return;
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onCancel();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onConfirm, onCancel, dontShowAgain]);

  // Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
      e.stopPropagation(); // Stop propagation to canvas
      
      const target = e.target as HTMLElement;
      // Allow clicking buttons/checkbox without dragging immediately if needed, 
      // but usually dragging from empty space is preferred.
      if (target.closest('button') || target.closest('.checkbox-container')) return;

      if (e.button !== 0) return; // Only left click

      isDraggingRef.current = true;
      dragStartRef.current = {
          x: e.clientX - currentPosition.x,
          y: e.clientY - currentPosition.y
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !dragStartRef.current) return;
      setCurrentPosition({
          x: e.clientX - dragStartRef.current.x,
          y: e.clientY - dragStartRef.current.y
      });
  };

  const handleMouseUp = () => {
      isDraggingRef.current = false;
      dragStartRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <div 
      ref={ref}
      className="fixed z-[100] bg-gray-800/95 backdrop-blur-md shadow-2xl rounded-xl p-4 flex flex-col items-center justify-center space-y-4 select-none animate-fade-in-up min-w-[220px] cursor-move border border-gray-700/50"
      style={{ left: currentPosition.x, top: currentPosition.y }}
      onMouseDown={handleMouseDown}
    >
      <span className="text-sm font-semibold text-gray-200 whitespace-nowrap mt-1 pointer-events-none">
        {count > 1 ? t('dialog.deleteNode.titlePlural') : t('dialog.deleteNode.title')}
      </span>
      <div className="flex items-center justify-center space-x-3 w-full pb-1">
        <button 
            onClick={(e) => { e.stopPropagation(); onConfirm(dontShowAgain); }}
            className="flex flex-row items-center space-x-2 group focus:outline-none px-5 py-2 rounded-lg bg-transparent hover:bg-gray-700 transition-all"
            title={t('dialog.deleteNode.confirmTooltip')}
            onMouseDown={(e) => e.stopPropagation()} // Prevent drag start
        >
            <div className="text-cyan-400 group-hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <span className="text-xs text-gray-200 group-hover:text-white transition-colors uppercase font-bold tracking-wider">
                {t('dialog.deleteNode.confirm')}
            </span>
        </button>
        
        <button 
            onClick={(e) => { e.stopPropagation(); onCancel(); }}
            className="flex flex-row items-center space-x-2 group focus:outline-none px-5 py-2 rounded-lg bg-transparent hover:bg-gray-700 transition-all"
            title={t('dialog.deleteNode.cancelTooltip')}
            onMouseDown={(e) => e.stopPropagation()} // Prevent drag start
        >
             <div className="text-gray-400 group-hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </div>
            <span className="text-xs text-gray-400 group-hover:text-white transition-colors uppercase font-bold tracking-wider">
                {t('dialog.deleteNode.cancel')}
            </span>
        </button>
      </div>
      
      <div 
          className="flex items-center space-x-2 pt-2 border-t border-gray-700/50 w-full justify-center cursor-pointer checkbox-container" 
          onClick={(e) => { e.stopPropagation(); setDontShowAgain(!dontShowAgain); }}
          onMouseDown={(e) => e.stopPropagation()} // Prevent drag start
      >
            <div className={`w-4 h-4 rounded flex items-center justify-center transition-all duration-200 border ${dontShowAgain ? 'bg-cyan-600 border-cyan-600' : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'}`}>
                <svg className={`w-3 h-3 text-white transition-transform duration-200 ${dontShowAgain ? 'scale-100' : 'scale-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <label className="text-xs text-gray-400 select-none cursor-pointer hover:text-gray-300 transition-colors">
                {t('dialog.deleteNode.dontShowAgain')} <span className="text-gray-500 font-mono ml-1 opacity-50">(X)</span>
            </label>
      </div>
    </div>
  );
};

export default NodeDeleteConfirm;
