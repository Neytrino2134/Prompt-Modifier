
import React from 'react';
import { Node, NodeType, ToastType, DockMode } from '../../types';
import { ActionButton } from '../ActionButton';
import { Tooltip } from '../Tooltip';
import { useLanguage } from '../../localization';
import { HEADER_HEIGHT, isRestrictedDockingNode } from '../../utils/nodeUtils';
import { CopyIcon, DetachIcon, PinLeftIcon, PinRightIcon, FullScreenIcon, ExitFullScreenIcon, PinIcon, EyeIcon, EyeOffIcon, PhotoIcon } from '../icons/AppIcons';
import { useAppContext } from '../../contexts/AppContext';

interface NodeHeaderProps {
  node: Node;
  isDockedWindow: boolean;
  isRerouteDot: boolean;
  headerBgClass: string;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onTouchStart?: (e: React.TouchEvent<HTMLDivElement>) => void;
  onMouseUp?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onToggleCollapse: (nodeId: string) => void;
  onRenameNode: (nodeId: string, currentTitle: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onCutConnections: (nodeId: string) => void;
  onDuplicateNode: (nodeId: string) => void;
  onDuplicateNodeWithContent: (nodeId: string) => void;
  onCopyNodeValue: (nodeId: string) => void;
  onPasteNodeValue: (nodeId: string) => Promise<void>;
  onPasteImage: (nodeId: string, imageFile?: File | null) => Promise<void>;
  onDownloadImage: (nodeId: string) => void;
  onRefreshImageEditor: (nodeId: string) => void;
  onRefreshChat: (nodeId: string) => void;
  onValueChange: (nodeId: string, value: string) => void;
  clearImagesForNodeFromCache: (nodeId: string) => void;
  addToast: (message: string, type?: ToastType) => void;
  getEmptyValueForNodeType: (node: Node) => string;
  // Specific handlers
  onSaveSequenceToCatalog?: (nodeId: string) => void;
  onSaveScriptToDisk?: (nodeId: string) => void;
  onSaveMediaToDisk?: (nodeId: string) => void;
  onSaveCharacterToCatalog?: (nodeId: string) => void;
  onSaveCharacterCard?: (nodeId: string) => void;
  handleUndockNode?: (nodeId: string) => void;
  handleOpenNodeContextMenu?: (e: React.MouseEvent, nodeId: string) => void;
  handleRequestDelete: (e: React.MouseEvent) => void;
  handleDetachNodeFromGroup: (nodeId: string) => void;
  isInstantCloseEnabled?: boolean;
  onToggleCharacterImages?: () => void;
  allImagesCollapsed?: boolean;
}

export const NodeHeader: React.FC<NodeHeaderProps> = ({
  node,
  isDockedWindow,
  isRerouteDot,
  headerBgClass,
  onMouseDown,
  onTouchStart,
  onMouseUp,
  onDoubleClick,
  onToggleCollapse,
  onRenameNode,
  onCutConnections,
  onDuplicateNode,
  onDuplicateNodeWithContent,
  onCopyNodeValue,
  onPasteNodeValue,
  onPasteImage,
  onDownloadImage,
  onRefreshImageEditor,
  onRefreshChat,
  onValueChange,
  clearImagesForNodeFromCache,
  addToast,
  getEmptyValueForNodeType,
  onSaveSequenceToCatalog,
  onSaveScriptToDisk,
  onSaveMediaToDisk,
  onSaveCharacterToCatalog,
  onSaveCharacterCard,
  handleUndockNode,
  handleOpenNodeContextMenu,
  handleRequestDelete,
  isInstantCloseEnabled,
  onToggleCharacterImages,
  allImagesCollapsed
}) => {
  const { t } = useLanguage();
  const context = useAppContext();
  const { handleDockNode, toggleNodeFullScreen, focusedNodeId, handleToggleNodePin, handleToggleNodeHandles } = context || {};
  
  const isFullScreen = focusedNodeId === node.id;
  const isRestricted = isRestrictedDockingNode(node.type);

  // Note Specific Logic
  const isNote = node.type === NodeType.NOTE;
  let isNoteMinimal = false;
  let noteData: any = {};
  if (isNote) {
      try {
          noteData = JSON.parse(node.value || '{}');
          isNoteMinimal = !!noteData.isMinimal;
      } catch {}
  }

  const handleToggleNoteMinimal = (e: React.MouseEvent) => {
      e.stopPropagation();
      const newData = { ...noteData, isMinimal: !isNoteMinimal };
      onValueChange(node.id, JSON.stringify(newData));
  };

  const hasImageContent = React.useMemo(() => {
    if (node.type === NodeType.IMAGE_OUTPUT || node.type === NodeType.VIDEO_OUTPUT) return !!node.value;
    if (node.type === NodeType.IMAGE_INPUT || node.type === NodeType.IMAGE_ANALYZER || node.type === NodeType.IMAGE_EDITOR || node.type === NodeType.CHARACTER_CARD || node.type === NodeType.DATA_READER) {
        try {
            const parsed = JSON.parse(node.value || '{}');
            return !!parsed.image || (parsed.inputImages && parsed.inputImages.length > 0) || !!parsed.outputImage;
        } catch {
            if (node.type === NodeType.IMAGE_INPUT) return !!node.value;
            return false;
        }
    }
    return false;
  }, [node.type, node.value]);

  const helpTexts = React.useMemo(() => ({
    [NodeType.TEXT_INPUT]: t('node.help.text_input'),
    [NodeType.IMAGE_INPUT]: t('node.help.image_input'),
    [NodeType.PROMPT_PROCESSOR]: t('node.help.prompt_processor'),
    [NodeType.PROMPT_SANITIZER]: t('node.help.prompt_sanitizer'),
    [NodeType.VIDEO_PROMPT_PROCESSOR]: t('node.help.video_prompt_processor'),
    [NodeType.IMAGE_OUTPUT]: t('node.help.image_output'),
    [NodeType.VIDEO_OUTPUT]: t('node.help.video_output'),
    [NodeType.PROMPT_ANALYZER]: t('node.help.prompt_analyzer'),
    [NodeType.CHARACTER_ANALYZER]: t('node.help.character_analyzer'),
    [NodeType.CHARACTER_GENERATOR]: t('node.help.character_generator'),
    [NodeType.CHARACTER_CARD]: t('node.help.character_card'),
    [NodeType.IMAGE_ANALYZER]: t('node.help.image_analyzer'),
    [NodeType.IMAGE_EDITOR]: t('node.help.image_editor'),
    [NodeType.IMAGE_SEQUENCE_GENERATOR]: t('node.help.image_sequence_generator'),
    [NodeType.PROMPT_SEQUENCE_EDITOR]: t('node.help.prompt_sequence_editor'),
    [NodeType.GEMINI_CHAT]: t('node.help.gemini_chat'),
    [NodeType.TRANSLATOR]: t('node.help.translator'),
    [NodeType.SCRIPT_GENERATOR]: t('node.help.script_generator'),
    [NodeType.SCRIPT_VIEWER]: t('node.help.script_viewer'),
    [NodeType.NOTE]: t('node.help.note'),
    [NodeType.REROUTE_DOT]: t('node.help.reroute_dot'),
    [NodeType.DATA_READER]: t('node.help.data_reader'),
    [NodeType.VIDEO_EDITOR]: t('node.help.video_editor'),
    [NodeType.MEDIA_VIEWER]: t('node.help.media_viewer'),
  }), [t]);

  const handleClearContent = (e: React.MouseEvent) => {
      e.stopPropagation();
      onValueChange(node.id, getEmptyValueForNodeType(node));
      if (node.type === NodeType.IMAGE_INPUT || node.type === NodeType.IMAGE_OUTPUT || node.type === NodeType.IMAGE_ANALYZER || node.type === NodeType.IMAGE_SEQUENCE_GENERATOR) {
          clearImagesForNodeFromCache(node.id);
      }
      addToast(t('toast.contentCleared'));
  };
  
  const handleFullFocus = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (handleDockNode) handleDockNode(node.id, 'full');
      if (toggleNodeFullScreen) {
          setTimeout(() => toggleNodeFullScreen(node.id), 50);
      }
  };

