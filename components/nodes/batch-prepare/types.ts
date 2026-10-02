export interface BatchPreparePack {
    id: string;
    name: string;
    createdAt: number;
    views: {
        front: string | null;
        back: string | null;
        left: string | null;
        right: string | null;
    };
    mutedViews?: {
        front?: boolean;
        back?: boolean;
        left?: boolean;
        right?: boolean;
    };
    taskId?: string;
    status?: 'queued' | 'uploading' | 'running' | 'success' | 'failed' | 'cancelled';
    progress?: number;
    modelUrl?: string;
    thumbnailUrl?: string;
    renderedImageUrl?: string;
    error?: string;
}

export type GridPreset = '1x2' | '1x3' | '1x4' | '2x2' | '2x1' | '3x1' | 'custom';

export interface BatchPrepareNodeState {
    inputImages: string[];
    selectedInputIndex: number;
    assetBaseName?: string;
    gridConfig: {
        preset: GridPreset;
        cols: number;
        rows: number;
        borderWidth?: number;
        borderMode?: 'inner' | 'all';
        enableBorder?: boolean;
        bounds?: { x: number; y: number; width: number; height: number };
        colDividers?: number[];
        rowDividers?: number[];
        customDividers?: boolean;
    };
    slicedImages: string[];
    selectedSliceIndex: number | null;
    activeViews: {
        front: string | null;
        back: string | null;
        left: string | null;
        right: string | null;
    };
    mutedViews?: {
        front?: boolean;
        back?: boolean;
        left?: boolean;
        right?: boolean;
    };
    autoSendToViews?: boolean;
    activePackId: string | null;
    packs: BatchPreparePack[];
    isBatchRunning?: boolean;
    batchProgress?: {
        completed: number;
        total: number;
        percent: number;
    };
}

export const DEFAULT_STATE: BatchPrepareNodeState = {
    inputImages: [],
    selectedInputIndex: 0,
    assetBaseName: 'Asset_Name',
    gridConfig: {
        preset: '1x4',
        cols: 4,
        rows: 1,
        borderWidth: 0,
        borderMode: 'inner',
        enableBorder: false,
        bounds: { x: 0, y: 0, width: 1, height: 1 },
        customDividers: true,
    },
    slicedImages: [],
    selectedSliceIndex: null,
    activeViews: {
        front: null,
        back: null,
        left: null,
        right: null,
    },
    mutedViews: {
        front: false,
        back: false,
        left: false,
        right: false,
    },
    autoSendToViews: true,
    activePackId: null,
    packs: [],
    isBatchRunning: false,
};

export type ViewSlotKey = 'front' | 'back' | 'left' | 'right';
