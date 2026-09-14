import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../localization';
import CustomSelect from '../CustomSelect';
import {
  getAvailableFlashModels,
  getAvailableProModels,
  getAvailableTranscribeModels,
  getAvailableVideoModels,
  getConfiguredFlashModel,
  getConfiguredProModel,
  getConfiguredTranscribeModel,
  getConfiguredVideoModel,
  getConfiguredImageModel,
  setConfiguredImageModel,
  getConfiguredImageEditorModel,
  setConfiguredImageEditorModel,
  getImageModelOptions,
  getImageEditorModelOptions,
  setConfiguredFlashModel,
  setConfiguredProModel,
  setConfiguredTranscribeModel,
  setConfiguredVideoModel,
  addCustomModel,
  ModelOption,
  VideoModelOption,
  ImageModelOption,
  isOpenAiEnabled,
} from '../../services/modelConfig';

interface ModelsSettingsSectionProps {
  isOpen: boolean;
  addToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  openAiEnabled?: boolean;
}

export const ModelsSettingsSection: React.FC<ModelsSettingsSectionProps> = ({
  isOpen,
  addToast,
  openAiEnabled,
}) => {
  const { t } = useLanguage();

  const [flashModel, setFlashModel] = useState<string>(getConfiguredFlashModel);
  const [proModel, setProModel] = useState<string>(getConfiguredProModel);
  const [transcribeModel, setTranscribeModel] = useState<string>(getConfiguredTranscribeModel);
  const [videoModel, setVideoModel] = useState<string>(getConfiguredVideoModel);
  const [imageModel, setImageModel] = useState<string>(getConfiguredImageModel);
  const [imageEditorModel, setImageEditorModel] = useState<string>(getConfiguredImageEditorModel);

  const [availableFlash, setAvailableFlash] = useState<ModelOption[]>(getAvailableFlashModels);
  const [availablePro, setAvailablePro] = useState<ModelOption[]>(getAvailableProModels);
  const [availableTranscribe, setAvailableTranscribe] = useState<ModelOption[]>(getAvailableTranscribeModels);
  const [availableVideo, setAvailableVideo] = useState<VideoModelOption[]>(getAvailableVideoModels);
  const [availableImage, setAvailableImage] = useState<ImageModelOption[]>(() => getImageModelOptions(isOpenAiEnabled()));
  const [availableImageEditor, setAvailableImageEditor] = useState<ImageModelOption[]>(() => getImageEditorModelOptions(isOpenAiEnabled()));

  const [customModelInput, setCustomModelInput] = useState('');
  const [customModelTier, setCustomModelTier] = useState<'flash' | 'pro' | 'video'>('flash');

  useEffect(() => {
    if (isOpen) {
      setFlashModel(getConfiguredFlashModel());
      setProModel(getConfiguredProModel());
      setTranscribeModel(getConfiguredTranscribeModel());
      setVideoModel(getConfiguredVideoModel());
      setImageModel(getConfiguredImageModel());
      setImageEditorModel(getConfiguredImageEditorModel());
      setAvailableFlash(getAvailableFlashModels());
      setAvailablePro(getAvailableProModels());
      setAvailableTranscribe(getAvailableTranscribeModels());
      setAvailableVideo(getAvailableVideoModels());
      const openAiActive = openAiEnabled !== undefined ? openAiEnabled : isOpenAiEnabled();
      setAvailableImage(getImageModelOptions(openAiActive));
      setAvailableImageEditor(getImageEditorModelOptions(openAiActive));
    }
  }, [isOpen, openAiEnabled]);

  const handleAddCustomModel = () => {
    const trimmed = customModelInput.trim();
    if (!trimmed) return;

    if (customModelTier === 'video') {
      const newVideoModel: VideoModelOption = {
        id: trimmed,
        name: trimmed,
        description: 'Custom Video Model',
        provider: 'google',
        tier: 'flash',
        supportedAspectRatios: ['16:9', '9:16', '1:1'],
        supportedResolutions: ['720p', '1080p'],
        supportedDurations: ['5s', '10s'],
      };
      addCustomModel({
        id: trimmed,
        name: trimmed,
        description: 'Custom Video Model',
        tier: 'flash',
      });
      setVideoModel(trimmed);
      setConfiguredVideoModel(trimmed);
      setAvailableVideo(getAvailableVideoModels());
    } else {
      const newModel: ModelOption = {
        id: trimmed,
        name: trimmed,
        description: `Custom ${customModelTier.toUpperCase()} Model`,
        tier: customModelTier,
      };

      addCustomModel(newModel);
      setAvailableFlash(getAvailableFlashModels());
      setAvailablePro(getAvailableProModels());

      if (customModelTier === 'flash') {
        setFlashModel(trimmed);
        setConfiguredFlashModel(trimmed);
      } else {
        setProModel(trimmed);
        setConfiguredProModel(trimmed);
      }
    }

    setCustomModelInput('');
    addToast(`Added model ${trimmed} to pool`, 'success');
  };

  return (
    <div className="bg-gray-900/50 p-3.5 rounded-lg border border-gray-700/50 space-y-3.5">
      {/* Flash Model Selection */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-gray-300 flex items-center gap-1.5">
            <span className="text-amber-400">⚡</span>
            {t('settings.llmFlashModelLabel')}
          </label>
          <span className="text-[10px] text-amber-400/80 font-mono">{flashModel}</span>
        </div>
        <p className="text-[11px] text-gray-400 leading-tight">
          {t('settings.llmFlashModelDesc')}
        </p>
        <CustomSelect
          value={flashModel}
          onChange={(val) => {
            setFlashModel(val);
            setConfiguredFlashModel(val);
          }}
          options={availableFlash.map((m) => ({
            value: m.id,
            label: `${m.name} (${m.id})`,
          }))}
        />
      </div>

      {/* Pro Model Selection */}
      <div className="space-y-1 pt-2 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-gray-300 flex items-center gap-1.5">
            <span className="text-purple-400">✨</span>
            {t('settings.llmProModelLabel')}
          </label>
          <span className="text-[10px] text-purple-400/80 font-mono">{proModel}</span>
        </div>
        <p className="text-[11px] text-gray-400 leading-tight">
          {t('settings.llmProModelDesc')}
        </p>
        <CustomSelect
          value={proModel}
          onChange={(val) => {
            setProModel(val);
            setConfiguredProModel(val);
          }}
          options={availablePro.map((m) => ({
            value: m.id,
            label: `${m.name} (${m.id})`,
          }))}
        />
      </div>

      {/* Audio Transcription Model Selection */}
      <div className="space-y-1 pt-2 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-gray-300 flex items-center gap-1.5">
            <span className="text-cyan-400">🎙️</span>
            {t('settings.llmTranscribeModelLabel')}
          </label>
          <span className="text-[10px] text-cyan-400/80 font-mono">{transcribeModel}</span>
        </div>
        <p className="text-[11px] text-gray-400 leading-tight">
          {t('settings.llmTranscribeModelDesc')}
        </p>
        <CustomSelect
          value={transcribeModel}
          onChange={(val) => {
            setTranscribeModel(val);
            setConfiguredTranscribeModel(val);
          }}
          options={availableTranscribe.map((m) => ({
            value: m.id,
            label: `${m.name} (${m.id})`,
          }))}
        />
      </div>

      {/* Default Image Generation Model Selection */}
      <div className="space-y-1 pt-2 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-gray-300 flex items-center gap-1.5">
            <span className="text-emerald-400">🖼️</span>
            {t('settings.llmImageModelLabel')}
          </label>
          <span className="text-[10px] text-emerald-400/80 font-mono">{imageModel}</span>
        </div>
        <p className="text-[11px] text-gray-400 leading-tight">
          {t('settings.llmImageModelDesc')}
        </p>
        <CustomSelect
          value={imageModel}
          onChange={(val) => {
            setImageModel(val);
            setConfiguredImageModel(val);
          }}
          options={availableImage.map((m) => ({
            value: m.value,
            label: m.label,
          }))}
        />
      </div>

      {/* Default AI Image Editor Model Selection */}
      <div className="space-y-1 pt-2 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-gray-300 flex items-center gap-1.5">
            <span className="text-sky-400">🎨</span>
            {t('settings.llmImageEditorModelLabel')}
          </label>
          <span className="text-[10px] text-sky-400/80 font-mono">{imageEditorModel}</span>
        </div>
        <p className="text-[11px] text-gray-400 leading-tight">
          {t('settings.llmImageEditorModelDesc')}
        </p>
        <CustomSelect
          value={imageEditorModel}
          onChange={(val) => {
            setImageEditorModel(val);
            setConfiguredImageEditorModel(val);
          }}
          options={availableImageEditor.map((m) => ({
            value: m.value,
            label: m.label,
          }))}
        />
      </div>

      {/* Video Generation Model Selection */}
      <div className="space-y-1 pt-2 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-gray-300 flex items-center gap-1.5">
            <span className="text-rose-400">🎬</span>
            {t('settings.llmVideoModelLabel')}
          </label>
          <span className="text-[10px] text-rose-400/80 font-mono">{videoModel}</span>
        </div>
        <p className="text-[11px] text-gray-400 leading-tight">
          {t('settings.llmVideoModelDesc')}
        </p>
        <CustomSelect
          value={videoModel}
          onChange={(val) => {
            setVideoModel(val);
            setConfiguredVideoModel(val);
          }}
          options={availableVideo.map((m) => ({
            value: m.id,
            label: `${m.name} (${m.id})`,
          }))}
        />
      </div>

      {/* Add Custom Model to Pool */}
      <div className="space-y-1.5 pt-2 border-t border-gray-800">
        <label className="block text-[11px] font-medium text-gray-400">
          {t('settings.llmCustomModel')}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customModelInput}
            onChange={(e) => setCustomModelInput(e.target.value)}
            placeholder="e.g. gemini-3.7-flash, gemini-omni-1.1-flash or veo-2.0"
            className="flex-1 p-2 bg-gray-900 border border-gray-700 rounded-md text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <select
            value={customModelTier}
            onChange={(e) => setCustomModelTier(e.target.value as 'flash' | 'pro' | 'video')}
            className="bg-gray-900 border border-gray-700 rounded-md text-xs text-gray-300 px-2 focus:outline-none"
          >
            <option value="flash">Flash</option>
            <option value="pro">Pro</option>
            <option value="video">Video</option>
          </select>
          <button
            type="button"
            disabled={!customModelInput.trim()}
            onClick={handleAddCustomModel}
            className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-md disabled:bg-gray-700 disabled:text-gray-500 transition-colors shadow-sm whitespace-nowrap"
          >
            {t('settings.llmAddCustom')}
          </button>
        </div>
      </div>
    </div>
  );
};
