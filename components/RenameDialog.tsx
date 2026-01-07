
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../localization';

interface RenameDialogProps {
  isOpen: boolean;
  initialValue: string;
  onConfirm: (newValue: string) => void;
  onClose: () => void;
  title?: string;
  label?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  deselectAllNodes: () => void;
}

const RenameDialog: React.FC<RenameDialogProps> = ({
  isOpen,
  initialValue,
  onConfirm,
  onClose,
  title,
  label,
  confirmButtonText,
  cancelButtonText,
  deselectAllNodes,
}) => {
  const { t } = useLanguage();
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      setIsVisible(true);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100); 
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialValue]);

  const handleConfirm = () => {
    if (value.trim()) {
      onConfirm(value.trim());
    }
    onClose();
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen && !isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      onMouseDown={onClose}
    >
      <div
        className={`bg-panel rounded-lg shadow-2xl w-full max-w-sm flex flex-col select-none transform transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onMouseDown={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="p-4 border-b border-node-border">
          <h2 className="text-lg font-bold text-accent-text">{title || t('dialog.rename.title')}</h2>
        </div>
        <div className="p-4 space-y-4">
            <label htmlFor="rename-input" className="block text-sm font-medium text-text-secondary">
                {label || t('dialog.rename.label')}
            </label>
            <input
                id="rename-input"
                ref={inputRef}
                type="text"
                value={value}
                onChange={e => setValue(e.target.value)}
                onBlur={handleConfirm}
                className="w-full px-3 py-2 bg-input text-text-main rounded-md border border-node-border focus:outline-none focus:ring-2 focus:ring-accent"
                onFocus={deselectAllNodes}
            />
        </div>
        <div className="p-3 border-t border-node-border flex justify-end items-center space-x-3 bg-black/20 rounded-b-lg">
            <button
              onClick={onClose}
              className="px-4 py-2 font-semibold text-gray-400 bg-gray-800 hover:bg-gray-700 hover:text-white rounded-md transition-colors"
            >
              {cancelButtonText || t('dialog.rename.cancel')}
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 font-bold text-white bg-accent rounded-md hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20"
            >
              {confirmButtonText || t('dialog.rename.confirm')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default RenameDialog;
