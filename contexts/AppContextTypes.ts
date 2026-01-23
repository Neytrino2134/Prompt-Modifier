
import React from 'react';
import { Node, Connection, Point, Group, LibraryItem, Tool, LineStyle, Tab, CanvasState, DraggingInfo, Toast, ToastType, ConnectingInfo, SmartGuide, ActiveOperation, DockMode, Alignment, GlobalMediaState, TutorialStep, Theme, LogEntry, LogLevel } from '../types';
import { NodeType } from '../types';
import { LanguageCode } from '../localization';
import {
  useNodes,
  useConnections,
  useCanvas,
  useInteraction,
  useCanvasIO,
  useDialogsAndUI,
  useGroups,
  useCatalog,
  usePermissions,
  usePromptLibrary,
  useTabs,
  useEntityActions,
  useDerivedMemo,
  useCanvasEvents,
  useGeminiAnalysis,
  useGeminiConversation,
  useGeminiChainExecution,
  useGeminiGeneration,
  useGeminiModification,
  useNodePositionHistory,
  useContentCatalog,
} from '../hooks';
import { useGoogleDrive } from '../hooks/useGoogleDrive';

export type AppContextType = 
  Omit<ReturnType<typeof useTabs>, 'handleCloseTab' | 'loadCanvasState'> &
  Omit<ReturnType<typeof useNodes>, 'handleDuplicateNode' | 'copyNodeValue' | 'pasteNodeValue' | 'handleDuplicateNodeWithContent'> &
  Omit<ReturnType<typeof useEntityActions>, 'onAddNode' | 'handleAlignNodes'> &
  ReturnType<typeof useConnections> &
  ReturnType<typeof useGroups> &
  ReturnType<typeof useCanvas> &
  ReturnType<typeof useDialogsAndUI> &
  Omit<ReturnType<typeof useCatalog>, 'replaceAllItems' | 'importItemsData'> &
  Omit<ReturnType<typeof usePromptLibrary>, 'replaceAllItems' | 'importItemsData'> &
  ReturnType<typeof usePermissions> &
  Omit<ReturnType<typeof useCanvasIO>, 'handleLoadCanvasIntoCurrentTab' | 'handleSaveCharacterCard'> &
  Omit<ReturnType<typeof useInteraction>, 'handleDuplicateNode' | 'handleDuplicateNodeWithContent' | 'pasteGroup'> &
  ReturnType<typeof useDerivedMemo> &
  ReturnType<typeof useCanvasEvents> &
  ReturnType<typeof useGeminiAnalysis> &
  ReturnType<typeof useGeminiConversation> &
  ReturnType<typeof useGeminiChainExecution> &
  ReturnType<typeof useGeminiGeneration> &
  ReturnType<typeof useGeminiModification> &
  ReturnType<typeof useNodePositionHistory> &
  ReturnType<typeof useGoogleDrive> & 
   {
  replaceAllItems: (newItems: LibraryItem[]) => void;
  importItemsData: (data: any) => Promise<void>;
  
  handleLoadCanvasIntoCurrentTab: (text: string) => void; 
  handleLoadFromExternal: (text: string) => void;

  t: (key: string, options?: { [key: string]: string | number }) => string;
  isSnapToGrid: boolean;
  setIsSnapToGrid: React.Dispatch<React.SetStateAction<boolean>>;
  lineStyle: LineStyle;
  setLineStyle: React.Dispatch<React.SetStateAction<LineStyle>>;
  spawnLine: { start: Point; end: Point; fading: boolean; } | null;
  setSpawnLine: React.Dispatch<React.SetStateAction<{ start: Point; end: Point; fading: boolean; } | null>>;
  onAddNode: (type: NodeType, position: Point, title?: string, options?: { centerNode?: boolean; alignToInput?: boolean }) => string;
  pasteImageToNode: (nodeId: string, imageFile?: File | null) => Promise<void>;
  pasteNodeValue: (nodeId: string) => Promise<void>;
  copyNodeValue: (nodeId: string) => Promise<void>;
  handleDuplicateNode: (nodeId: string) => string | undefined;
  handleDuplicateNodeWithContent: (nodeId: string) => string | undefined;
  handleSplitConnection: (connectionId: string) => void;
  handleRemoveGroup: (groupId: string, e: React.MouseEvent) => void;
  handleUpdateCharacterDescription: (nodeId: string, cardIndex: number) => void;
  isUpdatingDescription: string | null;
  handleUpdateCharacterPersonality: (nodeId: string, cardIndex: number) => void;
  isUpdatingPersonality: string | null;
  handleUpdateCharacterAppearance: (nodeId: string, cardIndex: number) => void;
  isUpdatingAppearance: string | null;
  handleUpdateCharacterClothing: (nodeId: string, cardIndex: number) => void;
  isUpdatingClothing: string | null;
  handleModifyCharacter: (nodeId: string, cardIndex: number, instruction: string) => void;
  isModifyingCharacter: string | null;
  handleSaveGroupToCatalog: (groupId: string) => void;
  handleSaveGroupToDisk: (groupId: string) => void;
  handleAddGroupFromCatalog: (itemId: string, position?: Point) => void;
  handleCloseTab: (tabId: string, e?: React.MouseEvent) => void;
  handleClearCanvas: (e?: React.MouseEvent) => void;
  handleResetCanvas: (e?: React.MouseEvent) => void;
  resetCanvasToDefault: (lang: LanguageCode) => void; 
  handleSaveCharacterCard: (nodeId: string, cardIndex?: number) => void;
  triggerLoadCharacterCard: (nodeId: string) => void;
  triggerLoadImageSequenceFile: (nodeId: string) => void;
  triggerLoadPromptSequenceFile: (nodeId: string) => void;
  handleImageSequenceFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePromptSequenceFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCharacterCardFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error: string | null;
  setError: (error: string | null) => void;
  logs: LogEntry[];
  addLog: (level: LogLevel, message: string, details?: any) => void;
  clearLogs: () => void;
  isDebugConsoleOpen: boolean;
  setIsDebugConsoleOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleDetachAndPasteConcept: (sequenceNodeId: string, conceptToPaste: any) => void;
  onDetachImageToNode: (imageDataUrl: string, sourceNodeId: string) => void;
  isRadialMenuOpen: boolean;
  setIsRadialMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  radialMenuPosition: Point;
  setRadialMenuPosition: React.Dispatch<React.SetStateAction<Point>>;
  radialMenuSelectedItem: NodeType | null;
  setRadialMenuSelectedItem: React.Dispatch<React.SetStateAction<NodeType | null>>;
  onSanitize: (nodeId: string) => void;
  isSanitizing: string | null;
  onSaveCharacterToCatalog: (nodeId: string, cardIndex?: number) => void;
  onSaveGeneratedCharacterToCatalog: (characterData: any) => void;
  onSaveScriptToCatalog: (nodeId: string) => void;
  onSaveSequenceToCatalog: (nodeId: string) => void;
  characterCatalog: ReturnType<typeof useContentCatalog>;
  scriptCatalog: ReturnType<typeof useContentCatalog>;
  sequenceCatalog: ReturnType<typeof useContentCatalog>;
  onRenameCharacter: (itemId: string, newName: string) => void;
  onRenameScript: (itemId: string, newName: string) => void;
  onRenameSequence: (itemId: string, newName: string) => void;
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  getFullSizeImage: (nodeId: string, frameNumber: number) => string | undefined;
  setFullSizeImage: (nodeId: string, frameNumber: number, dataUrl: string) => void;
  imageViewer: { sources: { src: string; frameNumber: number; prompt?: string; }[], initialIndex: number } | null;
  setImageViewer: (viewerState: { sources: { src: string; frameNumber: number; }[], initialIndex: number } | null) => void;
  onGenerateSelectedFrames: (nodeId: string) => void;
  onTranslateScript: (nodeId: string) => void;
  isTranslatingScript: string | null;
  onReadData: (nodeId: string) => void;
  onRefreshUpstreamData: (nodeId: string, handleId?: string) => void;
  getUpstreamNodeValues: (nodeId: string, handleId?: string, currentNodes?: Node[], optimizedForUI?: boolean) => (string | { base64ImageData: string, mimeType: string })[];
  getCurrentCanvasState: () => CanvasState;
  handleDetachNodeFromGroup: (nodeId: string) => void;
  handleNodeTouchStart: (e: React.TouchEvent<HTMLDivElement>, nodeId: string) => void;
  handleGroupTouchStart: (e: React.TouchEvent<HTMLDivElement>, groupId: string) => void;
  handleStartConnectionTouch: (e: React.TouchEvent<HTMLDivElement>, fromNodeId: string, fromHandleId?: string) => void;
  onSavePromptToLibrary: (content: string) => void;
  onSaveToLibrary: (content: string, folderName: string) => void;
  onRefreshChat: (nodeId: string) => void;
  isConnectionQuickAddOpen: boolean;
  connectionQuickAddInfo: { position: Point; connectingInfo: ConnectingInfo } | null;
  handleOpenConnectionQuickAdd: (position: Point, connectingInfo: ConnectingInfo) => void;
  handleCloseConnectionQuickAdd: () => void;
  handleAddNodeAndConnect: (nodeType: NodeType) => void;
  contextMenu: { isOpen: boolean; position: Point } | null;
  nodeContextMenu: { isOpen: boolean; position: Point; nodeId: string } | null;
  quickSlots: (NodeType | null)[];
  updateQuickSlot: (index: number, type: NodeType) => void;
  setAllQuickSlots: (slots: (NodeType | null)[]) => void;
  handleOpenContextMenu: (position: Point) => void;
  handleCloseContextMenu: () => void;
  handleOpenNodeContextMenu: (e: React.MouseEvent, nodeId: string) => void;
  handleCloseNodeContextMenu: () => void;
  handleCanvasContextMenu: (e: React.MouseEvent) => void;
  onSaveScriptToDisk: (nodeId: string) => void;
  onSaveMediaToDisk: (nodeId: string) => void;
  isQuickAddMenuPinned: boolean;
  toggleQuickAddMenuPin: () => void;
  handleSaveProject: () => void;
  onDetachCharacter: (characterData: any, generatorNode: Node) => void;
  onGenerateCharacterImage: (nodeId: string, characterId: string) => void;
  isGeneratingCharacterImage: string | null;
  onStopGeneration: () => void;
  isStopping: boolean;
  clearSelectionsSignal: number;
  globalImageEditor: { src: string } | null;
  openGlobalImageEditor: (src: string) => void;
  closeGlobalImageEditor: () => void;
  handleAlignNodes: (selectedNodeIds: string[], type: Alignment) => void;
  setDraggingInfo: React.Dispatch<React.SetStateAction<DraggingInfo | null>>;
  handleNodeCutConnections: (nodeId: string) => void;
  clearImagesForNodeFromCache: (nodeId: string) => void;
  clearUnusedFullSizeImages: () => void;
  isSmartGuidesEnabled: boolean;
  setIsSmartGuidesEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  smartGuides: SmartGuide[];
  hoveredGroupIdForDrop: string | null;
  draggingInfo: DraggingInfo | null;
  onDownloadImageFromUrl: (imageUrl: string, frameNumber: number, prompt: string, filenameOverride?: string) => void;
  onCopyImageToClipboard: (imageUrl: string) => Promise<void>;
  selectedNodeIds: string[];
  setSelectedNodeIds: React.Dispatch<React.SetStateAction<string[]>>;
  handleCanvasDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleDownloadImage: (nodeId: string) => void;
  isDraggingOverCanvas: boolean;
  activeOperations: Map<string, ActiveOperation>;
  isGlobalProcessing: boolean;
  activeTool: Tool;
  setActiveTool: React.Dispatch<React.SetStateAction<Tool>>;
  dragOverNodeId: string | null;
  handleToggleNodeCollapse: (nodeId: string) => void;
  handleToggleNodePin: (nodeId: string) => void;
  handleToggleNodeHandles: (nodeId: string) => void;
  handleClearNodeNewFlag: (nodeId: string) => void;
  setLibraryItems: (items: LibraryItem[]) => void;
  handleNavigateToNodeFrame: (targetNodeId: string, frameNumber: number) => void;
  resetView: () => void;
  onEditImage: (nodeId: string, indices?: number[]) => void;
  handleRegenerateFrame: (nodeId: string, frameNumber: number) => void;
  isStoppingSequence: boolean;
  isInstantCloseEnabled: boolean;
  setIsInstantCloseEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  isHoverHighlightEnabled: boolean;
  setIsHoverHighlightEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  nodeAnimationMode: string;
  setNodeAnimationMode: React.Dispatch<React.SetStateAction<string>>;
  dockHoverMode: DockMode | null;
  setDockHoverMode: React.Dispatch<React.SetStateAction<DockMode | null>>;
  isDockingMenuVisible: boolean;
  clientPointerPositionRef: React.MutableRefObject<Point>;
  handleDockNode: (nodeId: string, mode: DockMode) => void;
  handleUndockNode: (nodeId: string) => void;
  handlePaste: (isAlternativeMode?: boolean) => void;
  selectNode: (nodeId: string) => void;
  focusedNodeId: string | null;
  toggleNodeFullScreen: (nodeId: string | null) => void;
  globalMedia: GlobalMediaState | null;
  setGlobalMedia: React.Dispatch<React.SetStateAction<GlobalMediaState | null>>;
  onImageToText: (nodeId: string) => void;
  onUpdateCharacterDescription: (nodeId: string, cardIndex: number) => void;
  onUpdateCharacterPersonality: (nodeId: string, cardIndex: number) => void;
  onModifyCharacter: (nodeId: string, cardIndex: number, instruction: string) => void;
  onGenerateImage: (nodeId: string, cardIndex?: number) => void;

  nextAutoSaveTime: number | null;
  isAutoSaving: boolean;
  
  connectedInputTypes: Map<string, string>;

  showWelcome: boolean;
  setShowWelcome: React.Dispatch<React.SetStateAction<boolean>>;

  tutorialStep: TutorialStep;
  advanceTutorial: () => void;
  startTutorial: () => void;
  skipTutorial: () => void;
  setTutorialStep: (step: TutorialStep) => void;
  tutorialTargetId: string | null;
  
  // Theme props
  currentTheme: Theme;
  setTheme: (theme: Theme) => void;

  // New handler
  handleUpdateCharacterPromptFromImage: (nodeId: string, cardIndex: number) => void;
  isUpdatingCharacterPrompt: string | null;

  // Connection Settings
  isConnectionAnimationEnabled: boolean;
  setIsConnectionAnimationEnabled: (enabled: boolean) => void;
  connectionOpacity: number;
  setConnectionOpacity: (opacity: number) => void;

  // Sync Logic
  handleSyncCatalogs: () => void;
  handleDeleteFromDrive: (item: any, context: string) => void;
  handleClearCloudFolder: (context: string) => void; // Added
  handleCleanupDuplicates: () => void;
};
