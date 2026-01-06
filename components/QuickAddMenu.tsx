
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { NodeType, Tool } from '../types';
import { useLanguage, TranslationKey } from '../localization';
import { PinIcon } from './icons/AppIcons';

interface QuickAddMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onAddNode: (type: NodeType) => void;
  onToolChange: (tool: Tool) => void;
  activeTool: Tool;
  isPinned?: boolean;
  onPinToggle?: () => void;
  onPaste?: () => void;
}

const QuickAddItem: React.FC<{ title: string; onClick: () => void; children: React.ReactNode; isActive: boolean; }> = ({ title, onClick, children, isActive }) => {
    const [isTooltipVisible, setIsTooltipVisible] = useState(false);
    return (
        <div 
            className="relative flex items-center"
            onMouseEnter={() => setIsTooltipVisible(true)}
            onMouseLeave={() => setIsTooltipVisible(false)}
        >
            <button
                onClick={onClick}
                aria-label={title}
                className={`flex items-center justify-center w-9 h-9 p-2 rounded-md transition-colors text-gray-300 hover:text-white ${isActive ? 'bg-accent text-white' : 'bg-input hover:bg-accent'}`}
            >
                {children}
            </button>
            <div
              className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-700 text-slate-200 text-sm whitespace-nowrap rounded-md shadow-xl z-50 transition-opacity duration-200 opacity-0 pointer-events-none group-hover:opacity-100`}
              role="tooltip"
            >
              {title}
            </div>
        </div>
    );
};

interface QuickAddMenuItem {
    type: 'tool' | 'node';
    id: Tool | NodeType;
    title: string;
    icon: React.ReactNode;
}

interface QuickAddMenuGroup {
    items: QuickAddMenuItem[];
}

const QuickAddMenu: React.FC<QuickAddMenuProps> = ({ isOpen, position, onClose, onAddNode, onToolChange, activeTool, isPinned, onPinToggle, onPaste }) => {
    const { t } = useLanguage();
    const menuRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0, pointerEvents: 'none' });
    const [isPinHovered, setIsPinHovered] = useState(false);
    
    // Dragging state
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const dragStartRef = useRef<{x: number, y: number} | null>(null);
    const isDraggingRef = useRef(false);

    useEffect(() => {
        if (isOpen) {
            setOffset({ x: 0, y: 0 });
            
            if (menuRef.current) {
                const menuRect = menuRef.current.getBoundingClientRect();
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                const offsetVal = 20;

                const positions = [
                    { left: position.x + offsetVal, top: position.y + offsetVal },
                    { left: position.x - menuRect.width - offsetVal, top: position.y + offsetVal },
                    { left: position.x + offsetVal, top: position.y - menuRect.height - offsetVal },
                    { left: position.x - menuRect.width - offsetVal, top: position.y - menuRect.height - offsetVal },
                ];

                let bestPosition: { left: number; top: number } | null = null;

                for (const pos of positions) {
                    const potentialRect = {
                        left: pos.left,
                        top: pos.top,
                        right: pos.left + menuRect.width,
                        bottom: pos.top + menuRect.height,
                    };
                    
                    const isInBounds = potentialRect.left >= offsetVal &&
                                       potentialRect.right <= windowWidth - offsetVal &&
                                       potentialRect.top >= offsetVal &&
                                       potentialRect.bottom <= windowHeight - offsetVal;

                    if (isInBounds) {
                        bestPosition = pos;
                        break;
                    }
                }

                if (!bestPosition) {
                    bestPosition = positions.find(pos => {
                         const rect = { left: pos.left, top: pos.top, right: pos.left + menuRect.width, bottom: pos.top + menuRect.height };
                         return rect.left >= 0 && rect.right <= windowWidth && rect.top >= 0 && rect.bottom <= windowHeight;
                    }) || positions[0]; 
                }
                
                if (bestPosition.left + menuRect.width > windowWidth) bestPosition.left = windowWidth - menuRect.width - offsetVal;
                if (bestPosition.top + menuRect.height > windowHeight) bestPosition.top = windowHeight - menuRect.height - offsetVal;
                if (bestPosition.left < 0) bestPosition.left = offsetVal;
                if (bestPosition.top < 0) bestPosition.top = offsetVal;

                setStyle({ 
                    left: bestPosition.left, 
                    top: bestPosition.top, 
                    position: 'fixed', 
                    opacity: 1, 
                    transition: 'opacity 150ms ease-in-out' 
                });
            }
        } else {
            setStyle({ opacity: 0, pointerEvents: 'none' });
        }
    }, [isOpen, position]); 

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.stopPropagation(); 

        const target = e.target as HTMLElement;
        if (target.closest('button')) return; 

        e.preventDefault();
        
        e.currentTarget.setPointerCapture(e.pointerId);
        dragStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
        isDraggingRef.current = true;
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (dragStartRef.current) {
            setOffset({
                x: e.clientX - dragStartRef.current.x,
                y: e.clientY - dragStartRef.current.y
            });
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        isDraggingRef.current = false;
        dragStartRef.current = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    const handlePasteClick = () => {
        if (onPaste) {
            onPaste();
            onClose();
        }
    };

    const menuGroups: Record<string, QuickAddMenuGroup> = useMemo(() => ({
      tools: {
        items: [
          { type: 'tool', id: 'edit', title: t('quickadd.tool.edit' as TranslationKey), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> },
          { type: 'tool', id: 'cutter', title: t('quickadd.tool.cutter' as TranslationKey), icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
          { type: 'tool', id: 'selection', title: t('quickadd.tool.selection' as TranslationKey), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" d="M3.75 3.75h16.5v16.5H3.75z" /></svg> },
        ]
      },
      inputs: {
        items: [
          { type: 'node', id: NodeType.TEXT_INPUT, title: t('search.node.text_input.title' as TranslationKey), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 6h10M12 6v12" /></svg> },
          { type: 'node', id: NodeType.IMAGE_INPUT, title: t('search.node.image_input.title' as TranslationKey), icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="M21 15l-5-5L5 21"></path></svg> },
          { type: 'node', id: NodeType.MEDIA_VIEWER, title: t('search.node.media_viewer.title' as TranslationKey), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        ]
      },
      processing: {
        items: [
          { type: 'node', id: NodeType.PROMPT_PROCESSOR, title: t('search.node.prompt_processor.title' as TranslationKey), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
          { type: 'node', id: NodeType.PROMPT_ANALYZER, title: t('search.node.prompt_analyzer.title' as TranslationKey), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 14h6M9 11h6M9 8h6" /></svg> },
          { type: 'node', id: NodeType.IMAGE_ANALYZER, title: t('search.node.image_analyzer.title' as TranslationKey), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12.792V5.25a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 5.25v13.5A2.25 2.25 0 005.25 21h7.55" /><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 18.375L21 21" /></svg> },
        ]
      },
      character: {
        items: [
          { type: 'node', id: NodeType.CHARACTER_GENERATOR, title: t('search.node.character_generator.title' as TranslationKey), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg> },
          { type: 'node', id: NodeType.CHARACTER_ANALYZER, title: t('search.node.character_analyzer.title' as TranslationKey), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 9a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14.25c-3.1 0-5.88-1.5-7.5-3.75m15 3.75c-1.62-2.25-4.4-3.75-7.5-3.75S6.12 12 4.5 14.25" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" /></svg> },
          { type: 'node', id: NodeType.CHARACTER_CARD, title: t('search.node.character_card.title' as TranslationKey), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 8a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5a7.5 7.5 0 0115 0" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5a.75.75 0 00-.75.75v13.5c0 .414.336.75.75.75h16.5a.75.75 0 00.75-.75V5.25a.75.75 0 00-.75-.75H3.75z" /></svg> },
        ]
      },
      outputs: {
        items: [
          { type: 'node', id: NodeType.IMAGE_OUTPUT, title: t('search.node.image_output.title' as TranslationKey), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg> },
          { type: 'node', id: NodeType.IMAGE_EDITOR, title: t('search.node.image_editor.title' as TranslationKey), icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg> },
          { 
            type: 'node',
            id: NodeType.IMAGE_SEQUENCE_GENERATOR, 
            title: t('search.node.image_sequence_generator.title' as TranslationKey).replace('Sequence', 'Seq.').replace('последовательности', 'послед.'), 
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 5h12M6 9h12M6 13h12M6 17h12M3 3h2.5v18H3zm15.5 0H21v18h-2.5z" /></svg> 
          },
        ]
      },
      ai: {
        items: [
           { type: 'node', id: NodeType.GEMINI_CHAT, title: t('search.node.gemini_chat.title' as TranslationKey), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
           { type: 'node', id: NodeType.TRANSLATOR, title: t('search.node.translator.title' as TranslationKey), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L12 6l6 12M8 14h8" /></svg> },
           { type: 'node', id: NodeType.PROMPT_SANITIZER, title: t('search.node.prompt_sanitizer.title' as TranslationKey), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 22.5l-.648-1.938a3.375 3.375 0 00-2.672-2.672L11.25 18l1.938-.648a3.375 3.375 0 002.672 2.672L16.25 13l.648 1.938a3.375 3.375 0 002.672 2.672L21.75 18l-1.938.648a3.375 3.375 0 00-2.672 2.672z" /></svg> },
        ]
      },
      video: {
        items: [
           { type: 'node', id: NodeType.VIDEO_PROMPT_PROCESSOR, title: t('search.node.video_prompt_processor.title' as TranslationKey), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
             <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
             <path strokeLinecap="round" strokeLinejoin="round" d="M12 7l-2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
           </svg> },
           { type: 'node', id: NodeType.VIDEO_OUTPUT, title: t('search.node.video_output.title' as TranslationKey), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" /></svg> },
           { type: 'node', id: NodeType.VIDEO_EDITOR, title: t('node.title.video_editor' as TranslationKey), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
             <path strokeLinecap="round" strokeLinejoin="round" d="M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" />
             <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
           </svg> },
        ]
      },
      scripts: {
        items: [
           { type: 'node', id: NodeType.SCRIPT_GENERATOR, title: t('search.node.script_generator.title' as TranslationKey), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h.01M15 12h.01M10.5 16.5h3M15 19.5h-6a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 018.25 4.5h7.5a2.25 2.25 0 012.25 2.25v10.5A2.25 2.25 0 0115.75 19.5h-1.5" /></svg> },
           { type: 'node', id: NodeType.SCRIPT_VIEWER, title: t('search.node.script_viewer.title' as TranslationKey), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 19.82a2.25 2.25 0 01-1.897 1.13l-2.685.8.8-2.685a2.25 2.25 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg> },
        ]
      },
      general: {
        items: [
          { type: 'node', id: NodeType.NOTE, title: t('search.node.note.title' as TranslationKey), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg> },
          { type: 'node', id: NodeType.DATA_READER, title: t('search.node.data_reader.title' as TranslationKey), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
          { type: 'node', id: NodeType.PROMPT_SEQUENCE_EDITOR, title: t('search.node.prompt_sequence_editor.title' as TranslationKey), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg> },
        ]
      },
    }), [t]);

    const handleClick = (item: QuickAddMenuItem) => {
        if (item.type === 'tool') {
            onToolChange(item.id as Tool);
        } else if (item.type === 'node') {
            onAddNode(item.id as NodeType);
        }
        onClose();
    };
    
    const groupKeys = Object.keys(menuGroups);
    const column1Keys = groupKeys.slice(0, 5);
    const column2Keys = groupKeys.slice(5);

    const renderGroup = (groupKey: string) => {
        const group = menuGroups[groupKey];
        return (
            <div key={groupKey}>
                <h3 className="text-xs text-gray-400 uppercase font-bold mb-1 px-1 select-none">{t(`quickadd.group.${groupKey}` as TranslationKey)}</h3>
                <div className="flex flex-wrap gap-1">
                    {group.items.map(item => (
                        <QuickAddItem 
                            key={item.id} 
                            title={item.title} 
                            onClick={() => handleClick(item)}
                            isActive={item.type === 'tool' && item.id === activeTool}
                        >
                            {item.icon}
                        </QuickAddItem>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div
            ref={menuRef}
            className="fixed bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-2xl border border-node-border p-2 flex flex-col w-auto z-[51]"
            style={{
                ...style,
                transform: `translate(${offset.x}px, ${offset.y}px)`
            }}
            onMouseDown={(e) => e.stopPropagation()} 
        >
            {/* Header with Drag Handle */}
            <div
                className="flex items-center justify-between px-1 pb-2 mb-1 border-b border-node-border cursor-move"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                <span className="text-sm font-bold text-gray-300 select-none">{t('quickadd.title' as TranslationKey)}</span>
                
                <div 
                    className="relative flex items-center"
                    onMouseEnter={() => setIsPinHovered(true)}
                    onMouseLeave={() => setIsPinHovered(false)}
                >
                    <button 
                        onClick={(e) => { e.stopPropagation(); onPinToggle && onPinToggle(); }}
                        className={`p-1 rounded hover:bg-white/10 transition-colors ${isPinned ? 'text-accent' : 'text-gray-500 hover:text-gray-300'}`}
                        onMouseDown={(e) => e.stopPropagation()} 
                    >
                        <PinIcon className="h-4 w-4" />
                    </button>
                    <div
                      className={`absolute top-full right-0 mt-2 px-3 py-1.5 bg-slate-700 text-slate-200 text-sm whitespace-nowrap rounded-md shadow-xl z-50 transition-opacity duration-200 opacity-0 pointer-events-none origin-top-right transform ${isPinHovered ? 'opacity-100 scale-100' : 'scale-90'}`}
                      role="tooltip"
                    >
                      {isPinned ? "Unpin menu" : "Pin menu to screen"}
                    </div>
                </div>
            </div>

            <div className="flex space-x-4 p-1">
                <div className="flex flex-col space-y-3">
                    {column1Keys.map(renderGroup)}
                </div>
                <div className="flex flex-col space-y-3">
                    {column2Keys.map(renderGroup)}
                </div>
            </div>

             {/* Footer with Paste Action */}
            {onPaste && (
                <div className="mt-2 pt-2 border-t border-node-border">
                    <button 
                        onClick={handlePasteClick}
                        className="w-full flex items-center justify-center p-2 rounded-md bg-input hover:bg-accent text-gray-300 hover:text-white transition-colors gap-2 group"
                        title={t('node.action.paste')}
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span className="text-xs font-bold uppercase tracking-wider">{t('node.action.paste')}</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default QuickAddMenu;
