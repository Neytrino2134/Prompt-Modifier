export interface ImageInputCropRect {
    x: number; // 0..1 normalized
    y: number; // 0..1 normalized
    width: number; // 0..1 normalized
    height: number; // 0..1 normalized
}

export type ImageInputMode = 'full' | 'single' | 'grid' | 'batch' | 'frames';
export type ImageBatchSubMode = 'crop' | 'grid';
export type ImageGridBorderMode = 'inner' | 'all';

export interface ImageInputFrameItem {
    id: string;
    rect: ImageInputCropRect;
    name?: string;
    cols?: number; // horizontal grid subdivisions (>= 1, default 1)
    rows?: number; // vertical grid subdivisions (>= 1, default 1)
    colDividers?: number[]; // normalized split points [x1, x2, ..., x_{cols-1}] in 0..1 range within frame rect
    rowDividers?: number[]; // normalized split points [y1, y2, ..., y_{rows-1}] in 0..1 range within frame rect
}

export interface ImageInputFrameAssetItem {
    globalIndex: number;
    frameIndex: number;
    frameId: string;
    subIndex: number;
    totalInFrame: number;
    row: number;
    col: number;
    name: string;
    frameName: string;
    rect: ImageInputCropRect;
    cols: number;
    rows: number;
}

export interface ImageInputFramesConfig {
    frames: ImageInputFrameItem[];
    selectedFrameIndex?: number;
    includeOriginal?: boolean;
    assetName?: string;
}

export interface ImageInputGridConfig {
    cols: number; // default 2 (X)
    rows: number; // default 1 (Y)
    bounds?: ImageInputCropRect; // optional outer bounds inside image (default full: 0,0, 1,1)
    selectedCells?: number[]; // optional active cell indices (0-based)
    enableBorder?: boolean; // toggle border thickness/cut-off
    borderWidth?: number; // border thickness in pixels (e.g., 0..200)
    borderMode?: ImageGridBorderMode; // 'inner' (only inner frames/gutters) | 'all' (all borders: inner and outer)
    customDividers?: boolean; // toggle editable custom table-like row & column dividers
    colDividers?: number[]; // normalized split points [x1, x2, ..., x_{cols-1}] in 0..1 range within bounds
    rowDividers?: number[]; // normalized split points [y1, y2, ..., y_{rows-1}] in 0..1 range within bounds
    includeOriginal?: boolean; // include uncropped original image in ZIP (default true)
    assetName?: string; // default "Asset_Name"
}

export interface ImageBatchItem {
    id: string;
    name: string;
    dataUrl: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
    size?: number;
    cropRect?: ImageInputCropRect;
    gridConfig?: ImageInputGridConfig;
}

export interface ImageInputBatchConfig {
    subMode: ImageBatchSubMode; // 'crop' | 'grid'
    folderStructure?: 'per_image' | 'flat';
    includeOriginal?: boolean; // include original/uncropped image in each folder (default true)
    assetName?: string; // default "Asset_Name"
    individualGridSettings?: boolean; // toggle individual grid/table boundaries per image
}

export interface BatchResultFileItem {
    name: string;
    type: 'original' | 'crop' | 'slice';
    dataUrl: string;
    folderName?: string;
    size?: number;
    row?: number;
    col?: number;
    sliceIndex?: number;
    width?: number;
    height?: number;
}

export interface BatchResultFolder {
    name: string;
    imageIndex: number;
    sourceImageName: string;
    files: BatchResultFileItem[];
}

export interface BatchResultData {
    zipBlob?: Blob;
    archiveKey?: string;
    totalImages: number;
    totalSlices: number;
    timestamp: string;
    filename: string;
    folders?: BatchResultFolder[];
}

export interface ImageInputValue {
    image: string | null;
    prompt?: string;
    mode?: ImageInputMode; // 'full' | 'single' | 'grid' | 'batch' | 'frames'
    cropRect?: ImageInputCropRect | null;
    croppedImage?: string | null; // Thumbnail of cropped region for fast UI
    grid?: ImageInputGridConfig;
    framesConfig?: ImageInputFramesConfig;
    frameImages?: string[]; // Thumbnails of multiple frames
    batchConfig?: ImageInputBatchConfig;
    batchFiles?: ImageBatchItem[];
    extractedImages?: string[]; // Thumbnails of grid cells
    showSlicesDrawer?: boolean;
    showControls?: boolean;
}
