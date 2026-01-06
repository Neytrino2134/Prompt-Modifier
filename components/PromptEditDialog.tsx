

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

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setContent(initialContent);
      setTimeout(() => nameInputRef.current?.focus(), 100); 
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

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onMouseDown={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-lg border border-gray-700 flex flex-col"
        onMouseDown={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-cyan-400">{t('dialog.promptEdit.title')}</h2>
        </div>
        <div className="p-4 space-y-4">
            <div>
              <label htmlFor="prompt-name-input" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('dialog.promptEdit.nameLabel')}
              </label>
              <input
                  id="prompt-name-input"
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  onFocus={deselectAllNodes}
              />
            </div>
            <div>
                <label htmlFor="prompt-content-input" className="block text-sm font-medium text-gray-300 mb-2">
                    {t('dialog.promptEdit.contentLabel')}
                </label>
                <textarea
                    id="prompt-content-input"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    className="w-full h-40 px-3 py-2 bg-gray-900 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                    onWheel={e => e.stopPropagation()}
                    onFocus={deselectAllNodes}
                />
            </div>
        </div>
        <div className="p-3 border-t border-gray-700 flex justify-end items-center space-x-3 bg-gray-800/50 rounded-b-lg">
            <button
              onClick={onClose}
              className="px-4 py-2 font-semibold text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
            >
              {t('dialog.promptEdit.cancel')}
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 transition-colors"
            >
              {t('dialog.promptEdit.confirm')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default PromptEditDialog;
