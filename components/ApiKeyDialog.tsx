import React from 'react';
import { useLanguage } from '../localization';

interface ApiKeyDialogProps {
  onSelectKey: () => void;
  onClose: () => void;
}

const ApiKeyDialog: React.FC<ApiKeyDialogProps> = ({ onSelectKey, onClose }) => {
  const { t } = useLanguage();

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
      onMouseDown={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-md border border-gray-700 flex flex-col"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-cyan-400">{t('dialog.apiKey.title')}</h2>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-300">
            {t('dialog.apiKey.description')}
          </p>
          <a
            href="https://ai.google.dev/gemini-api/docs/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-cyan-400 hover:text-cyan-300 underline"
          >
            {t('dialog.apiKey.billingLink')}
          </a>
        </div>
        <div className="p-3 border-t border-gray-700 flex justify-end items-center space-x-3 bg-gray-800/50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 font-semibold text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
          >
            {t('dialog.rename.cancel')}
          </button>
          <button
            onClick={onSelectKey}
            className="px-4 py-2 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 transition-colors"
          >
            {t('dialog.apiKey.button')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyDialog;
