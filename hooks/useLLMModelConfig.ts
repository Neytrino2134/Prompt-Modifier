import { useState, useEffect } from 'react';
import { 
    getConfiguredFlashModel, 
    getConfiguredProModel, 
    getConfiguredTranscribeModel,
    getConfiguredVideoModel,
    getConfiguredImageModel,
    getConfiguredImageEditorModel,
    getModelLabelForMode, 
    getVideoModelLabel,
    getImageModelLabel,
    getImageEditorModelLabel,
    getImageModelOptions,
    getImageEditorModelOptions,
    LLM_CONFIG_CHANGE_EVENT,
    LLMMode,
    getAvailableFlashModels,
    getAvailableProModels,
    getAvailableTranscribeModels,
    getAvailableVideoModels,
    ModelOption,
    VideoModelOption,
    ImageModelOption,
    isOpenAiEnabled,
    OPENAI_CONFIG_CHANGE_EVENT
} from '../services/modelConfig';

export interface LLMModelConfigState {
    flashModel: string;
    proModel: string;
    transcribeModel: string;
    videoModel: string;
    imageModel: string;
    imageEditorModel: string;
    flashLabel: string;
    proLabel: string;
    videoLabel: string;
    imageLabel: string;
    imageEditorLabel: string;
    availableFlash: ModelOption[];
    availablePro: ModelOption[];
    availableTranscribe: ModelOption[];
    availableVideo: VideoModelOption[];
    availableImage: ImageModelOption[];
    availableImageEditor: ImageModelOption[];
    getModelLabel: (mode: LLMMode | string) => string;
    getVideoLabel: (modelId?: string) => string;
    getImageLabel: (modelId?: string) => string;
    getImageEditorLabel: (modelId?: string) => string;
}

export const useLLMModelConfig = (): LLMModelConfigState => {
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

    useEffect(() => {
        const handleConfigChange = () => {
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
            setAvailableImage(getImageModelOptions(isOpenAiEnabled()));
            setAvailableImageEditor(getImageEditorModelOptions(isOpenAiEnabled()));
        };

        window.addEventListener(LLM_CONFIG_CHANGE_EVENT, handleConfigChange);
        window.addEventListener(OPENAI_CONFIG_CHANGE_EVENT, handleConfigChange);
        window.addEventListener('storage', handleConfigChange);

        return () => {
            window.removeEventListener(LLM_CONFIG_CHANGE_EVENT, handleConfigChange);
            window.removeEventListener(OPENAI_CONFIG_CHANGE_EVENT, handleConfigChange);
            window.removeEventListener('storage', handleConfigChange);
        };
    }, []);

    const flashLabel = getModelLabelForMode('flash');
    const proLabel = getModelLabelForMode('pro');
    const videoLabel = getVideoModelLabel(videoModel);
    const imageLabel = getImageModelLabel(imageModel);
    const imageEditorLabel = getImageEditorModelLabel(imageEditorModel);

    const getModelLabel = (mode: LLMMode | string): string => {
        return getModelLabelForMode(mode);
    };

    const getVideoLabel = (modelId?: string): string => {
        return getVideoModelLabel(modelId);
    };

    const getImageLabel = (modelId?: string): string => {
        return getImageModelLabel(modelId);
    };

    const getImageEditorLabel = (modelId?: string): string => {
        return getImageEditorModelLabel(modelId);
    };

    return {
        flashModel,
        proModel,
        transcribeModel,
        videoModel,
        imageModel,
        imageEditorModel,
        flashLabel,
        proLabel,
        videoLabel,
        imageLabel,
        imageEditorLabel,
        availableFlash,
        availablePro,
        availableTranscribe,
        availableVideo,
        availableImage,
        availableImageEditor,
        getModelLabel,
        getVideoLabel,
        getImageLabel,
        getImageEditorLabel
    };
};
