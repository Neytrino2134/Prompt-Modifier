import React, { useCallback, ReactNode, useState, useEffect, useRef } from 'react';
import { LanguageContext, LanguageCode, getTranslation, TranslationKey } from './localization';
import { AppProvider, useAppContext } from './contexts/AppContext';

// UI Layers
import CanvasLayer from './components/CanvasLayer';
import AppHeader from './components/AppHeader';
import DialogLayer from './components/DialogLayer';
import TopRightPanel from './components/TopRightPanel';
import ImageViewer from './components/ImageViewer';
import { DockingMenu } from './components/DockingMenu';
import { SideDockingPanels } from './components/SideDockingPanels';
import { BottomMediaPanel } from './components/BottomMediaPanel';

const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // secondaryLanguage is the user's preferred "native" language (e.g., RU, ES)
  const [secondaryLanguage, setSecondaryLanguage] = useState<LanguageCode>('ru');
  
  // language is what is currently displayed (toggles between 'en' and secondaryLanguage)
  // Default to 'en' per user request
  const [language, setLanguage] = useState<LanguageCode>('en');

  // Initialize from storage
  useEffect(() => {
      const storedSecondary = localStorage.getItem('settings_secondaryLanguage') as LanguageCode;
      if (storedSecondary && ['ru', 'es'].includes(storedSecondary)) {
          setSecondaryLanguage(storedSecondary);
      }
      
      // We do NOT auto-set 'language' here to storedSecondary, 
      // allowing the app to start in EN by default or maintain the explicit selection logic.
  }, []);

  // Sync Secondary changes to storage
  useEffect(() => {
      localStorage.setItem('settings_secondaryLanguage', secondaryLanguage);
  }, [secondaryLanguage]);

  const t = useCallback((key: TranslationKey, options?: { [key: string]: string | number }) => {
    return getTranslation(language, key, options);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, secondaryLanguage, setSecondaryLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Main Editor Component - Orchestrates Layout
const Editor: React.FC = () => {
  const context = useAppContext();
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [isAppLoaded, setIsAppLoaded] = useState(false);
  const hasContentRef = useRef(false);

  // Update hasContentRef whenever context updates
  useEffect(() => {
      if (context) {
          // Warn if there are nodes in the current tab or if there are multiple tabs
          // This covers most cases where a user might lose work
          hasContentRef.current = context.nodes.length > 0 || context.tabs.length > 1;
      }
  }, [context]);

  // Handle beforeunload event
  useEffect(() => {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
          // Check if running in Electron/Nativefier
          const isElectron = /Electron/i.test(navigator.userAgent);
          
          // If in Nativefier wrapper, do NOT prevent unload, otherwise the app won't close.
          if (isElectron) return;

          if (hasContentRef.current) {
              e.preventDefault();
              e.returnValue = ''; // Required for Chrome to show the standard dialog
          }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Deferred loading effect for Canvas
  useEffect(() => {
    const timer = setTimeout(() => {
        setIsCanvasReady(true);
    }, 150); 
    
    // Global Load Delay to prevent flickering
    const globalTimer = setTimeout(() => {
        setIsAppLoaded(true);
    }, 500);

    return () => {
        clearTimeout(timer);
        clearTimeout(globalTimer);
    }
  }, []);

  if (!context) return null;

  const { 
    fileInputRef, handleFileChange, catalogFileInputRef, handleCatalogFileChange, 
    libraryFileInputRef, handleLibraryFileChange, imageSequenceFileInputRef, 
    handleImageSequenceFileChange, promptSequenceEditorFileInputRef, 
    handlePromptSequenceFileChange, characterCardFileInputRef, 
    handleCharacterCardFileChange, scriptFileInputRef, handleScriptFileChange,
    toasts,
    addToast,
    imageViewer, setImageViewer,
    onDownloadImageFromUrl, onCopyImageToClipboard,
    isDockingMenuVisible, dockHoverMode, clientPointerPositionRef,
    t
  } = context;

  return (
    <>
      {/* Loading Overlay (Curtain) */}
      <div 
          className={`fixed inset-0 bg-[#111827] z-[9999] flex flex-col items-center justify-center transition-opacity duration-700 pointer-events-none ${isAppLoaded ? 'opacity-0' : 'opacity-100'}`}
      >
           <div className="flex flex-col items-center space-y-4">
                <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                <div className="text-cyan-400 font-bold tracking-widest uppercase text-sm animate-pulse">Загрузка...</div>
           </div>
      </div>

      <div 
        className={`relative w-screen h-screen flex flex-col overflow-hidden bg-canvas transition-opacity duration-700 delay-300 ${isAppLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{
          backgroundImage: 'radial-gradient(hsla(215, 14%, 34%, 0.5) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        {/* 1. Canvas Layer - Renders Nodes, Connections, Groups */}
        {/* Wrapped in transition opacity for smooth entry after delay */}
        <div 
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${isCanvasReady ? 'opacity-100' : 'opacity-0'}`}
        >
            {isCanvasReady && <CanvasLayer />}
        </div>

        {/* 2. UI Chrome Layer - Headers, Panels, Overlays - Rendered Immediately */}
        <AppHeader />
        <TopRightPanel />
        
        {/* Global Media Player Control Panel */}
        <BottomMediaPanel />

        {/* Author Watermark */}
        <div className="absolute bottom-2 right-4 pointer-events-none z-[5] text-xs text-white/10 hover:text-white/50 transition-colors duration-300 flex flex-col items-end leading-tight select-none font-mono">
            <span className="font-bold">{t('help.author')}: MeowMaster</span>
            <span>MeowMasterArt@gmail.com</span>
            <a href="https://www.netlify.com" target="_blank" rel="noopener noreferrer" className="pointer-events-auto hover:text-cyan-400 transition-colors mt-1">
              Powered by Netlify
            </a>
        </div>

        {/* 3. Docking Menu (Floating Top) */}
        <DockingMenu 
            isVisible={isDockingMenuVisible} 
            hoveredMode={dockHoverMode} 
            mousePosition={clientPointerPositionRef.current} 
        />
        
        {/* 3.1 Side Docking Panels (Left/Right) */}
        <SideDockingPanels />

        {/* 4. Global Modals & Dialogs */}
        <DialogLayer />
        
        {/* 5. Image Viewer Overlay */}
        {imageViewer && (
          <ImageViewer
            sources={imageViewer.sources}
            initialIndex={imageViewer.initialIndex}
            initialPosition={{ x: (window.innerWidth / 2) - 512, y: (window.innerHeight / 2) - 400 }}
            onClose={() => setImageViewer(null)}
            onDownloadImageFromUrl={onDownloadImageFromUrl}
            onCopyImageToClipboard={onCopyImageToClipboard}
            addToast={addToast}
          />
        )}

        {/* 6. Toast Notifications */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[101] flex flex-col items-center space-y-2 pointer-events-none">
          {toasts.map(toast => {
            let classes = "font-bold px-6 py-3 rounded-xl shadow-xl animate-fade-in-out text-sm flex items-center justify-center text-center border pointer-events-auto";
            
            if (toast.type === 'success') {
                // Success uses the theme accent color (Opaque)
                classes += " bg-accent text-white border-accent-hover";
            } else if (toast.type === 'error') {
                // Error (Opaque)
                classes += " bg-red-600 text-white border-red-500";
            } else {
                // Info (Copied, Pasted etc) uses Secondary Accent (Opaque)
                classes += " bg-accent-secondary text-white border-accent-secondary-hover";
            }

            return (
              <div key={toast.id} className={classes}>
                {toast.message}
              </div>
            );
          })}
        </div>

        {/* 7. Hidden Inputs for File Operations */}
        <input type="file" ref={fileInputRef} className="hidden" accept=".json,.PMC,.PMP" onChange={handleFileChange} />
        <input type="file" ref={catalogFileInputRef} className="hidden" accept=".json" onChange={handleCatalogFileChange} />
        <input type="file" ref={libraryFileInputRef} className="hidden" accept=".json,.txt" onChange={handleLibraryFileChange} />
        <input type="file" ref={imageSequenceFileInputRef} className="hidden" accept=".json" onChange={handleImageSequenceFileChange} />
        <input type="file" ref={promptSequenceEditorFileInputRef} className="hidden" accept=".json" onChange={handlePromptSequenceFileChange} />
        <input type="file" ref={characterCardFileInputRef} className="hidden" accept=".json,.CHAR" onChange={handleCharacterCardFileChange} />
        <input type="file" ref={scriptFileInputRef} className="hidden" accept=".json" onChange={handleScriptFileChange} />
      </div>
    </>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppProvider>
        <Editor />
      </AppProvider>
    </LanguageProvider>
  );
};

export default App;