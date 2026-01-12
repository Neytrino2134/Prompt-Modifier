
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../localization';
import { CopyIcon } from './icons/AppIcons';
import { Tooltip } from './Tooltip';

interface LinkItemProps {
    title: string;
    url: string;
    icon: React.ReactNode;
    colorClass: string;
    description?: string;
    hoverClass?: string;
}

const LOCAL_STORAGE_POS_KEY = 'helpPanelPosition';

const LinkCard: React.FC<LinkItemProps> = ({ title, url, icon, colorClass, description, hoverClass }) => {
    const { t } = useLanguage();
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleOpen = () => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div 
            onClick={handleOpen}
            className="group relative flex items-center justify-between bg-gray-900/40 p-3 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-all duration-200 hover:bg-gray-800/60 cursor-pointer"
        >
            <div className="flex items-center gap-4 overflow-hidden">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gray-800 border border-gray-700 shadow-sm shrink-0 ${colorClass}`}>
                    {icon}
                </div>
                <div className="flex flex-col min-w-0">
                    <span className={`font-bold text-gray-200 text-sm truncate transition-colors ${hoverClass || 'group-hover:text-cyan-400'}`}>{title}</span>
                    {description && <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{description}</span>}
                    <span className="text-[10px] text-gray-600 truncate font-mono mt-0.5 group-hover:text-gray-500 transition-colors">{url}</span>
                </div>
            </div>
            
            <div className="flex items-center gap-2 pl-2">
                <Tooltip content={copied ? t('help.copied') : t('help.copyLink')} position="top">
                    <button 
                        onClick={handleCopy}
                        className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 border border-transparent hover:border-gray-600 transition-all focus:outline-none"
                    >
                        {copied ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <CopyIcon className="h-4 w-4" />
                        )}
                    </button>
                </Tooltip>
                
                {/* Visual indicator for external link */}
                <div className={`p-2 text-gray-600 transition-colors ${hoverClass ? hoverClass.replace('text-', 'text-opacity-80 text-') : 'group-hover:text-cyan-500'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                </div>
            </div>
        </div>
    );
};

const SectionHeader: React.FC<{ title: string; colorClass?: string }> = ({ title, colorClass }) => (
    <div className="flex items-center gap-2 mb-3 mt-4 first:mt-0">
        <div className="h-px bg-gray-700 flex-grow"></div>
        <span className={`text-xs font-bold uppercase tracking-widest ${colorClass || 'text-gray-500'}`}>{title}</span>
        <div className="h-px bg-gray-700 flex-grow"></div>
    </div>
);

const GoogleIcon = (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
    </svg>
);

