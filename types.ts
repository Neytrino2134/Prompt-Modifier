
import React from 'react';

export type Resolution = '720p' | '1080p' | '1K' | '2K' | '4K';
export type Theme = 'cyan' | 'orange' | 'pink' | 'gray';

export enum NodeType {
  TEXT_INPUT = 'TEXT_INPUT',
  IMAGE_INPUT = 'IMAGE_INPUT',
  PROMPT_PROCESSOR = 'PROMPT_PROCESSOR',
  VIDEO_PROMPT_PROCESSOR = 'VIDEO_PROMPT_PROCESSOR',
  IMAGE_OUTPUT = 'IMAGE_OUTPUT',
  VIDEO_OUTPUT = 'VIDEO_OUTPUT',
  PROMPT_ANALYZER = 'PROMPT_ANALYZER',
  CHARACTER_ANALYZER = 'CHARACTER_ANALYZER',
  CHARACTER_GENERATOR = 'CHARACTER_GENERATOR',
  CHARACTER_CARD = 'CHARACTER_CARD',
  IMAGE_ANALYZER = 'IMAGE_ANALYZER',
  IMAGE_EDITOR = 'IMAGE_EDITOR',
  IMAGE_SEQUENCE_GENERATOR = 'IMAGE_SEQUENCE_GENERATOR',
  PROMPT_SEQUENCE_EDITOR = 'PROMPT_SEQUENCE_EDITOR',
  GEMINI_CHAT = 'GEMINI_CHAT',
  TRANSLATOR = 'TRANSLATOR',
  SCRIPT_GENERATOR = 'SCRIPT_GENERATOR',
  SCRIPT_VIEWER = 'SCRIPT_VIEWER',
  NOTE = 'NOTE',
  REROUTE_DOT = 'REROUTE_DOT',
  PROMPT_SANITIZER = 'PROMPT_SANITIZER',
  DATA_READER = 'DATA_READER',
  VIDEO_EDITOR = 'VIDEO_EDITOR',
  MEDIA_VIEWER = 'MEDIA_VIEWER',
  DATA_PROTECTION = 'DATA_PROTECTION',
  POSE_CREATOR = 'POSE_CREATOR',
}

export type TutorialStep = 
  | 'idle'
  | 'text_input_0' 
  | 'text_input_1' 
  | 'text_input_2' 
  | 'prompt_processor_enhance' 
  | 'prompt_processor_waiting'
  | 'image_output_generate'
  | 'image_output_generating'
  | 'toolbar_group_catalog'
  | 'toolbar_group_general'
  | 'toolbar_group_input'
  | 'toolbar_group_processing'
  | 'toolbar_group_character'
  | 'toolbar_group_output'
  | 'toolbar_group_ai'
  | 'toolbar_group_scripts'
  | 'toolbar_group_video'
  | 'toolbar_group_file'
  | 'tutorial_success_message'
  | 'completed';

export interface TutorialState {
  isActive: boolean;
  step: TutorialStep;
  currentTargetId: string | null;
}

export type Tool = 'edit' | 'cutter' | 'selection' | 'reroute' | 'zoom';
export type LineStyle = 'spaghetti' | 'orthogonal';
export type Alignment = 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom' | 'distribute-horizontal' | 'distribute-vertical';
export type DockMode = 'full' | 'left' | 'right' | 'tl' | 'tr' | 'bl' | 'br' | 'q1' | 'q2' | 'q3' | 'q4';

export interface Point {
  x: number;
  y: number;
}

export interface SmartGuide {
  type: 'horizontal' | 'vertical';
  position: number;
  start: number;
  end: number;
}

export interface CharacterConcept {
  id: string; // e.g., 'character-1'
  name?: string;
  prompt: string;
  image: string | null; // base64 data URL
  fullDescription?: string;
}

export interface DockState {
    mode: DockMode;
    original: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export interface Node {
  id: string;
  type: NodeType;
  position: Point;
  title: string;
  value: string; // For text inputs, processed prompt, image URL, or JSON for analyzer
  width: number;
  height: number;
  isCollapsed?: boolean;
  isNewlyCreated?: boolean;
  isPinned?: boolean; // New property
  collapsedHandles?: boolean; // New property to toggle visibility of detailed output handles
  aspectRatio?: string;
  model?: string;
  autoDownload?: boolean;
  resolution?: Resolution;
  dockState?: DockState;
}

export interface Connection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromHandleId?: string;
  toHandleId?: string;
}

export interface Group {
  id: string;
  title: string;
  position: Point;
  width: number;
  height: number;
  nodeIds: string[];
}

export interface ConnectingInfo {
  fromNodeId: string;
  fromPoint: Point;
  fromHandleId?: string;
  fromType: 'text' | 'image' | 'character_data' | 'video' | 'audio' | null;
}