  const handleDockCycle = (direction: number) => {
      if (!handleDockNode || !node.dockState) return;
      const modes: string[] = ['q1', 'q2', 'q3', 'q4'];
      const currentMode = node.dockState.mode;
      let index = modes.indexOf(currentMode);
      if (index === -1) {
          if (['left', 'tl', 'bl'].includes(currentMode)) index = 0; 
          else if (['right', 'tr', 'br'].includes(currentMode)) index = 3; 
          else index = 0; 
      }
      let newIndex = index + direction;
      if (newIndex < 0) newIndex = 0;
      if (newIndex >= modes.length) newIndex = modes.length - 1;
      if (modes[newIndex] !== currentMode) {
          handleDockNode(node.id, modes[newIndex] as DockMode);
      }
  };

  const handleVerticalDockCycle = (side: 'left' | 'right') => {
      if (!handleDockNode || !node.dockState) return;
      const currentMode = node.dockState.mode;
      if (side === 'left') {
          if (currentMode === 'tl') handleDockNode(node.id, 'bl');
          else handleDockNode(node.id, 'tl');
      } else {
          if (currentMode === 'tr') handleDockNode(node.id, 'br');
          else handleDockNode(node.id, 'tr');
      }
  };

  const handleAddCard = (e: React.MouseEvent) => {
      e.stopPropagation();
      let characters: any[] = [];
      try {
          const parsed = JSON.parse(node.value || '[]');
          characters = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
          characters = [];
      }
      let nextNameIndex = 1;
      const existingNames = new Set(characters.map((c: any) => c.name));
      while (existingNames.has(`New Character ${nextNameIndex}`)) {
          nextNameIndex++;
      }
      const newChar = {
          id: `char-card-${Date.now()}`,
          name: `New Character ${nextNameIndex}`,
          index: `Character-${characters.length + 1}`,
          image: null,
          thumbnails: { '1:1': null, '16:9': null, '9:16': null },
          selectedRatio: '1:1', 
          prompt: '', 
          fullDescription: '',
          targetLanguage: 'en',
          isOutput: characters.length === 0,
          isDescriptionCollapsed: false,
          additionalPrompt: "Full body character concept on a gray background"
      };
      const newChars = [...characters, newChar];
      onValueChange(node.id, JSON.stringify(newChars));
      if (context?.setNodes) {
           const NODE_WIDTH_STEP = 410;
           const BASE_WIDTH_OFFSET = 90;
           const newWidth = newChars.length * NODE_WIDTH_STEP + BASE_WIDTH_OFFSET;
           context.setNodes(nds => nds.map(n => n.id === node.id ? { ...n, width: newWidth } : n));
      }
  };

