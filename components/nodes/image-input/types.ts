export interface ImageInputCropRect {
    x: number; // 0..1 normalized
    y: number; // 0..1 normalized
    width: number; // 0..1 normalized
    height: number; // 0..1 normalized
}

export type ImageInputMode = 'full' | 'single' | 'grid' | 'batch';
export type ImageBatchSubMode = 'crop' | 'grid';
export type ImageGridBorderMode = 'inner' | 'all';

export interface ImageInputGridConfig {
    cols: number; // default 4 (X)
    rows: number; // default 5 (Y)
    bounds?: ImageInputCropRect; // optional outer bounds inside image (default full: 0,0, 1,1)
    selectedCells?: number[]; // optional active cell indices (0-based)
    enableBorder?: boolean; // toggle border thickness/cut-off
    borderWidth?: number; // border thickness in pixels (e.g., 0..200)
    borderMode?: ImageGridBorderMode; // 'inner' (only inner frames/gutters) | 'all' (all borders: inner and outer)
}

export interface ImageBatchItem {
    id: string;
    name: string;
    dataUrl: string;
    width?: number;
    height?: number;
    size?: number;
}

export interface ImageInputBatchConfig {
    subMode: ImageBatchSubMode; // 'crop' | 'grid'
    folderStructure?: 'per_image' | 'flat';
    includeOriginal?: boolean; // include original/uncropped image in each folder
}

export interface ImageInputValue {
    image: string | null;
    prompt?: string;
    mode?: ImageInputMode; // 'full' | 'single' | 'grid' | 'batch'
    cropRect?: ImageInputCropRect | null;
    croppedImage?: string | null; // Thumbnail of cropped region for fast UI
    grid?: ImageInputGridConfig;
    batchConfig?: ImageInputBatchConfig;
    batchFiles?: ImageBatchItem[];
    extractedImages?: string[]; // Thumbnails of grid cells
    showSlicesDrawer?: boolean;
    showControls?: boolean;
}