export interface DraggingInfo {
  type: 'node' | 'group';
  id: string;
  offsets: Map<string, Point>; // Map of nodeId -> offset
  initialPositions?: Map<string, Point>; // Track initial positions for snap-back logic
  isDetaching?: boolean;
}

// New types for the Prompt Library
export enum LibraryItemType {
  FOLDER = 'FOLDER',
  PROMPT = 'PROMPT',
}

export interface LibraryItem {
  id: string;
  type: LibraryItemType;
  name: string;
  parentId: string | null;
  content?: string; // Only for prompts
}

// Duplicated from useCatalog.ts to be accessible globally
export enum ContentCatalogItemType {
    FOLDER = 'FOLDER',
    ITEM = 'ITEM',
}
export interface ContentCatalogItem {
    id: string;
    type: ContentCatalogItemType;
    name: string;
    parentId: string | null;
    content?: any;
}

// New types for the Tab System
export interface CanvasState {
  nodes: Node[];
  connections: Connection[];
  groups: Group[];
  viewTransform: { scale: number; translate: Point };
  nodeIdCounter: number;
  fullSizeImageCache?: { [nodeId: string]: { [frameNumber: number]: string } };
}

export interface Tab {
  id: string;
  name: string;
  state: CanvasState;
}

// Toast types
export type ToastType = 'success' | 'info' | 'error';
export interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

// Global Operation Tracking
export interface ActiveOperation {
    id: string; // usually nodeId
    type: 'generation' | 'chain' | 'analysis' | 'video' | 'sequence';
    description: string;
    tabId: string;
    tabName: string;
}

// --- NEW: Global Media Player State ---
export interface GlobalMediaState {
    nodeId: string;
    name: string;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    type: 'audio' | 'video';
    command?: 'play' | 'pause' | 'stop' | 'seek'; // Command signal from global UI to Node
    commandTimestamp?: number; // To differentiate commands
    seekTarget?: number; // Used when command is 'seek'
}