  return (
      <div 
        className={`${headerBgClass} text-white font-bold p-2 ${node.isCollapsed ? 'rounded-md' : 'rounded-t-md'} flex justify-between items-center flex-shrink-0 ${!isRerouteDot && !isDockedWindow ? 'cursor-move' : ''}`}
        onMouseDown={onMouseDown}
        onTouchStart={!isRerouteDot && !isDockedWindow ? onTouchStart : undefined}
        onMouseUp={onMouseUp}
        onContextMenu={(e) => { if (handleOpenNodeContextMenu) handleOpenNodeContextMenu(e, node.id); }}
        onDoubleClick={onDoubleClick}
        style={ isRerouteDot ? { height: '100%' } : { height: `${HEADER_HEIGHT}px` } }
      >
        {isRerouteDot ? (
            <div className="w-full h-full flex justify-center items-center"></div>
        ) : (
            <>
                {/* Left Side: Collapse, Pin, Title (Hidden if minimal note) */}
                <div className="flex items-center space-x-1 min-w-0">
                    {!isNoteMinimal && (
                        <>
                            {!isDockedWindow && !isFullScreen && <ActionButton title={node.isCollapsed ? t('node.action.expand') : t('node.action.collapse')} onClick={() => onToggleCollapse(node.id)}>
                                {node.isCollapsed ? (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>) : (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>)}
                            </ActionButton>}
                            
                            {!isDockedWindow && !isFullScreen && handleToggleNodePin && (
                                <ActionButton 
                                    title={node.isPinned ? t('node.action.unpin') : t('node.action.pin')} 
                                    onClick={(e) => { e.stopPropagation(); handleToggleNodePin(node.id); }}
                                    // Theme Change: Use dynamic theme color instead of hardcoded cyan
                                    className={`p-1 rounded hover:bg-gray-600 transition-colors border ${node.isPinned ? 'border-accent-text text-accent-text' : 'border-transparent text-gray-500 hover:text-white'}`}
                                >
                                    <PinIcon className="h-4 w-4" />
                                </ActionButton>
                            )}
                            <span className="truncate pr-2">{node.title}</span>
                        </>
                    )}
                </div>

                {/* Right Side: Actions */}
                <div 
                    className="flex items-center space-x-1 flex-shrink-0"
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                >
                  
                  {/* Note Minimal Toggle (Eye) */}
                  {isNote && (
                        <ActionButton 
                            title={isNoteMinimal ? "Show Controls" : "Hide Controls"} 
                            onClick={handleToggleNoteMinimal}
                            className={`p-1 rounded hover:bg-gray-600 transition-colors ${isNoteMinimal ? 'text-gray-500' : 'text-gray-400 hover:text-white'}`}
                        >
                            {isNoteMinimal ? <EyeIcon className="h-4 w-4" /> : <EyeOffIcon className="h-4 w-4" />}
                        </ActionButton>
                  )}

                  {/* Character Card Toggles */}
                  {node.type === NodeType.CHARACTER_CARD && !isNoteMinimal && (
                    <>
                        {onToggleCharacterImages && (
                            <ActionButton
                                title={allImagesCollapsed ? t('node.action.showImages') : t('node.action.hideImages')}
                                onClick={(e) => { e.stopPropagation(); onToggleCharacterImages(); }}
                                className={`p-1 rounded hover:bg-gray-600 transition-colors border ${allImagesCollapsed ? 'border-transparent text-gray-400 hover:text-white' : 'border-accent text-accent-text'}`}
                            >
                                <PhotoIcon className="h-4 w-4" />
                            </ActionButton>
                        )}
                        {handleToggleNodeHandles && (
                            <ActionButton 
                                title={node.collapsedHandles ? t('node.action.showOutputs') : t('node.action.hideOutputs')} 
                                onClick={(e) => { e.stopPropagation(); handleToggleNodeHandles(node.id); }}
                                // Theme Change: Use dynamic theme color instead of hardcoded cyan
                                className={`p-1 rounded hover:bg-gray-600 transition-colors border ${node.collapsedHandles ? 'border-accent text-accent-text' : 'border-transparent text-gray-400 hover:text-white'}`}
                            >
                                {node.collapsedHandles ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                            </ActionButton>
                        )}
                    </>
                  )}

                  {/* Help Tooltip */}
                  {!isNoteMinimal && (
                      <div className="relative flex items-center group/help-tooltip">
                        <button onMouseDown={(e) => e.stopPropagation()} className="p-1 text-gray-400 rounded hover:bg-gray-600 hover:text-white transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-cyan-500" aria-label={t('node.action.help')}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-700 text-slate-200 text-xs whitespace-normal w-64 rounded-lg shadow-xl z-50 opacity-0 pointer-events-none group-hover/help-tooltip:opacity-100 transition-opacity duration-200 ease-out">
                            {helpTexts[node.type] || t('node.action.help')}
                        </div>
                      </div>
                  )}

                  {/* Rename */}
                  {!isDockedWindow && !isNoteMinimal && (
                      <ActionButton title={t('node.action.rename')} onClick={() => onRenameNode(node.id, node.title)}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                      </ActionButton>
                  )}
                  
                  {/* Conditional Save/Disk Actions */}
                  {!isNoteMinimal && node.type === NodeType.PROMPT_SEQUENCE_EDITOR && onSaveSequenceToCatalog && onSaveScriptToDisk && (
                      <>
                        <ActionButton title={t('catalog.saveTo')} onClick={() => onSaveSequenceToCatalog(node.id)}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2v15" />
                            </svg>
                        </ActionButton>
                        <ActionButton title={t('group.saveToDisk')} onClick={() => onSaveScriptToDisk(node.id)}>
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </ActionButton>
                      </>
                  )}
                  
                   {!isNoteMinimal && node.type === NodeType.SCRIPT_VIEWER && onSaveScriptToDisk && (
                      <ActionButton title={t('group.saveToDisk')} onClick={() => onSaveScriptToDisk(node.id)}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                      </ActionButton>
                  )}
                   {!isNoteMinimal && node.type === NodeType.MEDIA_VIEWER && onSaveMediaToDisk && (
                      <ActionButton title={t('group.saveToDisk')} onClick={() => onSaveMediaToDisk(node.id)}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                      </ActionButton>
                  )}

                  {!isNoteMinimal && (node.type === NodeType.IMAGE_OUTPUT || node.type === NodeType.VIDEO_OUTPUT || node.type === NodeType.IMAGE_INPUT || node.type === NodeType.GEMINI_CHAT) && (hasImageContent || node.type === NodeType.GEMINI_CHAT) && (<ActionButton title={t('node.action.download')} onClick={() => onDownloadImage(node.id)}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></ActionButton>)}
                  {!isNoteMinimal && (node.type === NodeType.IMAGE_INPUT || node.type === NodeType.IMAGE_OUTPUT || node.type === NodeType.DATA_READER) && hasImageContent && (<ActionButton title={t('node.action.clear')} onClick={handleClearContent}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></ActionButton>)}
                  {!isNoteMinimal && (node.type === NodeType.IMAGE_ANALYZER) && hasImageContent && (<ActionButton title={t('node.action.clear')} onClick={handleClearContent}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></ActionButton>)}
                  {!isNoteMinimal && node.type === NodeType.IMAGE_EDITOR && (<ActionButton title={t('node.action.clear')} onClick={() => onRefreshImageEditor(node.id)}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></ActionButton>)}
                  {!isNoteMinimal && node.type === NodeType.GEMINI_CHAT && (<ActionButton title={t('node.action.refreshChat')} onClick={() => onRefreshChat(node.id)}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                  </ActionButton>)}
                  {!isNoteMinimal && (node.type === NodeType.PROMPT_ANALYZER || node.type === NodeType.CHARACTER_ANALYZER || node.type === NodeType.CHARACTER_GENERATOR) && (<ActionButton title={t('node.action.clear')} onClick={handleClearContent}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></ActionButton>)}
                  
                  {!isNoteMinimal && (node.type === NodeType.IMAGE_SEQUENCE_GENERATOR || node.type === NodeType.PROMPT_SEQUENCE_EDITOR) && (
                      <ActionButton title={t('node.action.clear')} onClick={() => {
                          if (node.type === NodeType.IMAGE_SEQUENCE_GENERATOR) {
                                try {
                                    const current = JSON.parse(node.value || '{}');
                                    const resetValue = { ...current, prompts: [], images: {}, frameStatuses: {}, checkedFrameNumbers: [], selectedFrameNumber: null, usedCharacters: [] };
                                    onValueChange(node.id, JSON.stringify(resetValue));
                                    clearImagesForNodeFromCache(node.id);
                                    addToast(t('toast.contentCleared'));
                                } catch {
                                    handleClearContent(null as any);
                                }
                          } else {
                              handleClearContent(null as any);
                          }
                      }}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </ActionButton>
                  )}

                  {!isNoteMinimal && (node.type === NodeType.IMAGE_INPUT || node.type === NodeType.IMAGE_ANALYZER || node.type === NodeType.IMAGE_EDITOR) && (<> <ActionButton title={t('node.action.paste')} onClick={() => onPasteImage(node.id)}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 14l2 2 4-4" /></svg></ActionButton> </>)}

                  {!isNoteMinimal && node.type === NodeType.CHARACTER_CARD && (
                    <>
                      <ActionButton title={t('node.action.addCard')} onClick={handleAddCard}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </ActionButton>
                      
                      {onSaveCharacterToCatalog && onSaveCharacterCard && (
                        <>
                            <ActionButton title={t('catalog.saveTo')} onClick={() => onSaveCharacterToCatalog(node.id)}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1-4l-3 3-3-3m3 3V3" /></svg>
                            </ActionButton>
                            <ActionButton title={t('node.action.saveCharacter')} onClick={() => onSaveCharacterCard(node.id)}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </ActionButton>
                            <ActionButton title={t('node.action.paste')} onClick={() => onPasteNodeValue(node.id)}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 14l2 2 4-4" /></svg>
                            </ActionButton>
                            <ActionButton title={t('node.action.copy')} onClick={() => onCopyNodeValue(node.id)}>
                                <CopyIcon className="h-4 w-4" />
                            </ActionButton>
                            <ActionButton title={t('node.action.clear')} onClick={handleClearContent}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </ActionButton>
                        </>
                      )}
                    </>
                  )}

                  {!isNoteMinimal && (node.type === NodeType.TEXT_INPUT || node.type === NodeType.NOTE || node.type === NodeType.SCRIPT_GENERATOR || node.type === NodeType.SCRIPT_VIEWER || node.type === NodeType.MEDIA_VIEWER) && (<> <ActionButton title={t('node.action.clear')} onClick={handleClearContent}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></ActionButton><ActionButton title={t('node.action.paste')} onClick={() => onPasteNodeValue(node.id)}> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 14l2 2 4-4" /></svg></ActionButton> </>)}

                  {!isNoteMinimal && node.type !== NodeType.IMAGE_EDITOR && node.type !== NodeType.CHARACTER_CARD && (<ActionButton title={t('node.action.copy')} onClick={() => onCopyNodeValue(node.id)}>
                      <CopyIcon className="h-4 w-4" />
                  </ActionButton>)}
                  
                  {!isDockedWindow && !isNoteMinimal && (
                      <ActionButton title={t('toolbar.duplicateWithContent')} onClick={() => onDuplicateNodeWithContent(node.id)}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <rect x="5" y="5" width="14" height="14" rx="2" ry="2"></rect>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m-3-3h6" />
                          </svg>
                      </ActionButton>
                  )}
                  {!isDockedWindow && !isNoteMinimal && (
                      <ActionButton title={t('toolbar.duplicate')} onClick={() => onDuplicateNode(node.id)}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <rect x="5" y="5" width="14" height="14" rx="2" ry="2"></rect>
                        </svg>
                      </ActionButton>
                  )}

                  {!isNoteMinimal && node.type !== NodeType.NOTE && !isDockedWindow && (
                      <ActionButton 
                          title={t('node.action.cutConnections')} 
                          onClick={(e) => { e.stopPropagation(); onCutConnections(node.id); }}
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121M12 12L4.5 4.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l.707-.707M19.5 4.5l-.707.707" /></svg>
                      </ActionButton>
                  )}
                  
                  {/* Close button - Only if NOT minimal note. If minimal note, we need a way to close? Users can expand to close. Or add close here. */}
                  {!isDockedWindow && !isNoteMinimal && <ActionButton title={isInstantCloseEnabled ? t('node.action.closeNodeSimple') : t('node.action.closeNode')} onClick={handleRequestDelete}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></ActionButton>}
                  
                  {/* Positioning Controls (Moved to End) */}
                  {!isNoteMinimal && (isDockedWindow || isFullScreen) && handleUndockNode && (
                      <>
                        <div className="w-px h-3 bg-gray-500 mx-1"></div>
                        
                        {!isFullScreen && (
                            <>
                                {/* Move Dock Left (Horizontal Cycle) */}
                                {!isRestricted && (
                                    <Tooltip content="Cycle Horizontal Left">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDockCycle(-1); }}
                                            className="text-gray-400 hover:text-white transition-colors p-1"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                                        </button>
                                    </Tooltip>
                                )}

                                {/* NEW: Vertical Left Cycle */}
                                {!isRestricted && (
                                    <Tooltip content="Cycle Vertical Left (TL/BL)">
                                         <button
                                            onClick={(e) => { e.stopPropagation(); handleVerticalDockCycle('left'); }}
                                            className="text-gray-400 hover:text-white transition-colors p-1"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M7 15l5 5 5-5" />
                                                <path d="M7 9l5-5 5 5" />
                                            </svg>
                                        </button>
                                    </Tooltip>
                                )}

                                {/* Pin Left */}
                                <Tooltip content={t('toolbar.dock.left')}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDockNode && handleDockNode(node.id, 'left'); }}
                                        className="text-gray-400 hover:text-white transition-colors p-1"
                                    >
                                        <PinLeftIcon />
                                    </button>
                                </Tooltip>
                                
                                {/* Pin Right */}
                                <Tooltip content={t('toolbar.dock.right')}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDockNode && handleDockNode(node.id, 'right'); }}
                                        className="text-gray-400 hover:text-white transition-colors p-1"
                                    >
                                        <PinRightIcon />
                                    </button>
                                </Tooltip>

                                {/* NEW: Vertical Right Cycle */}
                                {!isRestricted && (
                                    <Tooltip content="Cycle Vertical Right (TR/BR)">
                                         <button
                                            onClick={(e) => { e.stopPropagation(); handleVerticalDockCycle('right'); }}
                                            className="text-gray-400 hover:text-white transition-colors p-1"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M7 15l5 5 5-5" />
                                                <path d="M7 9l5-5 5 5" />
                                            </svg>
                                        </button>
                                    </Tooltip>
                                )}
                                
                                {/* Move Dock Right (Horizontal Cycle) */}
                                {!isRestricted && (
                                    <Tooltip content="Cycle Horizontal Right">
                                         <button
                                            onClick={(e) => { e.stopPropagation(); handleDockCycle(1); }}
                                            className="text-gray-400 hover:text-white transition-colors p-1"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                                        </button>
                                    </Tooltip>
                                )}
                            </>
                        )}

                        {isFullScreen ? (
                             <Tooltip content={t('toolbar.dock.exitFull')}>
                                 <button
                                    onClick={(e) => { e.stopPropagation(); toggleNodeFullScreen?.(null); }}
                                    className="text-cyan-400 hover:text-white transition-colors p-1"
                                >
                                    <ExitFullScreenIcon />
                                </button>
                            </Tooltip>
                        ) : (
                             <Tooltip content={t('toolbar.dock.fullFocus')}>
                                 <button
                                    onClick={handleFullFocus}
                                    className="text-gray-400 hover:text-white transition-colors p-1"
                                >
                                    <FullScreenIcon />
                                </button>
                            </Tooltip>
                        )}
                        
                        <Tooltip content={t('toolbar.detach')}>
                            <button
                                onClick={(e) => { e.stopPropagation(); if (isFullScreen) toggleNodeFullScreen?.(null); handleUndockNode(node.id); }}
                                className="text-gray-400 hover:text-white transition-colors ml-1 p-1"
                            >
                                <DetachIcon />
                            </button>
                        </Tooltip>
                      </>
                  )}
                </div>
            </>
        )}
      </div>
  );
};