const HelpPanel: React.FC = () => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false); // For animation
  const [activeTab, setActiveTab] = useState<'hotkeys' | 'links'>('hotkeys');
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  
  const windowRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  // Draggable State
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const positionRef = useRef(position);

  // Sync ref
  useEffect(() => {
      positionRef.current = position;
  }, [position]);

  // Handle Open/Close Logic
  useEffect(() => {
    if (isOpen) {
        setIsVisible(true);
        const saved = localStorage.getItem(LOCAL_STORAGE_POS_KEY);
        
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
                    setPosition(parsed);
                } else {
                    throw new Error("Invalid pos");
                }
            } catch {
                // Fallback center if corrupt
                setPosition({ 
                    x: Math.max(0, window.innerWidth / 2 - 300), 
                    y: Math.max(0, window.innerHeight / 2 - 360) 
                });
            }
        } else {
            // Initial positioning relative to button
            if (buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                const windowW = window.innerWidth;
                const windowH = window.innerHeight;
                const panelW = 600;
                const panelH = 720;

                // Try to align left, but ensure it fits
                let x = rect.left;
                // If it goes off-screen right, align right to window edge
                if (x + panelW > windowW) x = windowW - panelW - 20;
                // Ensure non-negative
                x = Math.max(20, x);

                let y = rect.bottom + 10;
                // If it goes off-screen bottom, push it up
                if (y + panelH > windowH) y = Math.max(20, windowH - panelH - 20);

                setPosition({ x, y });
            } else {
                 setPosition({ 
                    x: Math.max(0, window.innerWidth / 2 - 300), 
                    y: Math.max(0, window.innerHeight / 2 - 360) 
                });
            }
        }
    } else {
        const timer = setTimeout(() => setIsVisible(false), 200); // Wait for transition
        return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking inside the window or the button
      if (windowRef.current && windowRef.current.contains(event.target as Node)) {
        return;
      }
      if (buttonRef.current && buttonRef.current.contains(event.target as Node)) {
        return;
      }
      setIsOpen(false);
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

  // Drag Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.closest('button')) return;

      e.preventDefault();
      e.stopPropagation();
      isDragging.current = true;
      dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
      e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging.current) return;
      e.preventDefault();
      e.stopPropagation();
      setPosition({
          x: e.clientX - dragStart.current.x,
          y: e.clientY - dragStart.current.y
      });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      e.currentTarget.releasePointerCapture(e.pointerId);
      localStorage.setItem(LOCAL_STORAGE_POS_KEY, JSON.stringify(positionRef.current));
  };

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
      { key: 'F1', description: t('help.panelTitle') }, 
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
    <div ref={buttonRef} className="relative select-none">
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

      {isVisible && (
        <div 
          ref={windowRef}
          className={`fixed bg-gray-800 rounded-lg shadow-2xl w-[600px] h-[720px] z-[100] flex flex-col overflow-hidden border border-gray-700 transition-opacity duration-200 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          style={{ 
             left: position.x, 
             top: position.y
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          {/* Header & Tabs - Draggable */}
          <div 
              className="bg-[#18202f] border-b border-gray-600 cursor-move"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
          >
              <div className="flex items-center justify-between px-6 py-4">
                  <h2 className="text-xl font-bold text-accent-text flex items-center gap-2 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t('app.title')} <span className="text-xs text-accent-text/70 font-normal ml-2">{t('help.subtitle')}</span>
                  </h2>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
              </div>
              
              {/* Tabs */}
              <div className="flex px-6 gap-6">
                   <button 
                       onClick={() => setActiveTab('hotkeys')}
                       className={`pb-3 text-sm font-semibold transition-colors relative ${activeTab === 'hotkeys' ? 'text-accent-text' : 'text-gray-400 hover:text-gray-200'}`}
                   >
                       {t('help.panelTitle')}
                       {activeTab === 'hotkeys' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-t-full"></div>}
                   </button>
                   <button 
                       onClick={() => setActiveTab('links')}
                       className={`pb-3 text-sm font-semibold transition-colors relative ${activeTab === 'links' ? 'text-accent-text' : 'text-gray-400 hover:text-gray-200'}`}
                   >
                       {t('help.tab.links')}
                       {activeTab === 'links' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-t-full"></div>}
                   </button>
              </div>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar flex-grow bg-gray-800">
              {activeTab === 'hotkeys' ? (
                  <div className="flex flex-col space-y-6 text-sm text-gray-400">
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
              ) : (
                  <div className="flex flex-col gap-2">
                       <SectionHeader title={t('help.section.socials')} colorClass="text-red-400" />
                       
                       <LinkCard 
                           title="MurcelloNovaes" 
                           description="YouTube Channel"
                           url="https://www.youtube.com/@MurcelloNovaes" 
                           colorClass="text-red-500"
                           icon={<svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>}
                       />

                        <LinkCard 
                           title="MeowMasterArt" 
                           description="Linktree"
                           url="https://linktr.ee/meowmasterart" 
                           colorClass="text-green-500"
                           icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v12m0-12c-2 0-3-1-3-3 0-1 0-2 1-3m2 6c2 0 3-1 3-3 0-1 0-2-1-3M7 7c0 2 1 3 2 5m8-5c0 2-1 3-2 5M9 2h6" /></svg>}
                       />

                       <div className="grid grid-cols-2 gap-2">
                            <LinkCard 
                               title="Telegram Channel" 
                               url="https://t.me/+h0YEu0nx9QdhMDNi" 
                               colorClass="text-sky-400"
                               icon={<svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>}
                           />
                            <LinkCard 
                               title="Telegram Group" 
                               url="https://t.me/+tyQLGFxiEbRhMDdi" 
                               colorClass="text-sky-500"
                               icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                           />
                       </div>

                       <SectionHeader title={t('help.section.githubPages')} colorClass="text-purple-400" />

                       <div className="grid grid-cols-2 gap-2">
                           <LinkCard 
                               title="Script Modifier" 
                               description="GitHub Pages"
                               url="https://neytrino2134.github.io/Script-Modifier/" 
                               colorClass="text-green-500"
                               hoverClass="group-hover:text-green-400"
                               icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>}
                           />
                           <LinkCard 
                               title="Prompt Modifier" 
                               description="GitHub Pages"
                               url="https://neytrino2134.github.io/Prompt-Modifier/" 
                               colorClass="text-cyan-500"
                               hoverClass="group-hover:text-cyan-400"
                               icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>}
                           />
                       </div>

                       <SectionHeader title={t('help.section.netlify')} colorClass="text-cyan-400" />

                       <div className="grid grid-cols-2 gap-2">
                           <LinkCard 
                               title="Script Modifier" 
                               url="https://scriptmodifier2.netlify.app/" 
                               colorClass="text-green-500"
                               hoverClass="group-hover:text-green-400"
                               icon={<svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 2L2 19.777h20L12 2zm0 3.7l6.6 11.677H5.4L12 5.7z"/></svg>}
                           />
                           <LinkCard 
                               title="Prompt Modifier" 
                               url="https://promptmodifier2.netlify.app/" 
                               colorClass="text-cyan-500"
                               hoverClass="group-hover:text-cyan-400"
                               icon={<svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 2L2 19.777h20L12 2zm0 3.7l6.6 11.677H5.4L12 5.7z"/></svg>}
                           />
                       </div>

                       <SectionHeader title={t('help.section.studioStable')} colorClass="text-blue-500" />
                       
                       <div className="grid grid-cols-2 gap-2">
                           <LinkCard 
                               title="Script Modifier 0.1.3" 
                               description="Stable Version"
                               url="https://ai.studio/apps/drive/1enTmQ5Wz9RBArkZMZm5s5nYQcKxQ9L8M?fullscreenApplet=true" 
                               colorClass="text-green-500"
                               hoverClass="group-hover:text-green-400"
                               icon={GoogleIcon}
                           />
                           <LinkCard 
                               title="Prompt Modifier 0.1.7" 
                               description="Stable Version"
                               url="https://ai.studio/apps/drive/1YCO0DaA4BTm9p0j5XqvpBhX_XTg9ClwC?fullscreenApplet=true" 
                               colorClass="text-cyan-500"
                               hoverClass="group-hover:text-cyan-400"
                               icon={GoogleIcon}
                           />
                       </div>

                       <SectionHeader title={t('help.section.studioAlpha')} colorClass="text-blue-500" />
                       
                       <div className="grid grid-cols-2 gap-2">
                           <LinkCard 
                               title="Script Modifier 0.1.4 Alpha" 
                               description="Latest Alpha"
                               url="https://aistudio.google.com/apps/drive/1y9CSUmlVQK2xq7ckses7fpM6wpbZdBnB?showAssistant=true&resourceKey=&showPreview=true" 
                               colorClass="text-green-500"
                               hoverClass="group-hover:text-green-400"
                               icon={GoogleIcon}
                           />
                           <LinkCard 
                               title="Prompt Modifier 0.1.8 Alpha" 
                               description="Latest Alpha"
                               url="https://aistudio.google.com/apps/drive/1OJfPP9wUKlnjvZ5_2_Fxq_v1dW0iftlW?showAssistant=true&resourceKey=&showPreview=true" 
                               colorClass="text-cyan-500"
                               hoverClass="group-hover:text-cyan-400"
                               icon={GoogleIcon}
                           />
                       </div>

                       <SectionHeader title={t('help.section.github')} colorClass="text-yellow-400" />
                       
                       <div className="grid grid-cols-1 gap-2">
                            <LinkCard 
                               title="Script Modifier" 
                               url="https://github.com/Neytrino2134/Script-Modifier" 
                               colorClass="text-green-500"
                               hoverClass="group-hover:text-green-400"
                               icon={<svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>}
                           />
                           <LinkCard 
                               title="Prompt Modifier" 
                               url="https://github.com/Neytrino2134/Prompt-Modifier" 
                               colorClass="text-cyan-500"
                               hoverClass="group-hover:text-cyan-400"
                               icon={<svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>}
                           />
                       </div>

                       {/* Spacer */}
                       <div className="h-4"></div>
                  </div>
              )}
          </div>
          
          <div className="p-4 bg-gray-900 border-t border-gray-700 text-xs flex-shrink-0">
              <div className="flex justify-between items-baseline">
                  <span className="font-bold text-gray-600 text-sm">{t('app.title')}</span>
                  <span className="text-gray-600">{t('help.license')}</span>
              </div>
              
              <div className="w-full h-px bg-gray-700 my-3"></div>

              <div className="flex justify-between items-end">
                  <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
                      <span className="text-gray-500">{t('help.author')}:</span>
                      <span className="text-gray-400 font-medium">MeowMaster</span>

                      <span className="text-gray-500">Email:</span>
                      <a href="mailto:MeowMasterArt@gmail.com" className="text-gray-400 hover:text-accent-text transition-colors">MeowMasterArt@gmail.com</a>

                      <span className="text-gray-500">GitHub:</span>
                      <a href="https://github.com/Neytrino2134/Prompt-Modifier" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-accent-text transition-colors underline">Neytrino2134/Prompt-Modifier</a>
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