// A subset of NodeViewProps that all content components will receive
export interface NodeContentProps {
  node: Node;
  isSelected?: boolean; // Added isSelected prop
  onValueChange: (nodeId: string, value: string) => void;
  onRenameNode: (nodeId: string, currentTitle: string) => void;
  onEnhance: (nodeId: string) => void;
  isEnhancing: boolean;
  onEnhanceVideo: (nodeId: string) => void;
  isEnhancingVideo: boolean;
  onSanitize: (nodeId: string) => void;
  isSanitizing: boolean;
  onAnalyze: (nodeId: string) => void;
  isAnalyzing: boolean;
  onAnalyzeCharacter: (nodeId: string) => void;
  isAnalyzingCharacter: boolean;
  onAnalyzeImage: (nodeId: string) => void;
  onImageToText?: (nodeId: string) => void; // New prop for OCR
  isAnalyzingImage: boolean;
  onGenerateImage: (nodeId: string, cardIndex?: number) => void;
  isGeneratingImage: boolean;
  onExecuteChain: (nodeId: string) => void;
  isExecutingChain: boolean;
  onStopChainExecution: () => void;
  onEditImage: (nodeId: string, indices?: number[]) => void;
  onStopEdit?: () => void;
  isEditingImage: boolean;
  onCopyNodeValue: (nodeId: string) => void;
  onDuplicateNodeWithContent: (nodeId: string) => void;
  onPasteImage: (nodeId: string, imageFile?: File | null) => Promise<void>;
  onDownloadImage: (nodeId: string) => void;
  onAspectRatioChange: (nodeId: string, aspectRatio: string) => void;
  onModelChange: (nodeId: string, model: string) => void;
  onAutoDownloadChange: (nodeId: string, enabled: boolean) => void;
  onSendMessage: (nodeId: string) => void;
  isChatting: boolean;
  onTranslate: (nodeId: string) => void;
  isTranslating: boolean;
  onRefreshImageEditor: (nodeId: string) => void;
  onRefreshChat: (nodeId: string) => void;
  connectedInputs?: Set<string | undefined>;
  onSetImageEditorOutputToInput: (nodeId: string) => void;
  onSetPoseOutputToImage?: (nodeId: string, dataUrl: string) => void;
  onProcessImage: (nodeId: string) => void;
  isProcessingImage: boolean;
  connectedImageSources?: (string | null)[];
  connectedCharacterData?: any[];
  libraryItems: LibraryItem[];
  t: (key: string) => string;
  deselectAllNodes: () => void;
  onSelectNode: () => void; // New prop for selecting the node
  onProcessChainForward: (nodeId: string) => void;
  onGenerateScript: (nodeId: string) => void;
  isGeneratingScript: boolean;
  onLoadScriptFile: (nodeId: string) => void;
  onSaveScriptToDisk: (nodeId: string) => void;
  onSaveMediaToDisk?: (nodeId: string) => void; // Added
  onGenerateCharacters: (nodeId: string) => void;
  isGeneratingCharacters: boolean; 
  onGenerateVideo: (nodeId: string) => void;
  isGeneratingVideo: boolean;
  onResolutionChange: (nodeId: string, resolution: '720p' | '1080p' | '1K' | '2K' | '4K') => void;
  onLoadImageSequenceFile: (nodeId: string) => void;
  onLoadPromptSequenceFile: (nodeId: string) => void;
  onGenerateImageSequence: (nodeId: string, startIndex?: number) => void;
  onGenerateSelectedFrames: (nodeId: string) => void;
  onStopImageSequence: () => void;
  isGeneratingSequence: boolean;
  onRegenerateFrame: (nodeId: string, frameNumber: number, suppliedParsedValue?: any) => void;
  onDownloadImageFromUrl: (imageUrl: string, frameNumber: number, prompt: string, filenameOverride?: string) => void;
  onCopyImageToClipboard: (imageUrl: string) => Promise<void>;
  onSaveCharacterCard: (nodeId: string) => void;
  onLoadCharacterCard: (nodeId: string) => void;
  onOutputHandleMouseDown: (e: React.MouseEvent<HTMLDivElement>, nodeId: string, handleId?: string) => void;
  onOutputHandleTouchStart: (e: React.TouchEvent<HTMLDivElement>, nodeId: string, handleId?: string) => void;
  getHandleColor: (type: 'text' | 'image' | 'character_data' | 'video' | 'audio' | null, handleId?: string) => string;
  handleCursor: string;
  onDetachAndPasteConcept?: (sequenceNodeId: string, conceptToPaste: any) => void;
  onDetachImageToNode: (imageDataUrl: string, sourceNodeId: string) => void;
  onSaveCharacterToCatalog: (nodeId: string) => void;
  onSaveGeneratedCharacterToCatalog: (characterData: any) => void;
  onSaveScriptToCatalog: (nodeId: string) => void;
  onSaveSequenceToCatalog: (nodeId: string) => void;
  setError: (error: string | null) => void;
  setImageViewer: (viewerState: { sources: { src: string; frameNumber: number; prompt?: string; }[], initialIndex: number } | null) => void;
  addToast: (message: string, type?: ToastType) => void;
  getFullSizeImage: (nodeId: string, frameNumber: number) => string | undefined;
  setFullSizeImage: (nodeId: string, frameNumber: number, dataUrl: string) => void;
  clearImagesForNodeFromCache: (nodeId: string) => void;
  onUpdateCharacterDescription?: (nodeId: string, cardIndex: number) => void; // Updated: added cardIndex
  isUpdatingDescription?: string | null; // NodeId-CardIndex
  onModifyCharacter?: (nodeId: string, cardIndex: number, instruction: string) => void; // New prop
  isModifyingCharacter?: string | null; // NodeId-CardIndex
  onTranslateScript: (nodeId: string) => void;
  isTranslatingScript: string | null;
  onReadData: (nodeId: string) => void;
  getUpstreamNodeValues: (nodeId: string, handleId?: string, currentNodes?: Node[], optimizedForUI?: boolean) => (string | { base64ImageData: string, mimeType: string })[];
  onRefreshUpstreamData: (nodeId: string, handleId?: string) => void;
  onModifyPromptSequence: (nodeId: string) => void;
  isModifyingPromptSequence: boolean;
  onDetachNodeFromGroup: (nodeId: string) => void;
  viewTransform?: { scale: number; translate: Point };
  isStoppingSequence: boolean;
  onSavePromptToLibrary: (content: string) => void;
  onSaveToLibrary: (content: string, folderName: string) => void;
  // New props for improved CharacterGeneratorNode
  isStopping: boolean;
  onStopGeneration: () => void;
  clearSelectionsSignal: number;
  onGenerateCharacterImage: (nodeId: string, characterId: string) => void;
  isGeneratingCharacterImage: string | null;
  onDetachCharacter: (characterData: any, generatorNode: Node) => void;
  // Global processing flag to block new actions
  isGlobalProcessing: boolean;
  // Additional Props required by certain nodes like ImageInputNode
  onAddNode?: (type: NodeType, position: Point, title?: string, options?: { centerNode?: boolean; alignToInput?: boolean }) => string;
  onDeleteNode?: (nodeId: string) => void;
  handleDockNode?: (nodeId: string, mode: DockMode) => void;
  handleUndockNode?: (nodeId: string) => void;
  onCutConnections?: (nodeId: string) => void;
  onToggleNodePin?: (nodeId: string) => void; // New Handler
  
  // Tutorial State
  tutorialStep?: TutorialStep;
  advanceTutorial?: () => void;
  skipTutorial?: () => void;
}