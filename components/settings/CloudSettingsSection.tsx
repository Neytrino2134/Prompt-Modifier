import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../localization';
import { useAppContext } from '../../contexts/AppContext';
import { GoogleDriveIcon, CopyIcon } from '../icons/AppIcons';

interface CloudSettingsSectionProps {
  isOpen: boolean;
  addToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const CloudSettingsSection: React.FC<CloudSettingsSectionProps> = ({ isOpen, addToast }) => {
  const { t } = useLanguage();
  const {
    googleClientId,
    setGoogleClientId,
    handleGoogleSignIn,
    isGoogleDriveReady,
    isGoogleDriveSaving,
    handleSyncCatalogs,
    handleCleanupDuplicates,
  } = useAppContext();

  const [currentOrigin, setCurrentOrigin] = useState('');
  const [googleDriveClientId, setGoogleDriveClientId] = useState(googleClientId || '');
  const [isGoogleIdDirty, setIsGoogleIdDirty] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setGoogleDriveClientId(googleClientId || '');
      setIsGoogleIdDirty(false);
    }
  }, [isOpen, googleClientId]);

  const copyOrigin = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentOrigin);
      addToast(t('settings.originCopied'), 'success');
    }
  };

  const handleGoogleDriveClientIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setGoogleDriveClientId(val);
    setIsGoogleIdDirty(val.trim() !== (googleClientId || '').trim());
  };

  return (
    <div className="bg-gray-900/50 p-3.5 rounded-lg border border-gray-700/50 space-y-3">
      {/* Origin Display Helper */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-400">
          Detected Origin (For Google Cloud Console):
        </label>
        <div className="flex items-center gap-2">
          <code className="flex-grow bg-black/30 p-1.5 rounded text-[10px] text-gray-300 font-mono truncate border border-gray-700">
            {currentOrigin}
          </code>
          <button
            type="button"
            onClick={copyOrigin}
            className="p-1.5 text-gray-400 hover:text-white bg-gray-700 rounded hover:bg-gray-600 transition-colors"
            title="Copy Origin"
          >
            <CopyIcon className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-[10px] text-gray-500 italic">
          Add this URL to &quot;Authorized JavaScript origins&quot; in your Google Cloud Project if Auth fails.
        </p>
      </div>

      <div className="space-y-1.5 pt-2 border-t border-gray-700/30">
        <label htmlFor="googleClientId" className="block text-xs font-medium text-gray-400">
          {t('settings.googleClientIdLabel')}
        </label>
        <input
          type="text"
          id="googleClientId"
          value={googleDriveClientId}
          onChange={handleGoogleDriveClientIdChange}
          placeholder="Google Cloud Client ID"
          className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-md text-white text-sm focus:ring-1 focus:ring-accent focus:border-accent focus:outline-none placeholder-gray-600"
        />
      </div>

      {/* Smart Contextual Action Button */}
      {isGoogleIdDirty ? (
        <button
          type="button"
          onClick={() => {
            if (setGoogleClientId) setGoogleClientId(googleDriveClientId.trim());
          }}
          className="w-full py-2 px-4 rounded-md text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-900/20"
        >
          <GoogleDriveIcon className="w-4 h-4" />
          {t('settings.updateId')}
        </button>
      ) : !isGoogleDriveReady ? (
        <button
          type="button"
          className="w-full py-2 px-4 rounded-md text-sm font-bold text-gray-400 bg-gray-700 cursor-not-allowed flex items-center justify-center gap-2"
          disabled
        >
          <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {t('settings.connecting')}
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => handleGoogleSignIn && handleGoogleSignIn()}
            className="w-full py-2 px-4 rounded-md text-sm font-bold text-white transition-all flex items-center justify-center gap-2 bg-gray-700 hover:bg-blue-600 shadow-md"
          >
            <GoogleDriveIcon className="w-4 h-4" />
            {t('settings.signInWithGoogle')}
          </button>

          {handleCleanupDuplicates && (
            <button
              type="button"
              onClick={handleCleanupDuplicates}
              disabled={isGoogleDriveSaving}
              className="w-full py-2 px-4 rounded-md text-sm font-bold text-white transition-all flex items-center justify-center gap-2 bg-gray-700 hover:bg-red-600 shadow-md"
            >
              {isGoogleDriveSaving ? (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <span className="flex items-center gap-2">Cleanup Duplicates in Cloud</span>
              )}
            </button>
          )}

          {handleSyncCatalogs && (
            <button
              type="button"
              onClick={handleSyncCatalogs}
              disabled={isGoogleDriveSaving}
              className="w-full py-2 px-4 rounded-md text-sm font-bold text-white transition-all flex items-center justify-center gap-2 bg-gray-700 hover:bg-teal-600 shadow-md"
            >
              {isGoogleDriveSaving ? (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Sync Catalogs from Drive
            </button>
          )}
        </div>
      )}
    </div>
  );
};
