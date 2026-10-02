import { TripoTextureQuality, TripoTextureAlignment, DEFAULT_TRIPO_MODEL_VERSION } from '../../../services/tripoService';
import { ThreeDBatchJob } from '../../../services/tripoBatchService';

export interface ThreeDNodeState {
    mode: 'image_to_3d' | 'multiview_to_3d';
    modelVersion: string;
    texture: boolean;
    textureQuality: TripoTextureQuality;
    textureAlignment: TripoTextureAlignment;
    pbr: boolean;
    quadMesh: boolean;
    faceLimit?: number;
    modelSeed?: number;
    textureSeed?: number;
    prompt: string;
    image: string | null;
    multiview: {
        front: string | null;
        left: string | null;
        back: string | null;
        right: string | null;
    };
    taskId?: string;
    generationIndex?: number;
    status: 'idle' | 'uploading' | 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
    progress: number;
    statusMessage?: string;
    errorMessage?: string;
    modelUrl?: string;
    thumbnailUrl?: string;
    renderedImageUrl?: string;
    activeTab: 'preview3d' | 'rendered';
    autoRotate: boolean;
    wireframe: boolean;
    modelBg: string;
    autoSave3d: boolean;
    autoSaveJson: boolean;
    // Batch Mode Properties
    isBatchMode?: boolean;
    batchJob?: ThreeDBatchJob | null;
    concurrencyLimit?: number;
}

export const DEFAULT_STATE: ThreeDNodeState = {
    mode: 'multiview_to_3d',
    modelVersion: DEFAULT_TRIPO_MODEL_VERSION,
    texture: true,
    textureQuality: 'standard',
    textureAlignment: 'original_image',
    pbr: false,
    quadMesh: false,
    faceLimit: undefined,
    modelSeed: undefined,
    textureSeed: undefined,
    prompt: '',
    image: null,
    multiview: {
        front: null,
        left: null,
        back: null,
        right: null
    },
    generationIndex: 1,
    status: 'idle',
    progress: 0,
    activeTab: 'preview3d',
    autoRotate: true,
    wireframe: false,
    modelBg: '#1e293b',
    autoSave3d: true,
    autoSaveJson: true,
    isBatchMode: false,
    batchJob: null,
    concurrencyLimit: 5
};

export type ThreeDSlotType = 'image' | 'front' | 'back' | 'left' | 'right';
