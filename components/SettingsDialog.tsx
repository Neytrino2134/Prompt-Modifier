
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../localization';
import { ActionButton } from './ActionButton';
import { useAppContext } from '../contexts/AppContext';
import { ReloadIcon, GoogleDriveIcon } from './icons/AppIcons';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  addToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  setIsInstantCloseEnabled: (enabled: boolean) => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose, addToast, setIsInstantCloseEnabled }) => {
  const { t } = useLanguage();
  const context = useAppContext(); // Access context to set global animation state
  const { setNodeAnimationMode, nodeAnimationMode, googleClientId, setGoogleClientId, handleGoogleSignIn, isGoogleDriveReady } = context || {};

  const [apiKey, setApiKey] = useState('');
  const [googleDriveClientId, setGoogleDriveClientId] = useState('');
  const [useDevKey, setUseDevKey] = useState(true);
  const [instantNodeClose, setInstantNodeClose] = useState(false);
  const [animMode, setAnimMode] = useState<string>('pulse');
  const [isDriveCollapsed, setIsDriveCollapsed] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem('settings_userApiKey') || '';
      const storedUseDev = localStorage.getItem('settings_useDevKey');
      const storedInstantClose = localStorage.getItem('settings_instantNodeClose');
      const storedAnimMode = localStorage.getItem('settings_nodeAnimationMode');
      
      // Legacy check fallback
      const legacyAnim = localStorage.getItem('settings_nodeAnimation');
      
      setApiKey(storedKey);
      setGoogleDriveClientId(googleClientId || '');
      setUseDevKey(storedUseDev === null ? true : storedUseDev === 'true');
      setInstantNodeClose(storedInstantClose === 'true');
      
      if (storedAnimMode) {
          setAnimMode(storedAnimMode);
      } else if (legacyAnim === 'false') {
          setAnimMode('none');
      } else {
          setAnimMode(nodeAnimationMode || 'pulse');
      }
    }
  }, [isOpen, nodeAnimationMode, googleClientId]);

  const handleSave = () => {
    localStorage.setItem('settings_userApiKey', apiKey);
    localStorage.setItem('settings_useDevKey', String(useDevKey));
    localStorage.setItem('settings_instantNodeClose', String(instantNodeClose));
    localStorage.setItem('settings_nodeAnimationMode', animMode);
    
    if (setGoogleClientId) {
        setGoogleClientId(googleDriveClientId.trim());
    }
    
    // Update live context
    setIsInstantCloseEnabled(instantNodeClose);
    if (setNodeAnimationMode) {
        setNodeAnimationMode(animMode);
    }

    addToast(t('toast.apiKeySaved'), 'success');
    onClose();
  };

  const handleReloadApp = () => {
      window.location.reload();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 cursor-default" onMouseDown={onClose}>
      <div 
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-700 flex flex-col cursor-default max-h-[90vh]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-bold text-cyan-400">{t('dialog.settings.title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          <p className="text-sm text-gray-300 leading-relaxed">
            {t('dialog.settings.description')}
          </p>

          <div className="text-left">
              <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-cyan-400 hover:text-cyan-300 underline"
              >
                  {t('dialog.settings.getKeyLink')}
              </a>
          </div>

          <div className={`space-y-2 transition-opacity duration-200 ${useDevKey ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-400">
              {t('dialog.settings.apiKeyLabel')}
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Введите ваш апи ключ здесь..."
              className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none cursor-text"
            />
          </div>

          <div className="flex items-center space-x-3 p-3 bg-gray-700/50 rounded-md border border-gray-600">
            <input
              type="checkbox"
              id="useDevKey"
              checked={useDevKey}
              onChange={(e) => setUseDevKey(e.target.checked)}
              className="h-5 w-5 rounded border-gray-500 text-accent focus:ring-accent bg-gray-800 cursor-pointer"
            />
            <label htmlFor="useDevKey" className="text-sm font-medium text-gray-200 cursor-pointer select-none">
              {t('dialog.settings.useDevKeyLabel')}
            </label>
          </div>

          {/* Google Drive Integration Group */}
          <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700 space-y-4">
              <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setIsDriveCollapsed(!isDriveCollapsed)}
              >
                  <div className="flex items-center gap-2">
                      <GoogleDriveIcon className="w-5 h-5" />
                      <h3 className="text-sm font-bold text-gray-200">{t('settings.googleDriveTitle')}</h3>
                  </div>
                  <div className="text-gray-400">
                      {isDriveCollapsed ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                      )}
                  </div>
              </div>
              
              {!isDriveCollapsed && (
                  <div className="space-y-4 animate-fade-in-drop">
                      <div className="space-y-2">
                        <label htmlFor="googleClientId" className="block text-xs font-medium text-gray-400">
                          {t('settings.googleClientIdLabel')}
                        </label>
                        <input
                          type="text"
                          id="googleClientId"
                          value={googleDriveClientId}
                          onChange={(e) => setGoogleDriveClientId(e.target.value)}
                          placeholder="Google Cloud Client ID"
                          className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-white text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none cursor-text"
                        />
                        <p className="text-[10px] text-gray-500">
                            Create a project in Google Cloud Console, enable Drive API, and create OAuth credentials.
                        </p>
                      </div>

                      <button
                          onClick={() => handleGoogleSignIn && handleGoogleSignIn()}
                          disabled={!isGoogleDriveReady}
                          className={`w-full py-2 px-4 rounded-md text-sm font-bold text-white transition-colors flex items-center justify-center gap-2 ${isGoogleDriveReady ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                          title={!isGoogleDriveReady ? "Enter Client ID and Save first" : ""}
                      >
                          <GoogleDriveIcon className="w-4 h-4" />
                          {t('settings.signInWithGoogle')}
                      </button>
                  </div>
              )}
          </div>
          
           <div className="flex items-center space-x-3 p-3 bg-gray-700/50 rounded-md border border-gray-600">
            <input
              type="checkbox"
              id="instantNodeClose"
              checked={instantNodeClose}
              onChange={(e) => setInstantNodeClose(e.target.checked)}
              className="h-5 w-5 rounded border-gray-500 text-accent focus:ring-accent bg-gray-800 cursor-pointer"
            />
            <label htmlFor="instantNodeClose" className="text-sm font-medium text-gray-200 cursor-pointer select-none">
              {t('dialog.settings.instantNodeCloseLabel')}
            </label>
          </div>

          {/* Node Animation Mode Selector */}
          <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-400">
                  {t('dialog.settings.animationModeLabel')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                  <button 
                      onClick={() => setAnimMode('pulse')}
                      className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors ${animMode === 'pulse' ? 'bg-cyan-600/30 border-cyan-500 text-cyan-100' : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:bg-gray-700'}`}
                  >
                      {t('dialog.settings.anim.pulse')}
                  </button>
                  <button 
                      onClick={() => setAnimMode('blade-runner')}
                      className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors ${animMode === 'blade-runner' ? 'bg-cyan-600/30 border-cyan-500 text-cyan-100' : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:bg-gray-700'}`}
                  >
                      {t('dialog.settings.anim.bladeRunner')}
                  </button>
                  <button 
                      onClick={() => setAnimMode('none')}
                      className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors ${animMode === 'none' ? 'bg-cyan-600/30 border-cyan-500 text-cyan-100' : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:bg-gray-700'}`}
                  >
                      {t('dialog.settings.anim.none')}
                  </button>
              </div>
          </div>

        </div>

        <div className="p-4 border-t border-gray-700 flex justify-between items-center">
          <button
              onClick={handleReloadApp}
              className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-white hover:bg-red-900/50 rounded-md transition-colors"
              title={t('dialog.settings.reload')}
          >
              <ReloadIcon />
              <span className="text-sm font-bold">{t('dialog.settings.reload')}</span>
          </button>
          
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-md transition-colors cursor-pointer"
          >
            {t('dialog.settings.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;
