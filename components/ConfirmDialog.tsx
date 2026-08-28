
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../localization';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'accent' | 'danger' | 'primary';
  secondaryAction?: {
    label: string;
    onAction: () => void;
    className?: string;
  };
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onClose,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmVariant = 'accent',
  secondaryAction,
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

  const handleSecondaryAction = () => {
    if (secondaryAction) {
      secondaryAction.onAction();
      onClose();
    }
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

  const primaryBtnClass = confirmVariant === 'danger'
    ? 'whitespace-nowrap px-4 py-2 text-sm font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-500 transition-colors shadow-md shadow-rose-600/20'
    : 'whitespace-nowrap px-4 py-2 text-sm font-bold text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors shadow-md shadow-accent/20';

  return (
    <div
      className={`fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      onMouseDown={onClose}
    >
      <div
        className={`bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-[540px] flex flex-col select-none transform transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onMouseDown={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="px-6 py-4 border-b border-gray-700 bg-[#18202f] rounded-t-xl">
          <h2 className="text-lg font-bold text-accent-text">{displayTitle}</h2>
        </div>
        <div className="p-6 space-y-4">
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{displayMessage}</p>
        </div>
        <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-end gap-3 bg-gray-900 rounded-b-xl">
            <button
              onClick={onClose}
              className="whitespace-nowrap px-4 py-2 text-sm font-semibold text-gray-300 bg-gray-800 hover:bg-gray-700 hover:text-white rounded-lg transition-colors border border-gray-600"
            >
              {cancelLabel || t('dialog.confirmDelete.cancel')}
            </button>
            {secondaryAction && (
              <button
                onClick={handleSecondaryAction}
                className={secondaryAction.className || "whitespace-nowrap px-4 py-2 text-sm font-semibold text-rose-300 bg-rose-950/50 hover:bg-rose-900/70 hover:text-rose-100 rounded-lg transition-colors border border-rose-800/60"}
              >
                {secondaryAction.label}
              </button>
            )}
            <button
              onClick={handleConfirm}
              className={primaryBtnClass}
            >
              {confirmLabel || t('dialog.confirmDelete.confirm')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
