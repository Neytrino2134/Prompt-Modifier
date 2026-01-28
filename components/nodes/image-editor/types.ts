

export interface ImageEditorState {
    inputImages: string[];
    inputImagesB: string[];
    prompt: string;
    outputImage: string | null;
    enableOutpainting: boolean;
    outpaintingPrompt: string;
    model: string;
    aspectRatio: string;
    enableAspectRatio: boolean;
    autoCrop169: boolean;
    leftPaneWidth: number;
    topPaneHeight: number;
    resolution: string;
    isSequenceMode: boolean;
    isSequentialCombinationMode: boolean;
    isSequentialPromptMode: boolean; 
    isSequentialEditingWithPrompts: boolean; // New mode
    framePrompts: Record<number, string>;
    sequenceOutputs: Array<{ status: string; thumbnail: string | null }>;
    checkedSequenceOutputIndices: number[];
    autoDownload: boolean;
    createZip: boolean; // New property
    checkedInputIndices: number[];
    selectedSourceFrameIndex?: number | null; // Added for selection tracking
}

export const DEFAULT_EDITOR_STATE: ImageEditorState = {
    inputImages: [],
    inputImagesB: [],
    prompt: '',
    outputImage: null,
    enableOutpainting: false,
    outpaintingPrompt: '{main_prompt}. Fill the background with environment - fill in the white areas to naturally expand the image area of the original scene.',
    model: 'gemini-2.5-flash-image', 
    aspectRatio: '1:1',
    enableAspectRatio: false,
    autoCrop169: true,
    leftPaneWidth: 360,
    topPaneHeight: 330,
    resolution: '1K',
    isSequenceMode: false,
    isSequentialCombinationMode: false,
    isSequentialPromptMode: false,
    isSequentialEditingWithPrompts: false, // Default false
    framePrompts: {},
    sequenceOutputs: [],
    checkedSequenceOutputIndices: [],
    autoDownload: true,
    createZip: false, // Default false
    checkedInputIndices: [],
    selectedSourceFrameIndex: null
};

export interface ImageSlot {
    type: 'local' | 'connected';
    src: string | null;
    index: number;
}

// Layout Constants
export const MIN_LEFT_PANE_WIDTH = 280;
export const MIN_RIGHT_PANE_WIDTH = 300;
export const MIN_TOP_PANE_HEIGHT = 330;
export const MIN_BOTTOM_PANE_HEIGHT = 180;
export const MIN_BOTTOM_PANE_HEIGHT_WITH_PREVIEW = 450;
