
import React, { useEffect, useState } from 'react';
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
  const [isVisible, setIsVisible] = useState(false);
  
  // Local state to hold content during exit animation
  const [displayTitle, setDisplayTitle] = useState(title);
  const [displayMessage, setDisplayMessage] = useState(message);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Update content when opening
      setDisplayTitle(title);
      setDisplayMessage(message);
    } else {
      // Delay unmounting to allow animation to finish
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, title, message]);

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
  
  // Render if open OR if visible (animating out)
  if (!isOpen && !isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      onMouseDown={onClose}
    >
      <div
        className={`bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-sm flex flex-col select-none transform transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onMouseDown={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="px-6 py-4 border-b border-gray-700 bg-[#18202f] rounded-t-xl">
          <h2 className="text-lg font-bold text-accent-text">{displayTitle}</h2>
        </div>
        <div className="p-6 space-y-4">
            <p className="text-sm text-gray-400 leading-relaxed">{displayMessage}</p>
        </div>
        <div className="px-6 py-4 border-t border-gray-700 flex justify-end items-center space-x-3 bg-gray-900 rounded-b-xl">
            <button
              onClick={onClose}
              className="px-4 py-2 font-semibold text-gray-400 bg-gray-800 hover:bg-gray-700 hover:text-white rounded-lg transition-colors border border-gray-600"
            >
              {t('dialog.confirmDelete.cancel')}
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 font-bold text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20"
            >
              {t('dialog.confirmDelete.confirm')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
