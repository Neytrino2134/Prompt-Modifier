import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../localization';
import { CustomCheckbox } from '../CustomCheckbox';
import CustomSelect from '../CustomSelect';
import {
  isOpenAiEnabled,
  setOpenAiEnabled,
  getOpenAiApiKey,
  setOpenAiApiKey,
  isTripoEnabled,
  setTripoEnabled,
  getTripoApiKey,
  setTripoApiKey,
  getTripoModelVersion,
  setTripoModelVersion,
} from '../../services/modelConfig';

interface ApiSettingsSectionProps {
  isOpen: boolean;
  onOpenAiToggleChange?: (enabled: boolean) => void;
}

export const ApiSettingsSection: React.FC<ApiSettingsSectionProps> = ({ isOpen, onOpenAiToggleChange }) => {
  const { t } = useLanguage();

  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const [openAiEnabled, setOpenAiEnabledState] = useState(false);
  const [openAiApiKey, setOpenAiApiKeyState] = useState('');
  const [showOpenAiApiKey, setShowOpenAiApiKey] = useState(false);

  const [tripoEnabled, setTripoEnabledState] = useState(false);
  const [tripoApiKey, setTripoApiKeyState] = useState('');
  const [showTripoApiKey, setShowTripoApiKey] = useState(false);
  const [tripoModelVersion, setTripoModelVersionState] = useState('v2.5-20250123');

  useEffect(() => {
    if (isOpen) {
      setApiKey(localStorage.getItem('settings_userApiKey') || '');
      setOpenAiEnabledState(isOpenAiEnabled());
      setOpenAiApiKeyState(getOpenAiApiKey());
      setTripoEnabledState(isTripoEnabled());
      setTripoApiKeyState(getTripoApiKey());
      setTripoModelVersionState(getTripoModelVersion());
    }
  }, [isOpen]);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setApiKey(val);
    localStorage.setItem('settings_userApiKey', val.trim());
  };

  const handleOpenAiToggle = (checked: boolean) => {
    setOpenAiEnabledState(checked);
    setOpenAiEnabled(checked);
    onOpenAiToggleChange?.(checked);
  };

  const handleOpenAiApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOpenAiApiKeyState(val);
    setOpenAiApiKey(val.trim());
  };

  const handleTripoToggle = (checked: boolean) => {
    setTripoEnabledState(checked);
    setTripoEnabled(checked);
  };

  const handleTripoApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTripoApiKeyState(val);
    setTripoApiKey(val.trim());
  };

  const handleTripoModelVersionChange = (val: string) => {
    setTripoModelVersionState(val);
    setTripoModelVersion(val);
  };

  return (
    <div className="bg-gray-900/50 p-3.5 rounded-lg border border-gray-700/50 space-y-3">
      {/* Google Gemini API Configuration */}
      <div className="p-3 bg-gray-950/40 rounded-lg border border-gray-700/40 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-gray-200 flex items-center gap-1.5">
              <span className="text-cyan-400 font-bold">✦</span>
              {t('settings.geminiTitle')}
            </span>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              apiKey.trim()
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}
          >
            {apiKey.trim() ? t('settings.geminiActive') : t('settings.geminiInactive')}
          </span>
        </div>

        <p className="text-[11px] text-gray-400 leading-tight">
          {t('settings.geminiEnabledDesc')}
        </p>

        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center">
            <label htmlFor="apiKey" className="block text-xs font-medium text-gray-300">
              {t('dialog.settings.apiKeyLabel')}
            </label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-400 hover:text-cyan-300 underline"
            >
              {t('dialog.settings.getKeyLink')}
            </a>
          </div>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              id="apiKey"
              value={apiKey}
              onChange={handleApiKeyChange}
              placeholder="AIzaSy..."
              className="w-full p-2.5 pr-9 bg-gray-900 border border-gray-600 rounded-md text-white text-sm focus:ring-1 focus:ring-accent focus:border-accent focus:outline-none placeholder-gray-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors p-1"
              title={showApiKey ? 'Hide Key' : 'Show Key'}
            >
              {showApiKey ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* OpenAI API Configuration */}
      <div className="border-t border-gray-700/60 pt-3">
        <div className="p-3 bg-gray-950/40 rounded-lg border border-gray-700/40 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CustomCheckbox
                id="openai-enabled-toggle"
                checked={openAiEnabled}
                onChange={handleOpenAiToggle}
                label={t('settings.openaiEnabled')}
                className="font-semibold text-xs text-gray-200"
              />
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                openAiEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
            >
              {openAiEnabled ? t('settings.openaiActive') : t('settings.openaiInactive')}
            </span>
          </div>

          <p className="text-[11px] text-gray-400 leading-tight">
            {t('settings.openaiEnabledDesc')}
          </p>

          {openAiEnabled && (
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center">
                <label htmlFor="openAiApiKey" className="block text-xs font-medium text-gray-300">
                  {t('settings.openaiApiKeyLabel')}
                </label>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-400 hover:text-emerald-300 underline"
                >
                  {t('settings.openaiGetKeyLink')}
                </a>
              </div>
              <div className="relative">
                <input
                  type={showOpenAiApiKey ? 'text' : 'password'}
                  id="openAiApiKey"
                  value={openAiApiKey}
                  onChange={handleOpenAiApiKeyChange}
                  placeholder="sk-proj-..."
                  className="w-full p-2.5 pr-9 bg-gray-900 border border-gray-600 rounded-md text-white text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none placeholder-gray-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenAiApiKey(!showOpenAiApiKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors p-1"
                  title={showOpenAiApiKey ? 'Hide Key' : 'Show Key'}
                >
                  {showOpenAiApiKey ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* TRIPO AI API Configuration */}
        <div className="border-t border-gray-700/60 pt-3">
          <div className="p-3 bg-gray-950/40 rounded-lg border border-gray-700/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CustomCheckbox
                  id="tripo-enabled-toggle"
                  checked={tripoEnabled}
                  onChange={handleTripoToggle}
                  label={t('settings.tripoEnabled')}
                  className="font-semibold text-xs text-gray-200"
                />
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  tripoEnabled
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-gray-800 text-gray-400 border border-gray-700'
                }`}
              >
                {tripoEnabled ? t('settings.tripoActive') : t('settings.tripoInactive')}
              </span>
            </div>

            <p className="text-[11px] text-gray-400 leading-tight">
              {t('settings.tripoEnabledDesc')}
            </p>

            {tripoEnabled && (
              <div className="space-y-2.5 pt-1">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label htmlFor="tripoApiKey" className="block text-xs font-medium text-gray-300">
                      {t('settings.tripoApiKeyLabel')}
                    </label>
                    <a
                      href="https://platform.tripo3d.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-400 hover:text-purple-300 underline"
                    >
                      {t('settings.tripoGetKeyLink')}
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showTripoApiKey ? 'text' : 'password'}
                      id="tripoApiKey"
                      value={tripoApiKey}
                      onChange={handleTripoApiKeyChange}
                      placeholder="tpa_..."
                      className="w-full p-2.5 pr-9 bg-gray-900 border border-gray-600 rounded-md text-white text-sm focus:ring-1 focus:ring-purple-500 focus:border-purple-500 focus:outline-none placeholder-gray-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTripoApiKey(!showTripoApiKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors p-1"
                      title={showTripoApiKey ? 'Hide Key' : 'Show Key'}
                    >
                      {showTripoApiKey ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-gray-400">
                    {t('settings.tripoModelVersionLabel')}
                  </label>
                  <CustomSelect
                    value={tripoModelVersion}
                    onChange={handleTripoModelVersionChange}
                    options={[
                      { value: 'v2.5-20250123', label: 'Tripo v2.5 (20250123 - Multiview + Standard Texture)' },
                      { value: 'v2.0-20240919', label: 'Tripo v2.0 (20240919)' },
                      { value: 'default', label: 'Tripo Default' },
                    ]}
                    className="w-full text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
