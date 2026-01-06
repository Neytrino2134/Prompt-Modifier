
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { NodeType } from '../types';
import { useLanguage } from '../localization';

interface NodeOption {
  type: NodeType;
  title: string;
  icon: React.ReactNode;
  hotkey?: string;
}

interface NodeOptionWithColor extends NodeOption {
    groupColor: string;
    textColor: string;
}

interface RadialGroup {
    name: string;
    options: NodeOption[];
    color: string; 
    textColor: string; 
}

const RADIUS = 150;
const ITEM_SIZE = 50;
const SVG_SIZE = 400;
const SVG_CENTER = SVG_SIZE / 2;
const R_OUTER = 184;
const R_INNER = 116;
const DEAD_ZONE_RADIUS = 60;

interface RadialMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onAddNode: (type: NodeType) => void;
  onSelectItem: (type: NodeType | null) => void;
}

const RadialMenu: React.FC<RadialMenuProps> = ({
  isOpen,
  position,
  onClose,
  onAddNode,
  onSelectItem,
}) => {
    const { t } = useLanguage();
    const [hoveredItem, setHoveredItem] = useState<NodeOptionWithColor | null>(null);

    const nodeGroups: RadialGroup[] = useMemo(() => [
      // 1. Input (Blue)
      { name: t('quickadd.group.inputs' as any), color: 'bg-blue-600', textColor: 'text-blue-400', options: [
        { type: NodeType.TEXT_INPUT, title: t('search.node.text_input.title' as any), icon: <span className="font-bold text-xl leading-none">[T]</span>, hotkey: 'T' },
        { type: NodeType.IMAGE_INPUT, title: t('search.node.image_input.title' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="M21 15l-5-5L5 21"></path></svg>, hotkey: 'I' },
        { type: NodeType.MEDIA_VIEWER, title: t('search.node.media_viewer.title' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, hotkey: 'M' },
        { 
            type: NodeType.PROMPT_SEQUENCE_EDITOR, 
            title: t('search.node.prompt_sequence_editor.title' as any).replace('Sequence', 'Seq.').replace('последовательности', 'послед.'), 
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>, 
            hotkey: 'Q' 
        },
      ]},
      // 2. Processing (Purple)
      { name: t('quickadd.group.processing' as any), color: 'bg-purple-600', textColor: 'text-purple-400', options: [
        { type: NodeType.IMAGE_ANALYZER, title: t('search.node.image_analyzer.title' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12.792V5.25a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 5.25v13.5A2.25 2.25 0 005.25 21h7.55" /><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 18.375L21 21" /></svg>, hotkey: 'Shift + A' },
        { type: NodeType.PROMPT_ANALYZER, title: t('search.node.prompt_analyzer.title' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 14h6M9 11h6M9 8h6" /></svg>, hotkey: 'A' },
        { type: NodeType.PROMPT_PROCESSOR, title: t('search.node.prompt_processor.title' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 22.5l-.648-1.938a3.375 3.375 0 00-2.672-2.672L11.25 18l1.938-.648a3.375 3.375 0 002.672 2.672L16.25 13l.648 1.938a3.375 3.375 0 002.672 2.672L21.75 18l-1.938.648a3.375 3.375 0 00-2.672 2.672z" /></svg>, hotkey: 'P' },
      ]},
      // 3. Character (Pink)
      { name: t('quickadd.group.character' as any), color: 'bg-pink-600', textColor: 'text-pink-400', options: [
        { type: NodeType.CHARACTER_GENERATOR, title: t('search.node.character_generator.title' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>, hotkey: 'Shift + C' },
        { type: NodeType.CHARACTER_ANALYZER, title: t('search.node.character_analyzer.title' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 9a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14.25c-3.1 0-5.88-1.5-7.5-3.75m15 3.75c-1.62-2.25-4.4-3.75-7.5-3.75S6.12 12 4.5 14.25" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" /></svg>, hotkey: 'Ctrl + Shift + A' },
        { type: NodeType.CHARACTER_CARD, title: t('search.node.character_card.title' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 8a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5a7.5 7.5 0 0115 0" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5a.75.75 0 00-.75.75v13.5c0 .414.336.75.75.75h16.5a.75.75 0 00.75-.75V5.25a.75.75 0 00-.75-.75H3.75z" /></svg>, hotkey: 'Ctrl + Shift + C' },
      ]},
      // 4. Output (Teal)
      { name: t('quickadd.group.outputs' as any), color: 'bg-teal-600', textColor: 'text-teal-400', options: [
        { type: NodeType.IMAGE_OUTPUT, title: t('search.node.image_output.title' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>, hotkey: 'O' },
        { type: NodeType.IMAGE_EDITOR, title: t('search.node.image_editor.title' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>, hotkey: 'Shift + I' },
        { 
            type: NodeType.IMAGE_SEQUENCE_GENERATOR, 
            title: t('search.node.image_sequence_generator.title' as any).replace('Sequence', 'Seq.').replace('последовательности', 'послед.'), 
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 5h12M6 9h12M6 13h12M6 17h12M3 3h2.5v18H3zm15.5 0H21v18h-2.5z" /></svg>, 
            hotkey: 'Shift + Q' 
        },
      ]},
      // 5. AI Tools (Green)
      { name: t('quickadd.group.ai' as any), color: 'bg-green-600', textColor: 'text-green-400', options: [
        { type: NodeType.GEMINI_CHAT, title: t('search.node.gemini_chat.title' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, hotkey: 'G' },
        { type: NodeType.TRANSLATOR, title: t('search.node.translator.title' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L12 6l6 12M8 14h8" /></svg>, hotkey: 'L' },
      ]},
      // 6. Scripts (Lime)
      { name: t('quickadd.group.scripts' as any), color: 'bg-lime-600', textColor: 'text-lime-400', options: [
        { type: NodeType.SCRIPT_VIEWER, title: t('search.node.script_viewer.title' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 19.82a2.25 2.25 0 01-1.897 1.13l-2.685.8.8-2.685a2.25 2.25 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>, hotkey: 'Shift + V' },
      ]},
      // 7. Video (Red)
      { name: t('quickadd.group.video' as any), color: 'bg-red-600', textColor: 'text-red-400', options: [
        { type: NodeType.VIDEO_PROMPT_PROCESSOR, title: t('search.node.video_prompt_processor.title' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7l-2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
        </svg>, hotkey: 'Shift + P' },
        { type: NodeType.VIDEO_OUTPUT, title: t('search.node.video_output.title' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" /></svg>, hotkey: 'Shift + O' },
        { type: NodeType.VIDEO_EDITOR, title: t('node.title.video_editor' as any), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>, hotkey: 'E' },
      ]},
    ], [t]);

    const allNodeOptions: NodeOptionWithColor[] = useMemo(() => nodeGroups.flatMap(g => 
        g.options.map(o => ({...o, groupColor: g.color, textColor: g.textColor}))
    ), [nodeGroups]);
    
    const angleStep = (2 * Math.PI) / allNodeOptions.length;

    const handlePointerMove = useCallback((clientX: number, clientY: number) => {
        const dx = clientX - position.x;
        const dy = clientY - position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < DEAD_ZONE_RADIUS) {
            if (hoveredItem !== null) {
                setHoveredItem(null);
                onSelectItem(null);
            }
            return;
        }

        let angle = Math.atan2(dy, dx);
        if (angle < 0) { angle += 2 * Math.PI; }
        const totalItems = allNodeOptions.length;
        const anglePerItem = (2 * Math.PI) / totalItems;
        const startOffset = Math.PI - anglePerItem / 2;
        let relativeAngle = angle - startOffset;
        if (relativeAngle < 0) { relativeAngle += 2 * Math.PI; }
        const index = Math.floor(relativeAngle / anglePerItem) % totalItems;
        const selectedItem = allNodeOptions[index];
        
        if (hoveredItem?.type !== selectedItem.type) {
            setHoveredItem(selectedItem);
            onSelectItem(selectedItem.type);
        }
    }, [allNodeOptions, hoveredItem, onSelectItem, position.x, position.y]);
    
    const handleInteractionEnd = useCallback(() => {
        if (hoveredItem) {
            onAddNode(hoveredItem.type);
        } else {
            onClose();
        }
    }, [hoveredItem, onAddNode, onClose]);

    useEffect(() => {
        if (!isOpen) {
            setHoveredItem(null);
            onSelectItem(null);
            return;
        }

        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        const handleGlobalTouchMove = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        };

        const handleGlobalTouchEnd = () => {
            handleInteractionEnd();
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        window.addEventListener('touchmove', handleGlobalTouchMove);
        window.addEventListener('touchend', handleGlobalTouchEnd);
        window.addEventListener('touchcancel', handleGlobalTouchEnd);

        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown);
            window.removeEventListener('touchmove', handleGlobalTouchMove);
            window.removeEventListener('touchend', handleGlobalTouchEnd);
            window.removeEventListener('touchcancel', handleGlobalTouchEnd);
        };
    }, [isOpen, onClose, handlePointerMove, handleInteractionEnd, onSelectItem]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        handlePointerMove(e.clientX, e.clientY);
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div 
            className="fixed inset-0 z-40"
            onMouseUp={() => handleInteractionEnd()}
            onMouseMove={handleMouseMove}
            onMouseDown={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
        >
            <div
                className="absolute pointer-events-none"
                style={{
                    left: position.x,
                    top: position.y,
                }}
            >
                {/* SVG Background */}
                <svg
                    width={SVG_SIZE}
                    height={SVG_SIZE}
                    className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2"
                    viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
                    style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.1))' }}
                >
                    <defs>
                        <mask id="donut-mask">
                            <rect width="100%" height="100%" fill="white" />
                            <circle cx={SVG_CENTER} cy={SVG_CENTER} r={R_INNER} fill="black" />
                        </mask>
                    </defs>
                    <circle 
                        cx={SVG_CENTER} 
                        cy={SVG_CENTER} 
                        r={R_OUTER} 
                        fill="rgba(17, 24, 39, 0.85)" 
                        mask="url(#donut-mask)" 
                        stroke="rgb(75, 85, 99)"
                        strokeWidth="1"
                    />
                    <circle
                        cx={SVG_CENTER}
                        cy={SVG_CENTER}
                        r={R_INNER}
                        fill="none"
                        stroke="rgb(75, 85, 99)"
                        strokeWidth="1"
                    />
                </svg>

                {/* Central Tooltip */}
                <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none w-48 h-48">
                    <div
                        className={`flex items-center justify-center w-20 h-20 rounded-lg mb-2 transition-all duration-200 ease-in-out shadow-lg border-2 border-white/10 ${hoveredItem ? `opacity-100 scale-100 ${hoveredItem.groupColor}` : 'opacity-0 scale-90'}`}
                    >
                        {hoveredItem && (
                            <div className="text-white">
                                {hoveredItem.icon}
                            </div>
                        )}
                    </div>
                    <div className="bg-gray-900/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-center transition-opacity duration-200 flex flex-col items-center" style={{ opacity: hoveredItem ? 1 : 0 }}>
                        <span className="text-sm font-semibold whitespace-nowrap">{hoveredItem?.title}</span>
                        {hoveredItem?.hotkey && <span className="text-xs text-gray-400 font-mono mt-0.5">{hoveredItem.hotkey}</span>}
                    </div>
                </div>


                {/* Menu Items */}
                {allNodeOptions.map((option, index) => {
                    const angle = angleStep * index + Math.PI; // Start from the left (PI radians) and go CCW
                    const itemX = RADIUS * Math.cos(angle);
                    const itemY = RADIUS * Math.sin(angle);
                    const isHovered = hoveredItem?.type === option.type;

                    return (
                        <div
                            key={option.type}
                            className={`absolute flex items-center justify-center rounded-full transition-all duration-200 ease-in-out ${isHovered ? option.groupColor : ''} ${!isHovered ? option.textColor : 'text-white'}`}
                            style={{
                                width: ITEM_SIZE,
                                height: ITEM_SIZE,
                                top: 0,
                                left: 0,
                                transform: `translate(-50%, -50%) translate(${itemX}px, ${itemY}px) scale(${isHovered ? 1.25 : 1})`,
                                zIndex: isHovered ? 10 : 1,
                            }}
                        >
                            {option.icon}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RadialMenu;
