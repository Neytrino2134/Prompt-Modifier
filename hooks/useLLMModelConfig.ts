import { useState, useEffect } from 'react';
import { 
    getConfiguredFlashModel, 
    getConfiguredProModel, 
    getModelLabelForMode, 
    LLM_CONFIG_CHANGE_EVENT,
    LLMMode,
    getAvailableFlashModels,
    getAvailableProModels,
    ModelOption
} from '../services/modelConfig';

export interface LLMModelConfigState {
    flashModel: string;
    proModel: string;
    flashLabel: string;
    proLabel: string;
    availableFlash: ModelOption[];
    availablePro: ModelOption[];
    getModelLabel: (mode: LLMMode | string) => string;
}

export const useLLMModelConfig = (): LLMModelConfigState => {
    const [flashModel, setFlashModel] = useState<string>(getConfiguredFlashModel);
    const [proModel, setProModel] = useState<string>(getConfiguredProModel);
    const [availableFlash, setAvailableFlash] = useState<ModelOption[]>(getAvailableFlashModels);
    const [availablePro, setAvailablePro] = useState<ModelOption[]>(getAvailableProModels);

    useEffect(() => {
        const handleConfigChange = () => {
            setFlashModel(getConfiguredFlashModel());
            setProModel(getConfiguredProModel());
            setAvailableFlash(getAvailableFlashModels());
            setAvailablePro(getAvailableProModels());
        };

        window.addEventListener(LLM_CONFIG_CHANGE_EVENT, handleConfigChange);
        window.addEventListener('storage', handleConfigChange);

        return () => {
            window.removeEventListener(LLM_CONFIG_CHANGE_EVENT, handleConfigChange);
            window.removeEventListener('storage', handleConfigChange);
        };
    }, []);

    const flashLabel = getModelLabelForMode('flash');
    const proLabel = getModelLabelForMode('pro');

    const getModelLabel = (mode: LLMMode | string): string => {
        return getModelLabelForMode(mode);
    };

    return {
        flashModel,
        proModel,
        flashLabel,
        proLabel,
        availableFlash,
        availablePro,
        getModelLabel
    };
};
