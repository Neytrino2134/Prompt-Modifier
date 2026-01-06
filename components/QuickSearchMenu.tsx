
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NodeType, Point } from '../types';
import { useLanguage } from '../localization';

interface NodeOption {
  type: NodeType;
  title: string;
  englishTitle: string; 
  description: string;
  icon: React.ReactNode;
  group: 'input' | 'process' | 'output' | 'ai' | 'video' | 'scripts' | 'game' | 'character';
}

interface QuickSearchMenuProps {
  isOpen: boolean;
  position: Point;
  onClose: () => void;
  onAddNode: (type: NodeType) => void;
}

const RECENT_NODES_KEY = 'prompt_modifier_recent_nodes';

const QuickSearchMenu: React.FC<QuickSearchMenuProps> = ({ isOpen, position, onClose, onAddNode }) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentTypes, setRecentTypes] = useState<NodeType[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Position State (independent of props after initial open to support dragging)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  
  // Dragging Refs (Direct DOM manipulation for performance)
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
      try {
          const stored = localStorage.getItem(RECENT_NODES_KEY);
          if (stored) {
              setRecentTypes(JSON.parse(stored));
          }
      } catch (e) { console.error("Failed to load recent nodes", e); }
  }, []);

  const saveRecentNode = (type: NodeType) => {
      setRecentTypes(prev => {
          const filtered = prev.filter(t => t !== type);
          const newRecents = [type, ...filtered].slice(0, 3);
          localStorage.setItem(RECENT_NODES_KEY, JSON.stringify(newRecents));
          return newRecents;
      });
  };

  const nodeOptions: NodeOption[] = useMemo(() => [
    // Group 1: Input & Basic
    { group: 'input', type: NodeType.TEXT_INPUT, title: t('search.node.text_input.title' as any), englishTitle: 'Text Input', description: t('search.node.text_input.description' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 6h10M12 6v12" /></svg> },
    { group: 'input', type: NodeType.IMAGE_INPUT, title: t('search.node.image_input.title' as any), englishTitle: 'Image Input', description: t('search.node.image_input.description' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="M21 15l-5-5L5 21"></path></svg> },
    { group: 'input', type: NodeType.MEDIA_VIEWER, title: t('search.node.media_viewer.title' as any), englishTitle: 'Media Viewer', description: t('search.node.media_viewer.description' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { group: 'input', type: NodeType.PROMPT_SEQUENCE_EDITOR, title: t('search.node.prompt_sequence_editor.title' as any), englishTitle: 'Prompt Sequence Editor', description: t('search.node.prompt_sequence_editor.description' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg> },
    { group: 'input', type: NodeType.DATA_READER, title: t('search.node.data_reader.title' as any), englishTitle: 'Data Reader', description: t('search.node.data_reader.description' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    { group: 'input', type: NodeType.NOTE, title: t('search.node.note.title' as any), englishTitle: 'Note', description: t('search.node.note.description' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg> },
    // Group 2: Processing
    { group: 'process', type: NodeType.PROMPT_PROCESSOR, title: t('search.node.prompt_processor.title' as any), englishTitle: 'Prompt Processor', description: t('search.node.prompt_processor.description' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 22.5l-.648-1.938a3.375 3.375 0 00-2.672-2.672L11.25 18l1.938-.648a3.375 3.375 0 002.672 2.672L16.25 13l.648 1.938a3.375 3.375 0 002.672 2.672L21.75 18l-1.938.648a3.375 3.375 0 00-2.672 2.672z" /></svg> },
    { group: 'process', type: NodeType.PROMPT_ANALYZER, title: t('search.node.prompt_analyzer.title' as any), englishTitle: 'Prompt Analyzer', description: t('search.node.prompt_analyzer.description' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 14h6M9 11h6M9 8h6" /></svg> },
    { group: 'character', type: NodeType.CHARACTER_CARD, title: t('search.node.character_card.title' as any), englishTitle: 'Character Card', description: t('search.node.character_card.description' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 8a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5a7.5 7.5 0 0115 0" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5a.75.75 0 00-.75.75v13.5c0 .414.336.75.75.75h16.5a.75.75 0 00.75-.75V5.25a.75.75 0 00-.75-.75H3.75z" /></svg> },
    { group: 'character', type: NodeType.CHARACTER_ANALYZER, title: t('search.node.character_analyzer.title' as any), englishTitle: 'Character Analyzer', description: t('search.node.character_analyzer.description' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 9a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14.25c-3.1 0-5.88-1.5-7.5-3.75m15 3.75c-1.62-2.25-4.4-3.75-7.5-3.75S6.12 12 4.5 14.25" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" /></svg> },
    { group: 'character', type: NodeType.CHARACTER_GENERATOR, title: t('search.node.character_generator.title' as any), englishTitle: 'Character Generator', description: t('search.node.character_generator.description' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg> },
    { group: 'character', type: NodeType.POSE_CREATOR, title: t('search.node.pose_creator.title' as any), englishTitle: 'Pose Creator', description: t('search.node.pose_creator.description' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
    { group: 'process', type: NodeType.IMAGE_ANALYZER, title: t('search.node.image_analyzer.title' as any), englishTitle: 'Image Analyzer', description: t('search.node.image_analyzer.description' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0z" /></svg> },
    { group: 'process', type: NodeType.IMAGE_EDITOR, title: t('search.node.image_editor.title' as any), englishTitle: 'AI Image Editor', description: t('search.node.image_editor.description' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg> },
    // Group 3: AI Tools
    { group: 'ai', type: NodeType.TRANSLATOR, title: t('search.node.translator.title' as any), englishTitle: 'Translator', description: t('search.node.translator.description' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L12 6l6 12M8 14h8" /></svg> },
    { group: 'ai', type: NodeType.GEMINI_CHAT, title: t('search.node.gemini_chat.title' as any), englishTitle: 'Gemini Chat', description: t('search.node.gemini_chat.description' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { group: 'ai', type: NodeType.PROMPT_SANITIZER, title: t('search.node.prompt_sanitizer.title' as any), englishTitle: 'Prompt Sanitizer', description: t('search.node.prompt_sanitizer.description' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 22.5l-.648-1.938a3.375 3.375 0 00-2.672-2.672L11.25 18l1.938-.648a3.375 3.375 0 002.672 2.672L16.25 13l.648 1.938a3.375 3.375 0 002.672 2.672L21.75 18l-1.938.648a3.375 3.375 0 00-2.672 2.672z" /></svg> },
    // Group 4: Video
    { group: 'video', type: NodeType.VIDEO_PROMPT_PROCESSOR, title: t('search.node.video_prompt_processor.title' as any), englishTitle: 'Video Prompt Processor', description: t('search.node.video_prompt_processor.description' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg> },
    { group: 'video', type: NodeType.VIDEO_OUTPUT, title: t('search.node.video_output.title' as any), englishTitle: 'Video Output', description: t('search.node.video_output.description' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" /></svg> },
    { group: 'video', type: NodeType.VIDEO_EDITOR, title: t('node.title.video_editor' as any), englishTitle: 'Video Editor', description: t('node.help.video_editor' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> },
    // Group 5: Scripts
    { group: 'scripts', type: NodeType.SCRIPT_GENERATOR, title: t('search.node.script_generator.title' as any), englishTitle: 'Script Generator', description: t('search.node.script_generator.description' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h.01M15 12h.01M10.5 16.5h3M15 19.5h-6a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 018.25 4.5h7.5a2.25 2.25 0 012.25 2.25v10.5A2.25 2.25 0 0115.75 19.5h-1.5" /></svg> },
    { group: 'scripts', type: NodeType.SCRIPT_VIEWER, title: t('search.node.script_viewer.title' as any), englishTitle: 'Script Viewer', description: t('search.node.script_viewer.description' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 19.82a2.25 2.25 0 01-1.897 1.13l-2.685.8.8-2.685a2.25 2.25 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg> },
    // Group 6: Output
    { group: 'output', type: NodeType.IMAGE_OUTPUT, title: t('search.node.image_output.title' as any), englishTitle: 'Image Output', description: t('search.node.image_output.description' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg> },
    { group: 'output', type: NodeType.IMAGE_SEQUENCE_GENERATOR, title: t('search.node.image_sequence_generator.title' as any), englishTitle: 'Image Sequence Generator', description: t('search.node.image_sequence_generator.description' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 5h12M6 9h12M6 13h12M6 17h12M3 3h2.5v18H3zm15.5 0H21v18h-2.5z" /></svg> },
    { group: 'output', type: NodeType.IMAGE_EDITOR, title: t('search.node.image_editor.title' as any), englishTitle: 'AI Image Editor', description: t('search.node.image_editor.description' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg> },
    // Group 7: Game
    { group: 'game', type: NodeType.DATA_PROTECTION, title: t('search.node.data_protection.title' as any), englishTitle: 'Data Protection', description: t('search.node.data_protection.description' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> },
  ], [t]);

  const groupTitles = useMemo(() => ({
    input: t('search.group.input' as any),
    process: t('search.group.process' as any),
    character: t('quickadd.group.character' as any),
    output: t('search.group.output' as any),
    ai: t('search.group.ai' as any),
    video: t('search.group.video' as any),
    scripts: t('search.group.scripts' as any),
    game: 'Games',
  }), [t]);

  const groupStyles = {
    input: 'bg-emerald-800/50 text-emerald-300',
    process: 'bg-green-800/50 text-green-300',
    character: 'bg-pink-800/50 text-pink-300',
    output: 'bg-blue-800/50 text-blue-300',
    ai: 'bg-amber-800/50 text-amber-300',
    video: 'bg-red-800/50 text-red-300',
    scripts: 'bg-lime-800/50 text-lime-300',
    game: 'bg-cyan-800/50 text-cyan-300',
  };

  const filteredNodes = useMemo(() => {
      const lowerTerm = searchTerm.toLowerCase().trim();
      const allMatches = nodeOptions.filter(node => 
          node.title.toLowerCase().includes(lowerTerm) ||
          node.englishTitle.toLowerCase().includes(lowerTerm) ||
          node.description.toLowerCase().includes(lowerTerm)
      );

      if (lowerTerm === '') {
          const recents = recentTypes.map(type => nodeOptions.find(n => n.type === type)).filter(Boolean) as NodeOption[];
          return { recents, all: nodeOptions };
      } else {
          return { recents: [], all: allMatches };
      }

  }, [searchTerm, nodeOptions, recentTypes]);

  const displayList = useMemo(() => {
      const { recents, all } = filteredNodes;
      return [...recents.map(r => ({ ...r, isRecent: true })), ...all.map(a => ({ ...a, isRecent: false }))];
  }, [filteredNodes]);

  // Initial positioning and focus
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedIndex(0);
      setIsVisible(true);
      
      // Calculate initial position based on props
      if (menuRef.current) {
          const menuRect = menuRef.current.getBoundingClientRect();
          let left = position.x - (menuRect.width / 2);
          let top = position.y + 10;

          // Viewport clamping logic
          if (left + menuRect.width > window.innerWidth - 10) left = window.innerWidth - menuRect.width - 10;
          if (left < 10) left = 10;
          if (top + 400 > window.innerHeight - 10) top = position.y - 400 - 10;
          if (top < 10) top = 10;
          
          setMenuPos({ x: left, y: top });
          initialPosRef.current = { x: left, y: top }; // Store initial position for dragging calc
      }
      
      // Focus input
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
        setIsVisible(false);
    }
  }, [isOpen, position]);
  
  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex < displayList.length) {
      const selectedElement = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, displayList]);

  // Handle Dragging
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPosRef.current = { ...menuPos };
    
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current && menuRef.current) {
        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;
        
        // Use transform for smooth movement without reflows
        menuRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current && menuRef.current) {
        isDraggingRef.current = false;
        
        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;
        
        // Commit new position to state
        setMenuPos(prev => ({
            x: prev.x + deltaX,
            y: prev.y + deltaY
        }));
        
        // Reset transform since we updated position (left/top)
        menuRef.current.style.transform = '';
        e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation(); // Stop propagation to prevent global hotkeys
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, displayList.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (displayList[selectedIndex]) {
        const selectedType = displayList[selectedIndex].type;
        onAddNode(selectedType);
        saveRecentNode(selectedType);
        onClose();
      }
    }
  };

  const handleClick = (type: NodeType) => {
      onAddNode(type);
      saveRecentNode(type);
      onClose();
  };

  if (!isOpen && !isVisible) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-50 bg-transparent pointer-events-none"
    >
      <div 
        ref={menuRef}
        className={`bg-gray-800 rounded-lg shadow-2xl w-full max-w-md border border-gray-700 flex flex-col pointer-events-auto transition-opacity duration-150 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{ 
            left: menuPos.x, 
            top: menuPos.y,
            position: 'absolute'
        }}
        onMouseDown={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Draggable Header */}
        <div 
            className="flex items-center justify-between px-4 py-3 border-b border-gray-700 cursor-move bg-gray-900/50 rounded-t-lg select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
             <span className="font-bold text-gray-200">{t('hotkeys.windows.search')}</span>
             <div className="text-xs text-gray-500 flex items-center gap-2">
                 <span>ESC to close</span>
                 <button 
                    onClick={onClose} 
                    onPointerDown={(e) => e.stopPropagation()} 
                    className="hover:text-white transition-colors"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
             </div>
        </div>

        <div className="p-4 border-b border-gray-700">
          <input
            ref={inputRef}
            type="text"
            placeholder={t('search.placeholder')}
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full px-3 py-2 bg-gray-900 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            onKeyDown={(e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    onClose();
                }
                e.stopPropagation(); // Stop propagation to prevent global hotkeys
            }}
          />
        </div>
        <ul ref={listRef} className="max-h-80 overflow-y-auto p-2" onWheel={e => e.stopPropagation()}>
          {displayList.length > 0 ? (
            displayList.map((node, index) => {
                const prevNode = index > 0 ? displayList[index - 1] : null;
                const isRecentSection = (node as any).isRecent;
                const prevIsRecent = prevNode ? (prevNode as any).isRecent : false;

                // Logic for headers
                let showHeader = false;
                let headerTitle = '';
                let headerClass = '';

                if (isRecentSection) {
                    if (index === 0) {
                        showHeader = true;
                        headerTitle = 'Recent'; 
                        headerClass = 'bg-gray-700 text-gray-300';
                    }
                } else {
                    // Main list
                    if (!prevNode || prevIsRecent || node.group !== prevNode.group) {
                         // If previous was recent, or group changed
                         showHeader = true;
                         headerTitle = groupTitles[node.group];
                         headerClass = groupStyles[node.group];
                    }
                }

                return (
                    <React.Fragment key={`${node.type}-${index}`}>
                        {showHeader && (
                            <li
                              className={`px-3 py-1 mt-2 mb-1 text-xs font-bold rounded ${headerClass} select-none list-none uppercase tracking-wider`}
                              aria-hidden="true"
                            >
                              {headerTitle}
                            </li>
                        )}
                        <li
                            data-index={index}
                            onClick={() => handleClick(node.type)}
                            onMouseEnter={() => setSelectedIndex(index)}
                            className={`flex items-center space-x-4 p-3 rounded-md cursor-pointer transition-colors duration-150 ${
                            index === selectedIndex ? 'bg-cyan-600' : 'hover:bg-gray-700'
                            }`}
                        >
                            <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded ${index === selectedIndex ? 'text-white' : 'text-gray-300'}`}>
                            {node.icon}
                            </div>
                            <div>
                            <p className={`font-semibold ${index === selectedIndex ? 'text-white' : 'text-gray-100'}`}>{node.title}</p>
                            <p className={`text-sm ${index === selectedIndex ? 'text-cyan-100' : 'text-gray-400'}`}>{node.description}</p>
                            </div>
                        </li>
                    </React.Fragment>
                );
            })
          ) : (
            <li className="p-4 text-center text-gray-500">{t('search.noResults')}</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default QuickSearchMenu;
