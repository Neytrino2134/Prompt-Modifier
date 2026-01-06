
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../localization';

const HelpPanel: React.FC = () => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle F1 Hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'F1') {
            e.preventDefault();
            setIsOpen(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const hotkeySections = {
    tools: [
      { key: 'V', description: t('hotkeys.tools.edit') },
      { key: 'C', description: t('hotkeys.tools.cutter') },
      { key: 'S', description: t('hotkeys.tools.selection') },
      { key: 'R', description: t('hotkeys.tools.reroute') },
      { key: 'Z', description: t('hotkeys.tools.zoom') },
      { key: 'Shift + W', description: t('toolbar.snapToGrid') },
      { key: 'Shift + E', description: t('hotkeys.tools.toggleLineStyle') },
      { key: 'G', description: `${t('hotkeys.tools.group')} / ${t('node.title.gemini_chat')}` },
      { key: 'X', description: t('hotkeys.tools.closeNode') },
      { key: 'D', description: t('hotkeys.tools.duplicate') },
      { key: 'Ctrl + D', description: t('hotkeys.tools.duplicateWithContent') },
      { key: 'Shift+Click', description: t('hotkeys.tools.deleteGroup') },
    ],
    windows: [
      { key: 'Space', description: t('hotkeys.windows.search') },
      { key: 'Ctrl+Space', description: t('hotkeys.windows.catalog') },
      { key: 'F1', description: t('help.panelTitle') }, // Added F1 to the list visually as well
    ],
    alignment: [
        { key: 'F', description: t('contextMenu.align.left') },
        { key: 'E', description: t('contextMenu.align.centerX') },
        { key: 'R', description: t('contextMenu.align.right') },
        { key: 'T', description: t('contextMenu.align.top') },
        { key: 'D', description: t('contextMenu.align.centerY') },
        { key: 'B', description: t('contextMenu.align.bottom') },
        { key: 'Ctrl + D', description: t('contextMenu.distribute.horizontal') },
        { key: 'Ctrl + E', description: t('contextMenu.distribute.vertical') },
    ],
    createNode: [
      { key: 'T', description: t('node.title.text_input') },
      { key: 'I', description: t('node.title.image_input') },
      { key: 'P', description: t('node.title.prompt_processor') },
      { key: 'O', description: t('node.title.image_output') },
      { key: 'A', description: t('node.title.prompt_analyzer') },
      { key: 'M', description: t('node.title.media_viewer') },
      { key: 'L', description: t('node.title.translator') },
      { key: 'N', description: t('node.title.note') },
      { key: 'Q', description: t('node.title.prompt_sequence_editor') },
      { key: 'E', description: t('node.title.video_editor') },
      { key: 'Shift+P', description: t('node.title.video_prompt_processor') },
      { key: 'Shift+O', description: t('node.title.video_output') },
      { key: 'Shift+I', description: t('node.title.image_editor') },
      { key: 'Shift+A', description: t('node.title.image_analyzer') },
      { key: 'Shift+C', description: t('node.title.character_generator') },
      { key: 'Shift+R', description: t('node.title.data_reader') },
      { key: 'Shift+V', description: t('node.title.script_viewer') },
      { key: 'Shift+Q', description: t('node.title.image_sequence_generator') },
      { key: 'Ctrl+Shift+C', description: t('node.title.character_card') },
      { key: 'Ctrl+Shift+A', description: t('node.title.character_analyzer') },
    ],
  };

  const renderHotkeySection = (title: string, keys: { key: string, description: string }[]) => (
    <div>
      <h4 className="font-bold text-gray-300 mb-2 border-b border-gray-600 pb-1">{title}</h4>
      <ul className="space-y-1.5">
        {keys.map(({ key, description }) => (
          <li key={key} className="flex justify-between items-center">
            <span>{description}</span>
            <kbd className="font-mono bg-gray-700 px-2 py-1 rounded-md text-gray-300 text-xs">{key}</kbd>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div ref={panelRef} className="relative">
      <div
        className="relative flex items-center"
        onMouseEnter={() => setIsTooltipVisible(true)}
        onMouseLeave={() => setIsTooltipVisible(false)}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-9 w-9 bg-gray-700 hover:bg-accent hover:text-white text-gray-300"
          aria-label={t('hotkeys.show')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <div
            className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-slate-700 text-slate-200 text-sm whitespace-nowrap rounded-md shadow-xl z-50 transition-opacity duration-200 ease-in-out origin-top ${isTooltipVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            role="tooltip"
        >
            {t('hotkeys.show')} (F1)
        </div>
      </div>

      {isOpen && (
        <div 
          className="absolute top-full mt-2 left-0 bg-gray-800 rounded-lg shadow-2xl w-[580px] h-[660px] border border-gray-700 z-50 flex flex-col" 
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
            <h2 className="text-lg font-bold text-gray-400">{t('help.panelTitle')}</h2>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 rounded-full hover:bg-gray-600 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 overflow-y-auto text-sm text-gray-400 flex-grow min-h-0 flex flex-col">
              <div className="flex-grow">
                  <div className="mb-8 text-left">
                    <h3 className="text-2xl font-bold text-accent-text">{t('app.title')}</h3>
                    <p className="text-base text-white mt-1">{t('app.subtitle')}</p>
                  </div>
                  
                  <hr className="border-gray-600 my-4" />

                  <div className="mb-8">
                      <h4 className="text-xl font-bold text-accent-text mb-2 text-left">{t('help.howToUse.title')}</h4>
                      <p className="text-white">{t('help.howToUse.content')}</p>
                  </div>

                   <hr className="border-gray-600 my-4" />

                  <div className="mb-4">
                      <h3 className="text-xl font-bold text-accent-text mb-4 text-left">{t('help.title')}</h3>
                      <div className="flex flex-col space-y-6">
                          <div>
                              {renderHotkeySection(t('hotkeys.tools.title'), hotkeySections.tools)}
                          </div>
                          <div>
                              {renderHotkeySection(t('hotkeys.windows.title'), hotkeySections.windows)}
                          </div>
                          <div>
                               {renderHotkeySection("Alignment (2+ Selected)", hotkeySections.alignment)}
                          </div>
                          <div>
                              {renderHotkeySection(t('hotkeys.createNode.title'), hotkeySections.createNode)}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
          
          <div className="p-4 bg-gray-900/50 border-t border-gray-700 text-xs flex-shrink-0 rounded-b-lg">
              <div className="flex justify-between items-baseline">
                  <span className="font-bold text-gray-600 text-sm">{t('app.title')}</span>
                  <span className="text-gray-600">Licensed under GNU GPLv3</span>
              </div>
              
              <div className="w-full h-px bg-gray-700 my-3"></div>

              <div className="flex justify-between items-end">
                  <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
                      <span className="text-gray-500">{t('help.author')}:</span>
                      <span className="text-gray-400 font-medium">MeowMaster</span>

                      <span className="text-gray-500">Email:</span>
                      <a href="mailto:MeowMasterArt@gmail.com" className="text-gray-400 hover:text-accent-text transition-colors">MeowMasterArt@gmail.com</a>

                      <span className="text-gray-500">GitHub:</span>
                      <a href="https://github.com/meowmasterart-spec/PrompModifier" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-accent-text transition-colors underline">meowmasterart-spec/PrompModifier</a>
                  </div>
                  <a href="https://www.netlify.com" target="_blank" rel="noopener noreferrer" className="opacity-80 hover:opacity-100 transition-opacity">
                    <img src="https://www.netlify.com/assets/badges/netlify-badge-color-accent.svg" alt="Deploys by Netlify" className="h-10" />
                  </a>
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpPanel;
