
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../localization';
import { CustomCheckbox } from './CustomCheckbox';

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
  extraAction?: {
    label: string;
    onAction: () => void;
    className?: string;
  };
  checkbox?: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
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
  extraAction,
  checkbox,
}) => {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  
  // Local state to hold content during exit animation
  const [displayTitle, setDisplayTitle] = useState(title);
  const [displayMessage, setDisplayMessage] = useState(message);
  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false);

  useEffect(() => {
    if (checkbox) {
      setIsCheckboxChecked(Boolean(checkbox.checked));
    }
  }, [checkbox?.checked, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Update content when opening
      setDisplayTitle(title);
      setDisplayMessage(message);
      if (checkbox) {
        setIsCheckboxChecked(Boolean(checkbox.checked));
      }
    } else {
      // Delay unmounting to allow animation to finish
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, title, message, checkbox]);

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

  const handleExtraAction = () => {
    if (extraAction) {
      extraAction.onAction();
      onClose();
    }
  };

  const handleCheckboxToggle = (checked: boolean) => {
    setIsCheckboxChecked(checked);
    if (checkbox?.onChange) {
      checkbox.onChange(checked);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      // Allow checkbox toggle with space if checkbox is focused or ignore typing fields
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        if (target.getAttribute('type') !== 'checkbox') {
          return;
        }
      }

      if (e.code === 'Space' || e.key === ' ' || e.code === 'Enter' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleConfirm();
      } else if (e.code === 'Escape' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown, true);
    };
  }, [isOpen, onConfirm, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
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
        className={`bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-[580px] flex flex-col select-none transform transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onMouseDown={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="px-6 py-4 border-b border-gray-700 bg-[#18202f] rounded-t-xl">
          <h2 className="text-lg font-bold text-accent-text">{displayTitle}</h2>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{displayMessage}</p>
          {checkbox && (
            <div className="pt-2 border-t border-gray-700/60">
              <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-gray-300 hover:text-white transition-colors">
                <CustomCheckbox
                  checked={isCheckboxChecked}
                  onChange={handleCheckboxToggle}
                />
                <span>{checkbox.label}</span>
              </label>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-700 flex flex-wrap items-center justify-end gap-2.5 bg-gray-900 rounded-b-xl">
          <button
            onClick={onClose}
            className="whitespace-nowrap px-3.5 py-2 text-sm font-semibold text-gray-300 bg-gray-800 hover:bg-gray-700 hover:text-white rounded-lg transition-colors border border-gray-600 flex items-center gap-1.5"
          >
            <span>{cancelLabel || t('dialog.confirmDelete.cancel')}</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-gray-700/80 text-gray-400 border border-gray-600">Esc</kbd>
          </button>
          {extraAction && (
            <button
              onClick={handleExtraAction}
              className={extraAction.className || "whitespace-nowrap px-3.5 py-2 text-sm font-semibold text-cyan-300 bg-cyan-950/70 hover:bg-cyan-900/80 hover:text-cyan-200 rounded-lg transition-colors border border-cyan-700/60"}
            >
              {extraAction.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={handleSecondaryAction}
              className={secondaryAction.className || "whitespace-nowrap px-3.5 py-2 text-sm font-semibold text-gray-300 bg-gray-800 hover:bg-gray-700 hover:text-white rounded-lg transition-colors border border-gray-600"}
            >
              {secondaryAction.label}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className={`${primaryBtnClass} flex items-center gap-1.5`}
          >
            <span>{confirmLabel || t('dialog.confirmDelete.confirm')}</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-black/25 text-white/90 border border-white/20">Space</kbd>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
