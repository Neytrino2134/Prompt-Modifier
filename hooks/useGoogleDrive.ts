
import { useState, useCallback, useEffect } from 'react';
import { initializeGoogleDrive, saveFileToDrive, getStoredClientId, setStoredClientId, signIn } from '../services/googleDriveService';
import { ToastType } from '../types';

interface UseGoogleDriveProps {
    addToast: (message: string, type?: ToastType) => void;
    getCurrentCanvasState: () => any;
    tabs: any[];
    activeTabId: string;
    language: string;
    isSnapToGrid: boolean;
    lineStyle: string;
    catalogItems: any[];
    libraryItems: any[];
    characterCatalog: any;
    scriptCatalog: any;
    sequenceCatalog: any;
    t: (key: string) => string;
}

export const useGoogleDrive = ({ 
    addToast, 
    getCurrentCanvasState, 
    tabs, 
    activeTabId, 
    language,
    isSnapToGrid,
    lineStyle,
    catalogItems,
    libraryItems,
    characterCatalog,
    scriptCatalog,
    sequenceCatalog,
    t
}: UseGoogleDriveProps) => {
    const [clientId, setClientIdState] = useState(getStoredClientId());
    const [isInitialized, setIsInitialized] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (clientId) {
            initializeGoogleDrive(clientId).then(() => {
                setIsInitialized(true);
            });
        }
    }, [clientId]);

    const updateClientId = (id: string) => {
        setStoredClientId(id);
        setClientIdState(id);
    };

    const handleGoogleSignIn = useCallback(async () => {
        if (!isInitialized) {
            addToast(t('error.googleDriveInit'), 'error');
            return;
        }
        try {
            await signIn();
            addToast("Successfully signed in to Google!", 'success');
        } catch (error: any) {
            console.error("Sign in failed", error);
            addToast("Failed to sign in to Google Drive", 'error');
        }
    }, [isInitialized, addToast, t]);

    const handleSaveToDrive = useCallback(async () => {
        if (!isInitialized) {
            addToast(t('error.googleDriveInit'), 'error');
            return;
        }

        setIsSaving(true);
        try {
            const currentActiveState = getCurrentCanvasState();
            const updatedTabs = tabs.map(tab => 
                tab.id === activeTabId ? { ...tab, state: currentActiveState } : tab
            );

            const projectData = {
                type: 'prompt-modifier-project',
                appName: 'Prompt_modifier',
                version: 1,
                timestamp: new Date().toISOString(),
                tabs: updatedTabs,
                activeTabId,
                settings: {
                    language,
                    isSnapToGrid,
                    lineStyle,
                },
                catalogs: {
                    groups: catalogItems,
                    library: libraryItems,
                    characters: characterCatalog.items,
                    scripts: scriptCatalog.items,
                    sequences: sequenceCatalog.items
                }
            };
            
            const content = JSON.stringify(projectData, null, 2);
            const timestamp = new Date().toISOString().replace(/:/g, '-').replace('T', '_').split('.')[0];
            const fileName = `Prompt_Modifier_Project_${timestamp}.json`;

            await saveFileToDrive(fileName, content);
            addToast(t('toast.driveSaved'), 'success');

        } catch (error: any) {
            console.error("Drive Save Error:", error);
            addToast(t('toast.driveSaveFailed'), 'error');
        } finally {
            setIsSaving(false);
        }
    }, [isInitialized, getCurrentCanvasState, tabs, activeTabId, language, isSnapToGrid, lineStyle, catalogItems, libraryItems, characterCatalog, scriptCatalog, sequenceCatalog, t, addToast]);

    return {
        googleClientId: clientId,
        setGoogleClientId: updateClientId,
        handleSaveToDrive,
        handleGoogleSignIn,
        isGoogleDriveReady: isInitialized,
        isGoogleDriveSaving: isSaving
    };
};
