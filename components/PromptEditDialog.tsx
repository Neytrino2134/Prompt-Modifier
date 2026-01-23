
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../localization';

interface PromptEditDialogProps {
  isOpen: boolean;
  initialName: string;
  initialContent: string;
  onConfirm: (name: string, content: string) => void;
  onClose: () => void;
  deselectAllNodes: () => void;
}

const LOCAL_STORAGE_PROMPT_EDIT_POS_KEY = 'promptEditDialogPosition';

const PromptEditDialog: React.FC<PromptEditDialogProps> = ({
  isOpen,
  initialName,
  initialContent,
  onConfirm,
  onClose,
  deselectAllNodes,
}) => {
  const { t } = useLanguage();
  const [name, setName] = useState(initialName);
  const [content, setContent] = useState(initialContent);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Dragging State
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef<{ x: number, y: number } | null>(null);
  const isDraggingRef = useRef(false);
  
  // Initial position setup
  useEffect(() => {
    if (isOpen) {
      // Try to load saved position or center
      const saved = localStorage.getItem(LOCAL_STORAGE_PROMPT_EDIT_POS_KEY);
      if (saved) {
          try {
              setPosition(JSON.parse(saved));
          } catch {
              setPosition({ x: window.innerWidth / 2 - 280, y: window.innerHeight / 2 - 200 });
          }
      } else {
          setPosition({ x: window.innerWidth / 2 - 280, y: window.innerHeight / 2 - 200 });
      }

      setName(initialName);
      setContent(initialContent);
      setIsVisible(true);
      setTimeout(() => nameInputRef.current?.focus(), 100); 
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialName, initialContent]);

  const handleConfirm = () => {
    if (name.trim()) {
      onConfirm(name.trim(), content);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Drag Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      isDraggingRef.current = true;
      dragStartRef.current = {
          x: e.clientX - position.x,
          y: e.clientY - position.y
      };
      e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || !dragStartRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      setPosition({
          x: e.clientX - dragStartRef.current.x,
          y: e.clientY - dragStartRef.current.y
      });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      isDraggingRef.current = false;
      dragStartRef.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
      localStorage.setItem(LOCAL_STORAGE_PROMPT_EDIT_POS_KEY, JSON.stringify(position));
  };

  if (!isOpen && !isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[300] pointer-events-none transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
    >
      <div
        className={`absolute bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-[560px] flex flex-col select-none transform transition-transform duration-300 ease-in-out pointer-events-auto ${isOpen ? 'scale-100' : 'scale-95'}`}
        style={{
            left: position.x,
            top: position.y,
            // Ensure visibility if pos is weird
            maxWidth: '560px',
            maxHeight: '90vh'
        }}
        onMouseDown={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div 
            className="px-6 py-4 border-b border-gray-700 bg-[#18202f] rounded-t-xl cursor-move"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
          <h2 className="text-lg font-bold text-accent-text pointer-events-none">{t('dialog.promptEdit.title')}</h2>
        </div>
        
        <div className="p-6 space-y-4 bg-gray-800">
            <div>
              <label htmlFor="prompt-name-input" className="block text-sm font-medium text-gray-400 mb-2">
                  {t('dialog.promptEdit.nameLabel')}
              </label>
              <input
                  id="prompt-name-input"
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
                  onFocus={deselectAllNodes}
              />
            </div>
            <div>
                <label htmlFor="prompt-content-input" className="block text-sm font-medium text-gray-400 mb-2">
                    {t('dialog.promptEdit.contentLabel')}
                </label>
                <textarea
                    id="prompt-content-input"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    className="w-full h-40 px-3 py-2 bg-gray-900 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none custom-scrollbar"
                    onWheel={e => e.stopPropagation()}
                    onFocus={deselectAllNodes}
                />
            </div>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-700 flex justify-end items-center space-x-3 bg-gray-900 rounded-b-xl">
            <button
              onClick={onClose}
              className="px-4 py-2 font-semibold text-gray-400 bg-gray-800 hover:bg-gray-700 hover:text-white rounded-lg transition-colors border border-gray-600"
            >
              {t('dialog.promptEdit.cancel')}
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 font-bold text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20"
            >
              {t('dialog.promptEdit.confirm')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default PromptEditDialog;
