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

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100); 
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

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onMouseDown={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-sm border border-gray-700 flex flex-col"
        onMouseDown={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-cyan-400">{title || t('dialog.rename.title')}</h2>
        </div>
        <div className="p-4 space-y-4">
            <label htmlFor="rename-input" className="block text-sm font-medium text-gray-300">
                {label || t('dialog.rename.label')}
            </label>
            <input
                id="rename-input"
                ref={inputRef}
                type="text"
                value={value}
                onChange={e => setValue(e.target.value)}
                onBlur={handleConfirm}
                className="w-full px-3 py-2 bg-gray-900 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                onFocus={deselectAllNodes}
            />
        </div>
        <div className="p-3 border-t border-gray-700 flex justify-end items-center space-x-3 bg-gray-800/50 rounded-b-lg">
            <button
              onClick={onClose}
              className="px-4 py-2 font-semibold text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
            >
              {cancelButtonText || t('dialog.rename.cancel')}
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 transition-colors"
            >
              {confirmButtonText || t('dialog.rename.confirm')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default RenameDialog;