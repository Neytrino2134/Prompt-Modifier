
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { NodeType, Tool, Point } from '../types';
import { useLanguage } from '../localization';
import { ContextMenuButton } from './context-menu/ContextMenuButton';
import { AssignSlotMenu } from './context-menu/AssignSlotMenu';
import { getToolIcon, getNodeIcon, getNodeTitle } from './context-menu/ContextMenuUtils';
import { PinIcon } from './icons/AppIcons';

interface ContextMenuProps {
  isOpen: boolean;
  position: Point;
  onClose: (force?: boolean) => void;
  onToolSelect: (tool: Tool) => void;
  slots: (NodeType | null)[];
  onSlotUpdate: (index: number, type: NodeType) => void;
  onSetSlots?: (slots: (NodeType | null)[]) => void;
  onAddNode: (type: NodeType) => void;
  isPinned?: boolean;
  onPinToggle?: () => void;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  scaleToSliderValue?: (scale: number) => number;
  sliderValueToScale?: (value: number) => number;
  onPaste?: () => void;
}

const MAIN_MENU_HEIGHT = 280; 
const MENU_WIDTH = 176; 

export const ContextMenu: React.FC<ContextMenuProps> = ({ isOpen, position, onClose, onToolSelect, slots, onSlotUpdate, onSetSlots, onAddNode, isPinned, onPinToggle, zoom, onZoomChange, scaleToSliderValue, sliderValueToScale, onPaste }) => {
  const { t } = useLanguage();
  const [pickingForSlot, setPickingForSlot] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Transition State
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({ 
      opacity: 0, 
      pointerEvents: 'none',
      transform: 'scale(0.95)',
      transition: 'opacity 0.15s ease-out, transform 0.15s ease-out'
  });

  // Dragging State
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef<{x: number, y: number} | null>(null);
  const isDraggingRef = useRef(false);

  // File loading
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (isOpen) {
          setPickingForSlot(null);
          setOffset({ x: 0, y: 0 });
          
          let x = position.x;
          let y = position.y;
          
          if (x + MENU_WIDTH > window.innerWidth) x = x - MENU_WIDTH;
          if (y + MAIN_MENU_HEIGHT > window.innerHeight) y = y - MAIN_MENU_HEIGHT;

          requestAnimationFrame(() => {
              setMenuStyle({
                  opacity: 1,
                  pointerEvents: 'auto',
                  transform: 'scale(1)',
                  transition: 'opacity 0.15s ease-out, transform 0.15s ease-out'
              });
          });
      } else {
          setMenuStyle({ 
              opacity: 0, 
              pointerEvents: 'none',
              transform: 'scale(0.95)',
              transition: 'opacity 0.1s ease-in, transform 0.1s ease-in'
          });
      }
  }, [isOpen, position]); 

  useEffect(() => {
    const handleGlobalMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && !isDraggingRef.current) {
        onClose();
      }
    };
    
    if (isOpen && !isPinned) {
      window.addEventListener('mousedown', handleGlobalMouseDown);
    }
    return () => window.removeEventListener('mousedown', handleGlobalMouseDown);
  }, [isOpen, onClose, isPinned]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault(); e.stopPropagation();
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

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onZoomChange && sliderValueToScale) {
        onZoomChange(sliderValueToScale(Number(e.target.value)));
    }
  };
  
  const resetZoom = () => {
      if (onZoomChange) onZoomChange(1);
  }

  const handleToolClick = (tool: Tool) => {
    onToolSelect(tool);
    onClose();
  };
  
  const handlePasteClick = () => {
    if (onPaste) {
        onPaste();
        onClose();
    }
  };

  const handleSlotLeftClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const assignedType = slots[index];
    if (assignedType) {
        onAddNode(assignedType);
        onClose();
    } else {
        setPickingForSlot(index);
    }
  };

  const handleSlotRightClick = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPickingForSlot(index);
  };

  const handleNodeSelect = (type: NodeType) => {
      if (pickingForSlot !== null) {
          onSlotUpdate(pickingForSlot, type);
          setPickingForSlot(null);
      }
  };

  const handleSaveSlots = () => {
      const json = JSON.stringify(slots, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'prompt-modifier-slots.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleLoadClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const parsed = JSON.parse(event.target?.result as string);
              if (Array.isArray(parsed) && parsed.length === 8 && onSetSlots) {
                  onSetSlots(parsed);
              } else {
                  alert("Invalid slots file format");
              }
          } catch (err) {
              console.error(err);
              alert("Failed to load slots file");
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  const nodeGroups: Record<string, NodeType[]> = useMemo(() => ({
      inputs: [NodeType.TEXT_INPUT, NodeType.IMAGE_INPUT, NodeType.PROMPT_SEQUENCE_EDITOR, NodeType.DATA_READER, NodeType.NOTE, NodeType.MEDIA_VIEWER],
      processing: [NodeType.PROMPT_PROCESSOR, NodeType.PROMPT_ANALYZER, NodeType.IMAGE_ANALYZER, NodeType.PROMPT_SANITIZER],
      character: [NodeType.CHARACTER_GENERATOR, NodeType.CHARACTER_ANALYZER, NodeType.CHARACTER_CARD, NodeType.POSE_CREATOR],
      outputs: [NodeType.IMAGE_OUTPUT, NodeType.IMAGE_EDITOR, NodeType.IMAGE_SEQUENCE_GENERATOR],
      ai: [NodeType.GEMINI_CHAT, NodeType.TRANSLATOR],
      video: [NodeType.VIDEO_PROMPT_PROCESSOR, NodeType.VIDEO_OUTPUT, NodeType.SCRIPT_GENERATOR, NodeType.SCRIPT_VIEWER, NodeType.VIDEO_EDITOR],
  }), []);

  let initialX = position.x;
  let initialY = position.y;
  if (initialX + MENU_WIDTH > window.innerWidth) initialX = initialX - MENU_WIDTH;
  if (initialY + MAIN_MENU_HEIGHT > window.innerHeight) initialY = initialY - MAIN_MENU_HEIGHT;

  const finalX = initialX + offset.x;
  const finalY = initialY + offset.y;
  
  const sliderVal = scaleToSliderValue && zoom ? scaleToSliderValue(zoom) : 0;
  const zoomPercent = Math.round((zoom || 1) * 100);

  if (!isOpen) return null;

  return (
    <div 
        ref={menuRef}
        className="fixed z-[60] w-44" 
        style={{
            ...menuStyle,
            left: finalX,
            top: finalY,
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
    >
        <div className="bg-gray-800 rounded-lg shadow-2xl w-full relative z-10 flex flex-col">
            
            <div 
                className="flex items-center justify-between px-2 py-2 cursor-move select-none border-b border-gray-700 rounded-t-lg"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
               <span className="text-xs font-bold text-gray-400 pl-1">{t('quickadd.group.tools')}</span>
               <ContextMenuButton 
                    onClick={(e) => { e.stopPropagation(); onPinToggle && onPinToggle(); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`p-1 rounded hover:bg-white/10 transition-colors ${isPinned ? 'text-accent' : 'text-gray-500 hover:text-gray-300'}`}
                    tooltip={isPinned ? "Unpin menu" : "Pin menu to screen"}
                    tooltipPosition="bottom"
                >
                  <PinIcon className="h-4 w-4" />
               </ContextMenuButton>
            </div>

            <div className="p-2 grid grid-cols-4 gap-1">
                <ContextMenuButton onClick={() => handleToolClick('edit')} className="flex items-center justify-center rounded-md bg-input/50 text-gray-300 hover:bg-accent hover:text-white transition-colors h-9 w-9" tooltip={t('toolbar.edit')}>
                    {getToolIcon('edit')}
                </ContextMenuButton>
                <ContextMenuButton onClick={() => handleToolClick('cutter')} className="flex items-center justify-center rounded-md bg-input/50 text-gray-300 hover:bg-accent hover:text-white transition-colors h-9 w-9" tooltip={t('toolbar.cutter')}>
                    {getToolIcon('cutter')}
                </ContextMenuButton>
                <ContextMenuButton onClick={() => handleToolClick('selection')} className="flex items-center justify-center rounded-md bg-input/50 text-gray-300 hover:bg-accent hover:text-white transition-colors h-9 w-9" tooltip={t('toolbar.selection')}>
                    {getToolIcon('selection')}
                </ContextMenuButton>
                <ContextMenuButton onClick={() => handleToolClick('reroute')} className="flex items-center justify-center rounded-md bg-input/50 text-gray-300 hover:bg-accent hover:text-white transition-colors h-9 w-9" tooltip={t('toolbar.reroute')}>
                    {getToolIcon('reroute')}
                </ContextMenuButton>
            </div>

            <div className="h-px bg-gray-700 w-full"></div>
            
            <div className="p-2 grid grid-cols-4 gap-1">
                {slots.map((slotType, index) => (
                    <div 
                        key={index}
                        className="relative group"
                        onContextMenu={(e) => handleSlotRightClick(index, e)}
                        onClick={(e) => handleSlotLeftClick(index, e)}
                    >
                         <button className={`w-9 h-9 rounded-md flex items-center justify-center border transition-colors ${slotType ? 'bg-input/50 border-node-border text-gray-200 hover:bg-accent hover:text-white hover:border-accent' : 'bg-input/30 border-node-border border-dashed text-gray-600 hover:border-gray-500'}`}>
                             {slotType ? getNodeIcon(slotType) : <span className="text-[10px] font-mono">{index + 1}</span>}
                         </button>
                         <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-700 text-slate-200 text-xs whitespace-nowrap rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[70]">
                             {slotType ? getNodeTitle(slotType, t) : t('contextMenu.emptySlot')}
                         </div>
                    </div>
                ))}
            </div>

            {pickingForSlot !== null && (
                 <AssignSlotMenu 
                    onClose={() => setPickingForSlot(null)}
                    slotIndex={pickingForSlot}
                    onSelect={handleNodeSelect}
                    nodeGroups={nodeGroups}
                    t={t}
                 />
            )}

             <div className="h-px bg-gray-700 w-full"></div>

             <div className="p-2 space-y-2">
                 {onZoomChange && sliderValueToScale && (
                     <div className="flex items-center space-x-2">
                         <ContextMenuButton 
                            onClick={resetZoom} 
                            className="flex items-center space-x-1 px-1.5 py-1 rounded bg-input/50 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-transparent hover:border-node-border" 
                            tooltip={t('toolbar.resetZoom')}
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <span className="text-[10px] font-mono min-w-[3ch] text-right">{zoomPercent}%</span>
                         </ContextMenuButton>
                         <input
                            type="range"
                            min="-100"
                            max="100"
                            step="1"
                            value={sliderVal}
                            onChange={handleSliderChange}
                            className="w-full h-1.5 bg-node-border rounded-lg appearance-none cursor-pointer accent-accent"
                        />
                     </div>
                 )}

                 <div className="flex justify-between items-center pt-1">
                     <div className="flex space-x-1">
                        <ContextMenuButton onClick={handleSaveSlots} className="p-1.5 rounded bg-input hover:bg-white/10 text-gray-400 hover:text-white transition-colors" tooltip={t('contextMenu.saveSlots')}>
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </ContextMenuButton>
                        <ContextMenuButton onClick={handleLoadClick} className="p-1.5 rounded bg-input hover:bg-white/10 text-gray-400 hover:text-white transition-colors" tooltip={t('contextMenu.loadSlots')}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                            </svg>
                        </ContextMenuButton>
                         <input 
                            ref={fileInputRef}
                            type="file" 
                            accept=".json" 
                            className="hidden" 
                            onChange={handleFileChange} 
                        />
                     </div>
                     {onPaste && (
                        <ContextMenuButton 
                            onClick={handlePasteClick}
                            className="px-2 py-1 rounded bg-input hover:bg-accent text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                            tooltip={t('node.action.paste')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            {t('node.action.paste')}
                        </ContextMenuButton>
                     )}
                 </div>
             </div>
        </div>
    </div>
  );
};
