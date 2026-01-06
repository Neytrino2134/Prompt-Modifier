
import React from 'react';
import { useLanguage } from '../localization';

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
  title: string;
  message: string;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onClose,
  title,
  message,
}) => {
  const { t } = useLanguage();

  const handleConfirm = () => {
    onConfirm();
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
          <h2 className="text-lg font-bold text-cyan-400">{title}</h2>
        </div>
        <div className="p-4 space-y-4">
            <p className="text-sm text-gray-300">{message}</p>
        </div>
        <div className="p-3 border-t border-gray-700 flex justify-end items-center space-x-3 bg-gray-800/50 rounded-b-lg">
            <button
              onClick={onClose}
              className="px-4 py-2 font-semibold text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
            >
              {t('dialog.confirmDelete.cancel')}
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 transition-colors"
            >
              {t('dialog.confirmDelete.confirm')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
