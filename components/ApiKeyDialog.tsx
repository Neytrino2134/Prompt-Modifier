
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../localization';

interface ApiKeyDialogProps {
  isOpen: boolean;
  onSelectKey: () => void;
  onClose: () => void;
}

const ApiKeyDialog: React.FC<ApiKeyDialogProps> = ({ isOpen, onSelectKey, onClose }) => {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen && !isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      onMouseDown={onClose}
    >
      <div
        className={`bg-panel rounded-lg shadow-2xl w-full max-w-md flex flex-col select-none transform transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-node-border">
          <h2 className="text-lg font-bold text-accent-text">{t('dialog.apiKey.title')}</h2>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-text-secondary">
            {t('dialog.apiKey.description')}
          </p>
          <a
            href="https://ai.google.dev/gemini-api/docs/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent-text hover:text-accent-hover underline"
          >
            {t('dialog.apiKey.billingLink')}
          </a>
        </div>
        <div className="p-3 border-t border-node-border flex justify-end items-center space-x-3 bg-black/20 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 font-semibold text-gray-400 bg-gray-800 hover:bg-gray-700 hover:text-white rounded-md transition-colors"
          >
            {t('dialog.rename.cancel')}
          </button>
          <button
            onClick={onSelectKey}
            className="px-4 py-2 font-bold text-white bg-accent rounded-md hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20"
          >
            {t('dialog.apiKey.button')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyDialog;
