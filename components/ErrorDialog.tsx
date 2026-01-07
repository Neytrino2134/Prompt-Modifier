
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../localization';
import { CopyIcon } from './icons/AppIcons';

interface ErrorDialogProps {
  isOpen: boolean;
  message: string | null;
  onClose: () => void;
}

const ErrorDialog: React.FC<ErrorDialogProps> = ({ isOpen, message, onClose }) => {
  const { t } = useLanguage();
  const [isCopied, setIsCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setVisible(true);
        setIsCopied(false);
    } else {
        const timer = setTimeout(() => setVisible(false), 300); // Allow exit animation
        return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };
    if (isOpen) {
        window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen && !visible) return null;

  const handleCopy = () => {
      if (message) {
          navigator.clipboard.writeText(message);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
      }
  };

  return (
    <div 
        className={`fixed top-20 left-1/2 -translate-x-1/2 z-[200] w-full max-w-lg px-4 pointer-events-none transition-all duration-300 ease-out transform ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
    >
      <div
        className="bg-[#20293c] bg-opacity-95 backdrop-blur-xl rounded-xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden border border-gray-600/50"
        role="alert"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/20 border-b border-white/5 select-none">
           <div className="flex items-center space-x-2.5">
               <div className="p-1.5 bg-accent/20 rounded-full text-accent-text">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                   </svg>
               </div>
               <h2 className="text-sm font-bold text-accent-text tracking-wide">{t('app.error.title')}</h2>
           </div>
           <button 
                onClick={onClose} 
                className="text-text-secondary hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                title="Close"
           >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
               </svg>
           </button>
        </div>
        
        {/* Content */}
        <div className="p-5 max-h-[300px] overflow-y-auto custom-scrollbar">
            <p className="text-gray-300 text-sm whitespace-pre-wrap break-words leading-relaxed font-medium select-none">
              {message}
            </p>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-black/20 border-t border-white/5 flex justify-end">
            <button
              onClick={handleCopy}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 flex items-center gap-2 ${
                  isCopied 
                  ? 'bg-green-600/20 text-green-300' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'
              }`}
            >
              {isCopied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    {t('app.error.copied')}
                  </>
              ) : (
                  <>
                    <CopyIcon className="h-3.5 w-3.5" />
                    {t('app.error.copy')}
                  </>
              )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorDialog;
