import React, { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import JSZip from 'jszip';
import type { NodeContentProps } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { useLanguage } from '../../localization';
import { 
    HeadFrontIcon, 
    HeadLeftIcon, 
    HeadRightIcon, 
    HeadBackIcon,
    BatchPrepareIcon 
} from '../icons/AppIcons';
import { 
    sliceImageGrid, 
    setupImageDragData, 
    generateThumbnail 
} from '../../utils/imageUtils';
import { ImageGridOverlay } from './image-input/ImageGridOverlay';
import { 
    Upload, 
    Layers, 
    Grid, 
    Scissors, 
    FolderPlus, 
    Trash2, 
    Copy, 
    Download, 
    ArrowLeftRight, 
    ArrowUpDown, 
    RotateCw, 
    Eye, 
    EyeOff,
    Link,
    Unlink,
    Plus, 
    X, 
    ChevronLeft, 
    ChevronRight, 
    Sparkles, 
    Folder, 
    Maximize2, 
    FlipHorizontal, 
    ArrowRight, 
    Zap, 
    Loader2, 
    RotateCcw 
} from 'lucide-react';

// ==========================================
// High Performance In-Memory Thumbnail Cache
// ==========================================

const THUMBNAIL_CACHE = new Map<string, string>();
const MAX_CACHE_SIZE = 500;

const createCachedThumbnail = (src: string, targetSize: 64 | 128, callback: (thumbUrl: string) => void) => {
    // Generate cache key
    const cacheKey = `${src.slice(0, 100)}_${src.length}_${targetSize}`;
    const cached = THUMBNAIL_CACHE.get(cacheKey);
    if (cached) {
        callback(cached);
        return;
    }

    // Generate async on canvas
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        try {
            const canvas = document.createElement('canvas');
            const aspect = (img.naturalWidth || img.width) / (img.naturalHeight || img.height || 1);
            let w: number = targetSize;
            let h: number = targetSize;
            if (aspect > 1) {
                h = Math.max(1, Math.round(targetSize / aspect));
            } else {
                w = Math.max(1, Math.round(targetSize * aspect));
            }
            canvas.width = targetSize;
            canvas.height = targetSize;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'medium';
                // Draw centered inside square box
                const offsetX = (targetSize - w) / 2;
                const offsetY = (targetSize - h) / 2;
                ctx.drawImage(img, offsetX, offsetY, w, h);
                const thumbData = canvas.toDataURL('image/jpeg', 0.85);

                if (THUMBNAIL_CACHE.size >= MAX_CACHE_SIZE) {
                    const firstKey = THUMBNAIL_CACHE.keys().next().value;
                    if (firstKey) THUMBNAIL_CACHE.delete(firstKey);
                }
                THUMBNAIL_CACHE.set(cacheKey, thumbData);
                callback(thumbData);
            } else {
                callback(src);
            }
        } catch {
            callback(src);
        }
    };
    img.onerror = () => {
        callback(src);
    };
    img.src = src;
};

interface OptimizedThumbnailProps {
    src: string | null | undefined;
    size: 64 | 128;
    alt?: string;
    className?: string;
    style?: React.CSSProperties;
}

const OptimizedThumbnail: React.FC<OptimizedThumbnailProps> = memo(({ src, size, alt = '', className = '', style }) => {
    const [thumbSrc, setThumbSrc] = useState<string>(() => {
        if (!src) return '';
        const key = `${src.slice(0, 100)}_${src.length}_${size}`;
        return THUMBNAIL_CACHE.get(key) || src;
    });

    useEffect(() => {
        if (!src) {
            setThumbSrc('');
            return;
        }
        let isMounted = true;
        createCachedThumbnail(src, size, (t) => {
            if (isMounted) setThumbSrc(t);
        });
        return () => {
            isMounted = false;
        };
    }, [src, size]);

    if (!src) return null;

    return (
        <img
            src={thumbSrc || src}
            alt={alt}
            loading="lazy"
            decoding="async"
            className={className}
            style={style}
        />
    );
});

// ==========================================
// Types & State Definitions
// ==========================================

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
}

export interface BatchPrepareNodeState {
    inputImages: string[];
    selectedInputIndex: number;
    assetBaseName?: string;
    gridConfig: {
        preset: '1x2' | '1x3' | '1x4' | '2x2' | '2x1' | '3x1' | 'custom';
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
}

const DEFAULT_STATE: BatchPrepareNodeState = {
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
};

type ViewSlotKey = 'front' | 'back' | 'left' | 'right';

export const BatchPrepareNode: React.FC<NodeContentProps> = memo(({
    node,
    onValueChange,
    addToast,
    setImageViewer,
    getUpstreamNodeValues,
}) => {
    const context = useAppContext();
    const { t } = useLanguage();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const viewFileInputRef = useRef<{ [key in ViewSlotKey]?: HTMLInputElement | null }>({});

    // Drag tracking for slot swap & external drops
    const [draggedSlot, setDraggedSlot] = useState<ViewSlotKey | null>(null);
    const [isSlicing, setIsSlicing] = useState(false);
    const [isBatchSlicing, setIsBatchSlicing] = useState(false);
    const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
    const [isDropOverSlot, setIsDropOverSlot] = useState<{ [key in ViewSlotKey]?: boolean }>({});
    const [isDropOverInputs, setIsDropOverInputs] = useState(false);

    // State parser
    const state = useMemo<BatchPrepareNodeState>(() => {
        try {
            const parsed = JSON.parse(node.value || '{}');
            return {
                ...DEFAULT_STATE,
                ...parsed,
                assetBaseName: parsed.assetBaseName !== undefined ? parsed.assetBaseName : 'Asset_Name',
                gridConfig: {
                    ...DEFAULT_STATE.gridConfig,
                    ...(parsed.gridConfig || {})
                },
                activeViews: {
                    ...DEFAULT_STATE.activeViews,
                    ...(parsed.activeViews || {})
                },
                mutedViews: {
                    ...DEFAULT_STATE.mutedViews,
                    ...(parsed.mutedViews || {})
                },
                autoSendToViews: parsed.autoSendToViews !== undefined ? parsed.autoSendToViews : true,
                packs: Array.isArray(parsed.packs) ? parsed.packs : [],
                inputImages: Array.isArray(parsed.inputImages) ? parsed.inputImages : [],
                slicedImages: Array.isArray(parsed.slicedImages) ? parsed.slicedImages : [],
            };
        } catch {
            return DEFAULT_STATE;
        }
    }, [node.value]);

    // Keep a synchronous ref to the latest state to avoid race conditions in async actions
    const stateRef = useRef<BatchPrepareNodeState>(state);
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    // Local state for smooth slider dragging (committing only on mouse up / touch end)
    const [localBorderWidth, setLocalBorderWidth] = useState<number>(state.gridConfig.borderWidth || 0);
    useEffect(() => {
        setLocalBorderWidth(state.gridConfig.borderWidth || 0);
    }, [state.gridConfig.borderWidth]);

    // Upstream Multi-Channel Images Resolution
    const upstreamImages = useMemo<string[]>(() => {
        const rawResults: any[] = [];
        if (getUpstreamNodeValues) {
            const upVals = getUpstreamNodeValues(node.id, 'image', undefined, false);
            if (Array.isArray(upVals) && upVals.length > 0) {
                rawResults.push(...upVals);
            }
        }

        const formatted: string[] = [];
        rawResults.forEach((item: any) => {
            if (typeof item === 'string') {
                if (item.startsWith('data:image') || item.startsWith('http://') || item.startsWith('https://') || item.startsWith('blob:')) {
                    formatted.push(item);
                }
            } else if (typeof item === 'object' && item !== null) {
                if (item.base64ImageData) {
                    formatted.push(`data:${item.mimeType || 'image/png'};base64,${item.base64ImageData}`);
                } else if (item.url) {
                    formatted.push(item.url);
                } else if (item.image) {
                    formatted.push(item.image);
                } else if (item.outputImage) {
                    formatted.push(item.outputImage);
                }
            }
        });
        return formatted;
    }, [getUpstreamNodeValues, node.id]);

    // Combined input images list: upstream + local inputImages
    const allInputImages = useMemo<string[]>(() => {
        const combined = [...state.inputImages];
        upstreamImages.forEach(img => {
            if (!combined.includes(img)) {
                combined.push(img);
            }
        });
        return combined;
    }, [state.inputImages, upstreamImages]);

    // Currently selected source image for grid slicing
    const activeSourceImage = useMemo<string | null>(() => {
        if (allInputImages.length === 0) return null;
        const idx = Math.min(state.selectedInputIndex, allInputImages.length - 1);
        return allInputImages[idx] || allInputImages[0] || null;
    }, [allInputImages, state.selectedInputIndex]);

    // Track active image natural dimensions for pixel-perfect aspect ratio overlay bounding box
    const [sourceNaturalSize, setSourceNaturalSize] = useState<{ width: number; height: number } | null>(null);
    useEffect(() => {
        if (!activeSourceImage) {
            setSourceNaturalSize(null);
            return;
        }
        const img = new Image();
        img.onload = () => {
            setSourceNaturalSize({
                width: img.naturalWidth || img.width,
                height: img.naturalHeight || img.height,
            });
        };
        img.src = activeSourceImage;
    }, [activeSourceImage]);

    // Persistence Helper with activePackId & mutedViews synchronization
    const updateState = useCallback((updater: Partial<BatchPrepareNodeState> | ((prev: BatchPrepareNodeState) => Partial<BatchPrepareNodeState>)) => {
        const currentState = stateRef.current;
        const partial = typeof updater === 'function' ? updater(currentState) : updater;
        const next = { ...currentState, ...partial };
        stateRef.current = next;
        
        // Compute effective active output multiview and extracted images for downstream nodes
        let effectiveViews = { ...next.activeViews };
        let effectiveMuted = { ...(next.mutedViews || {}) };

        if (next.activePackId) {
            const currentPack = next.packs.find(p => p.id === next.activePackId);
            if (currentPack) {
                effectiveViews = { ...currentPack.views };
                effectiveMuted = { ...(currentPack.mutedViews || {}) };
            }
        }

        // Apply mute flags: if slot is muted, output is strictly null!
        const exportedMultiview = {
            front: effectiveMuted.front ? null : (effectiveViews.front || null),
            back: effectiveMuted.back ? null : (effectiveViews.back || null),
            left: effectiveMuted.left ? null : (effectiveViews.left || null),
            right: effectiveMuted.right ? null : (effectiveViews.right || null),
        };

        const fullExport = {
            ...next,
            multiview: exportedMultiview,
            activeViews: effectiveViews,
            mutedViews: effectiveMuted,
            extractedImages: [
                exportedMultiview.front,
                exportedMultiview.back,
                exportedMultiview.left,
                exportedMultiview.right
            ].filter(Boolean),
            image: exportedMultiview.front || exportedMultiview.left || exportedMultiview.back || exportedMultiview.right || null,
        };

        onValueChange(node.id, JSON.stringify(fullExport));
    }, [node.id, onValueChange]);

    // Track incoming connection to this node for link/unlink/bake action
    const incomingConnections = useMemo(() => {
        return context?.connections?.filter(c => c.toNodeId === node.id) || [];
    }, [context?.connections, node.id]);
    const hasIncomingConnections = incomingConnections.length > 0;

    const handleBakeAndDisconnectInput = useCallback(() => {
        const embeddedImages = [...allInputImages];
        if (context?.setConnections) {
            context.setConnections(prev => prev.filter(c => c.toNodeId !== node.id));
        }
        updateState({
            inputImages: embeddedImages,
            selectedInputIndex: 0
        });
        addToast(
            hasIncomingConnections
                ? `Соединение отключено. Встроено ${embeddedImages.length} изображений в ноду`
                : `Все ${embeddedImages.length} изображений встроены в ноду`,
            'success'
        );
    }, [allInputImages, context, node.id, updateState, addToast, hasIncomingConnections]);

    // Commit border slider on release
    const commitBorderWidth = useCallback((bw: number) => {
        updateState(prev => ({
            gridConfig: {
                ...prev.gridConfig,
                borderWidth: bw,
                enableBorder: bw > 0
            }
        }));
    }, [updateState]);

    // Synchronize updates to activeViews and mutedViews directly to the selected pack in packs buffer
    const updateActiveViewsAndSyncPack = useCallback((
        viewsUpdater: (prevViews: BatchPrepareNodeState['activeViews']) => BatchPrepareNodeState['activeViews'],
        mutedUpdater?: (prevMuted: BatchPrepareNodeState['mutedViews']) => BatchPrepareNodeState['mutedViews']
    ) => {
        updateState(prev => {
            const nextViews = viewsUpdater(prev.activeViews);
            const nextMuted = mutedUpdater ? mutedUpdater(prev.mutedViews) : prev.mutedViews;
            
            const nextPacks = prev.activePackId
                ? prev.packs.map(p => p.id === prev.activePackId ? { ...p, views: nextViews, mutedViews: nextMuted } : p)
                : prev.packs;

            return {
                ...prev,
                activeViews: nextViews,
                mutedViews: nextMuted,
                packs: nextPacks
            };
        });
    }, [updateState]);

    // Auto Slice single helper with custom bounds & border padding
    const handlePerformSlice = useCallback(async (
        imgSrc?: string, 
        cols?: number, 
        rows?: number, 
        preset?: '1x2' | '1x3' | '1x4' | '2x2' | '2x1' | '3x1' | 'custom'
    ) => {
        const targetImg = imgSrc || activeSourceImage;
        if (!targetImg) {
            addToast(t('batchprep.toast.selectImageFirst') || 'Выберите входящее изображение для нарезки', 'info');
            return;
        }

        const c = cols ?? stateRef.current.gridConfig.cols;
        const r = rows ?? stateRef.current.gridConfig.rows;
        const p = preset ?? stateRef.current.gridConfig.preset;
        const bounds = stateRef.current.gridConfig.bounds || { x: 0, y: 0, width: 1, height: 1 };
        const borderConfig = {
            enableBorder: (stateRef.current.gridConfig.borderWidth || 0) > 0,
            borderWidth: stateRef.current.gridConfig.borderWidth || 0,
            borderMode: stateRef.current.gridConfig.borderMode || 'inner',
            customDividers: true,
            colDividers: stateRef.current.gridConfig.colDividers,
            rowDividers: stateRef.current.gridConfig.rowDividers,
        };

        setIsSlicing(true);
        try {
            const { slices } = await sliceImageGrid(targetImg, c, r, bounds, borderConfig);
            const shouldAutoSend = stateRef.current.autoSendToViews;
            const newActiveViews = shouldAutoSend && slices.length > 0 ? {
                front: slices[0] || null,
                back: slices[1] || null,
                left: slices[2] || null,
                right: slices[3] || null,
            } : undefined;

            updateState(prev => {
                const nextPacks = (shouldAutoSend && newActiveViews && prev.activePackId)
                    ? prev.packs.map(pk => pk.id === prev.activePackId ? { ...pk, views: newActiveViews } : pk)
                    : prev.packs;

                return {
                    ...prev,
                    gridConfig: {
                        ...prev.gridConfig,
                        preset: p,
                        cols: c,
                        rows: r,
                    },
                    slicedImages: slices,
                    selectedSliceIndex: 0,
                    ...(newActiveViews ? { activeViews: newActiveViews } : {}),
                    packs: nextPacks
                };
            });
            
            if (shouldAutoSend && slices.length > 0) {
                addToast((t('batchprep.toast.slicedAndSent') || `Нарезано (${c}x${r}) и отправлено в 3D Views`), 'success');
            } else {
                addToast((t('batchprep.toast.slicedSuccess') || `Нарезано на ${slices.length} частей (${c}x${r})`), 'success');
            }
        } catch (err: any) {
            console.error('Slice error:', err);
            addToast(err?.message || 'Ошибка нарезки сетки', 'error');
        } finally {
            setIsSlicing(false);
        }
    }, [activeSourceImage, addToast, t, updateState]);

    // BATCH SLICE ALL INPUTS -> SEND DIRECTLY TO PACK BUFFER
    const handleBatchSliceAllToPackBuffer = useCallback(async () => {
        if (allInputImages.length === 0) {
            addToast('Нет входящих изображений для пакетной нарезки', 'warning');
            return;
        }

        const cols = stateRef.current.gridConfig.cols;
        const rows = stateRef.current.gridConfig.rows;
        const bounds = stateRef.current.gridConfig.bounds || { x: 0, y: 0, width: 1, height: 1 };
        const borderConfig = {
            enableBorder: (stateRef.current.gridConfig.borderWidth || 0) > 0,
            borderWidth: stateRef.current.gridConfig.borderWidth || 0,
            borderMode: stateRef.current.gridConfig.borderMode || 'inner',
            customDividers: true,
            colDividers: stateRef.current.gridConfig.colDividers,
            rowDividers: stateRef.current.gridConfig.rowDividers,
        };
        const total = allInputImages.length;

        setIsBatchSlicing(true);
        setBatchProgress({ current: 0, total });

        try {
            const newPacks: BatchPreparePack[] = [];
            const baseName = (stateRef.current.assetBaseName !== undefined ? stateRef.current.assetBaseName : 'Asset_Name').trim() || 'Asset_Name';
            const startIdx = stateRef.current.packs.length;

            for (let i = 0; i < total; i++) {
                const imgSrc = allInputImages[i];
                setBatchProgress({ current: i + 1, total });

                // Perform grid slice for this image with full source resolution
                const { slices } = await sliceImageGrid(imgSrc, cols, rows, bounds, borderConfig);

                const padIndex = String(startIdx + i + 1).padStart(2, '0');
                // Default 3D View Assignment: 0->Front, 1->Back, 2->Left, 3->Right
                const pack: BatchPreparePack = {
                    id: `pack-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
                    name: `${baseName}_${padIndex}`,
                    createdAt: Date.now() + i,
                    views: {
                        front: slices[0] || null,
                        back: slices[1] || null,
                        left: slices[2] || null,
                        right: slices[3] || null,
                    },
                    mutedViews: {
                        front: false,
                        back: false,
                        left: false,
                        right: false,
                    }
                };
                newPacks.push(pack);
            }

            // Append all created packs to Pack Buffer
            updateState(prev => {
                const combinedPacks = [...prev.packs, ...newPacks];
                // If no active pack, activate the first newly created pack
                const activeId = prev.activePackId || (newPacks[0] ? newPacks[0].id : null);
                const activePackObj = combinedPacks.find(p => p.id === activeId);

                return {
                    ...prev,
                    packs: combinedPacks,
                    activePackId: activeId,
                    ...(activePackObj ? {
                        activeViews: { ...activePackObj.views },
                        mutedViews: { ...(activePackObj.mutedViews || {}) }
                    } : {})
                };
            });

            addToast(`⚡ Успешно нарезано ${total} картинок и добавлено ${newPacks.length} паков в Буфер!`, 'success');
        } catch (err: any) {
            console.error('Batch slice error:', err);
            addToast(`Ошибка пакетной нарезки: ${err?.message}`, 'error');
        } finally {
            setIsBatchSlicing(false);
            setBatchProgress(null);
        }
    }, [allInputImages, addToast, updateState]);

    // Grid Presets handler
    const handleSetGridPreset = (preset: '1x2' | '1x3' | '1x4' | '2x2' | '2x1' | '3x1') => {
        let cols = 4;
        let rows = 1;
        switch (preset) {
            case '1x2': cols = 2; rows = 1; break;
            case '1x3': cols = 3; rows = 1; break;
            case '1x4': cols = 4; rows = 1; break;
            case '2x2': cols = 2; rows = 2; break;
            case '2x1': cols = 1; rows = 2; break;
            case '3x1': cols = 1; rows = 3; break;
        }

        updateState(prev => ({
            gridConfig: {
                ...prev.gridConfig,
                preset,
                cols,
                rows,
                bounds: { x: 0, y: 0, width: 1, height: 1 },
                colDividers: undefined,
                rowDividers: undefined,
                customDividers: true
            }
        }));

        if (activeSourceImage) {
            handlePerformSlice(activeSourceImage, cols, rows, preset);
        }
    };

    // Reset grid borders, bounds and dividers
    const handleResetGrid = () => {
        updateState(prev => ({
            gridConfig: {
                ...prev.gridConfig,
                borderWidth: 0,
                enableBorder: false,
                borderMode: 'inner',
                bounds: { x: 0, y: 0, width: 1, height: 1 },
                colDividers: undefined,
                rowDividers: undefined,
                customDividers: true
            }
        }));
        setLocalBorderWidth(0);
        addToast('Границы и рамка сетки сброшены', 'info');
    };

    // Auto-assign list of images to 4 views
    const handleAutoAssignToViews = (imgList: string[]) => {
        if (!imgList || imgList.length === 0) return;
        const newViews = {
            front: imgList[0] || null,
            back: imgList[1] || null,
            left: imgList[2] || null,
            right: imgList[3] || null,
        };
        updateActiveViewsAndSyncPack(() => newViews);
        addToast(t('batchprep.toast.viewsAssigned') || 'Ракурсы Front/Back/Left/Right заполнены', 'success');
    };

    // View manipulation helpers
    const handleSetSingleView = (slot: ViewSlotKey, dataUrl: string | null) => {
        updateActiveViewsAndSyncPack(prev => ({
            ...prev,
            [slot]: dataUrl
        }));
    };

    const handleToggleMuteView = (slot: ViewSlotKey) => {
        updateActiveViewsAndSyncPack(
            views => views,
            prevMuted => {
                const currentMuted = Boolean(prevMuted?.[slot]);
                const nextMuted = !currentMuted;
                addToast(nextMuted ? `Ракурс [${slot.toUpperCase()}] исключен (Muted)` : `Ракурс [${slot.toUpperCase()}] включен (Active)`, 'info');
                return {
                    ...prevMuted,
                    [slot]: nextMuted
                };
            }
        );
    };

    const handleSwapLeftRight = () => {
        updateActiveViewsAndSyncPack(
            prev => ({
                ...prev,
                left: prev.right,
                right: prev.left,
            }),
            prevMuted => ({
                ...prevMuted,
                left: prevMuted?.right,
                right: prevMuted?.left,
            })
        );
        addToast('Left ↔ Right поменяны местами (синхронизировано с паком)', 'info');
    };

    const handleSwapFrontBack = () => {
        updateActiveViewsAndSyncPack(
            prev => ({
                ...prev,
                front: prev.back,
                back: prev.front,
            }),
            prevMuted => ({
                ...prevMuted,
                front: prevMuted?.back,
                back: prevMuted?.front,
            })
        );
        addToast('Front ↔ Back поменяны местами (синхронизировано с паком)', 'info');
    };

    const handleRotateViews = () => {
        updateActiveViewsAndSyncPack(
            prev => ({
                front: prev.left,
                right: prev.front,
                back: prev.right,
                left: prev.back,
            }),
            prevMuted => ({
                front: prevMuted?.left,
                right: prevMuted?.front,
                back: prevMuted?.right,
                left: prevMuted?.back,
            })
        );
        addToast('Ракурсы сдвинуты по часовой стрелке', 'info');
    };

    const handleFlipView = async (slot: ViewSlotKey) => {
        const src = state.activeViews[slot];
        if (!src) return;
        try {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.translate(canvas.width, 0);
                    ctx.scale(-1, 1);
                    ctx.drawImage(img, 0, 0);
                    const flippedDataUrl = canvas.toDataURL('image/png');
                    handleSetSingleView(slot, flippedDataUrl);
                    addToast(`Ракурс ${slot.toUpperCase()} отражен по горизонтали`, 'success');
                }
            };
            img.src = src;
        } catch (e) {
            console.error('Flip error', e);
        }
    };

    const handleClearAllViews = () => {
        updateActiveViewsAndSyncPack(() => ({
            front: null,
            back: null,
            left: null,
            right: null,
        }), () => ({
            front: false,
            back: false,
            left: false,
            right: false,
        }));
        addToast('Все 4 ракурса очищены', 'info');
    };

    // Pack Buffer Management
    const handleBaseNameChange = (newBaseName: string) => {
        const base = newBaseName.trim() || 'Asset_Name';
        updateState(prev => {
            const updatedPacks = prev.packs.map((p, index) => {
                const padIndex = String(index + 1).padStart(2, '0');
                return {
                    ...p,
                    name: `${base}_${padIndex}`
                };
            });
            return {
                ...prev,
                assetBaseName: newBaseName,
                packs: updatedPacks
            };
        });
    };

    const handleClearAllPacks = () => {
        if (stateRef.current.packs.length === 0) return;
        updateState({
            packs: [],
            activePackId: null
        });
        addToast('Все паки очищены из буфера', 'info');
    };

    const handleSaveCurrentToPack = () => {
        const filled = [
            state.activeViews.front,
            state.activeViews.back,
            state.activeViews.left,
            state.activeViews.right
        ].filter(Boolean).length;

        if (filled === 0) {
            addToast('Заполните хотя бы один ракурс для сохранения в пак', 'warning');
            return;
        }

        const baseName = (stateRef.current.assetBaseName !== undefined ? stateRef.current.assetBaseName : 'Asset_Name').trim() || 'Asset_Name';
        const padIndex = String(state.packs.length + 1).padStart(2, '0');
        const newPackId = `pack-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newPack: BatchPreparePack = {
            id: newPackId,
            name: `${baseName}_${padIndex}`,
            createdAt: Date.now(),
            views: { ...state.activeViews },
            mutedViews: { ...(state.mutedViews || {}) }
        };

        updateState(prev => ({
            packs: [...prev.packs, newPack],
            activePackId: newPackId
        }));

        addToast(`Пак "${newPack.name}" сохранен в буфер и выбран`, 'success');
    };

    const handleSelectActivePack = (packId: string) => {
        const found = state.packs.find(p => p.id === packId);
        if (!found) return;

        updateState(prev => ({
            activePackId: packId,
            activeViews: { ...found.views },
            mutedViews: { ...(found.mutedViews || {}) }
        }));

        addToast(`Выбран "${found.name}" (Виды загружены в Редактор)`, 'info');
    };

    const handleDeletePack = (packId: string) => {
        updateState(prev => {
            const nextPacks = prev.packs.filter(p => p.id !== packId);
            const nextActiveId = prev.activePackId === packId 
                ? (nextPacks[0] ? nextPacks[0].id : null) 
                : prev.activePackId;
            const nextActivePack = nextPacks.find(p => p.id === nextActiveId);

            return {
                ...prev,
                packs: nextPacks,
                activePackId: nextActiveId,
                ...(nextActivePack ? {
                    activeViews: { ...nextActivePack.views },
                    mutedViews: { ...(nextActivePack.mutedViews || {}) }
                } : {})
            };
        });
        addToast('Пак удален из буфера', 'info');
    };

    const handleDuplicatePack = (pack: BatchPreparePack) => {
        const baseName = (stateRef.current.assetBaseName !== undefined ? stateRef.current.assetBaseName : 'Asset_Name').trim() || 'Asset_Name';
        const padIndex = String(state.packs.length + 1).padStart(2, '0');
        const dup: BatchPreparePack = {
            ...pack,
            id: `pack-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: `${baseName}_${padIndex}`,
            createdAt: Date.now()
        };
        updateState(prev => ({
            packs: [...prev.packs, dup],
            activePackId: dup.id,
            activeViews: { ...dup.views },
            mutedViews: { ...(dup.mutedViews || {}) }
        }));
        addToast(`Создана копия пака "${dup.name}"`, 'success');
    };

    const handleDownloadPackZip = async (pack: BatchPreparePack) => {
        try {
            const zip = new JSZip();
            const viewsOrder: ViewSlotKey[] = ['front', 'back', 'left', 'right'];
            let count = 0;

            for (const vKey of viewsOrder) {
                const dataUrl = pack.views[vKey];
                const isMuted = pack.mutedViews?.[vKey];
                if (dataUrl && !isMuted) {
                    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
                    zip.file(`${vKey}.png`, base64Data, { base64: true });
                    count++;
                }
            }

            if (count === 0) {
                addToast('В паке нет активных ракурсов для скачивания', 'warning');
                return;
            }

            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `${pack.name.replace(/\s+/g, '_')}_3D_views.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            addToast(`Архив ${pack.name}.zip скачан`, 'success');
        } catch (e) {
            console.error('ZIP export error:', e);
            addToast('Ошибка создания ZIP архива', 'error');
        }
    };

    const handleDownloadAllPacksZip = async () => {
        if (state.packs.length === 0) return;
        try {
            const zip = new JSZip();
            const viewsOrder: ViewSlotKey[] = ['front', 'back', 'left', 'right'];
            let totalImages = 0;

            for (let i = 0; i < state.packs.length; i++) {
                const pack = state.packs[i];
                const folderName = `Pack_${i + 1}_${pack.name.replace(/[^\wа-яА-Я-]/g, '_')}`;
                const packFolder = zip.folder(folderName);

                if (packFolder) {
                    for (const vKey of viewsOrder) {
                        const dataUrl = pack.views[vKey];
                        const isMuted = pack.mutedViews?.[vKey];
                        if (dataUrl && !isMuted) {
                            const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
                            packFolder.file(`${vKey}.png`, base64Data, { base64: true });
                            totalImages++;
                        }
                    }
                }
            }

            if (totalImages === 0) {
                addToast('Нет активных изображений для скачивания в паках', 'warning');
                return;
            }

            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `All_3D_Packs_Batch_${Date.now()}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            addToast(`Скачан архив со всеми паками (${state.packs.length} шт.)`, 'success');
        } catch (e) {
            console.error('Batch ZIP export error:', e);
            addToast('Ошибка экспорта всех паков', 'error');
        }
    };

    // File Upload Handler
    const handleUploadInputFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const readPromises = Array.from(files).map((file) => {
            return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
        });

        Promise.all(readPromises).then((newImgs) => {
            updateState(prev => ({
                inputImages: [...newImgs, ...prev.inputImages],
                selectedInputIndex: 0
            }));
            addToast(`Загружено ${newImgs.length} изображений`, 'success');
        });

        e.target.value = '';
    };

    // Paste handler from clipboard
    const handlePasteFromClipboard = async () => {
        try {
            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
                const imageType = item.types.find(type => type.startsWith('image/'));
                if (imageType) {
                    const blob = await item.getType(imageType);
                    const reader = new FileReader();
                    reader.onload = () => {
                        const dataUrl = reader.result as string;
                        updateState(prev => ({
                            inputImages: [dataUrl, ...prev.inputImages],
                            selectedInputIndex: 0
                        }));
                        addToast('Изображение вставлено из буфера', 'success');
                    };
                    reader.readAsDataURL(blob);
                    return;
                }
            }
            addToast('В буфере обмена нет изображения', 'info');
        } catch {
            addToast('Не удалось прочитать буфер обмена', 'warning');
        }
    };

    // Drag-and-drop onto a View Slot
    const handleDropOnViewSlot = (e: React.DragEvent, targetSlot: ViewSlotKey) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDropOverSlot(prev => ({ ...prev, [targetSlot]: false }));

        // 1. Swap slots
        if (draggedSlot && draggedSlot !== targetSlot) {
            const srcVal = state.activeViews[draggedSlot];
            const targetVal = state.activeViews[targetSlot];
            const srcMuted = state.mutedViews?.[draggedSlot];
            const targetMuted = state.mutedViews?.[targetSlot];

            updateActiveViewsAndSyncPack(
                prevViews => ({
                    ...prevViews,
                    [draggedSlot]: targetVal,
                    [targetSlot]: srcVal
                }),
                prevMuted => ({
                    ...prevMuted,
                    [draggedSlot]: targetMuted,
                    [targetSlot]: srcMuted
                })
            );
            setDraggedSlot(null);
            addToast(`Поменяли местами: ${draggedSlot.toUpperCase()} ↔ ${targetSlot.toUpperCase()}`, 'info');
            return;
        }

        // 2. Custom drag data
        const appDragImg = e.dataTransfer.getData('application/prompt-modifier-drag-image') ||
                            e.dataTransfer.getData('text/uri-list') ||
                            e.dataTransfer.getData('text/plain');

        if (appDragImg && (appDragImg.startsWith('data:image') || appDragImg.startsWith('http'))) {
            handleSetSingleView(targetSlot, appDragImg);
            addToast(`Вид ${targetSlot.toUpperCase()} обновлен`, 'success');
            return;
        }

        // 3. Native file drop
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = () => {
                    handleSetSingleView(targetSlot, reader.result as string);
                    addToast(`Вид ${targetSlot.toUpperCase()} загружен из файла`, 'success');
                };
                reader.readAsDataURL(file);
            }
        }
    };

    // View slot icons & styling
    const slotConfig: { [key in ViewSlotKey]: { label: string; icon: React.ReactNode; color: string; badge: string; shortcut: string } } = {
        front: { label: t('batchprep.view.front') || 'Спереди (Front)', icon: <HeadFrontIcon className="w-5 h-5" />, color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/20', badge: 'Front', shortcut: 'F' },
        back: { label: t('batchprep.view.back') || 'Сзади (Back)', icon: <HeadBackIcon className="w-5 h-5" />, color: 'text-blue-400 border-blue-500/40 bg-blue-950/20', badge: 'Back', shortcut: 'B' },
        left: { label: t('batchprep.view.left') || 'Слева (Left)', icon: <HeadLeftIcon className="w-5 h-5" />, color: 'text-purple-400 border-purple-500/40 bg-purple-950/20', badge: 'Left', shortcut: 'L' },
        right: { label: t('batchprep.view.right') || 'Справа (Right)', icon: <HeadRightIcon className="w-5 h-5" />, color: 'text-amber-400 border-amber-500/40 bg-amber-950/20', badge: 'Right', shortcut: 'R' },
    };

    const activePack = useMemo(() => {
        if (!state.activePackId) return null;
        return state.packs.find(p => p.id === state.activePackId) || null;
    }, [state.activePackId, state.packs]);

    const filledActiveViewCount = [
        state.mutedViews?.front ? null : state.activeViews.front,
        state.mutedViews?.back ? null : state.activeViews.back,
        state.mutedViews?.left ? null : state.activeViews.left,
        state.mutedViews?.right ? null : state.activeViews.right
    ].filter(Boolean).length;

    // ==========================================
    // Virtual Scroll Buffering for Inputs List (Column 1)
    // ==========================================
    const inputsContainerRef = useRef<HTMLDivElement>(null);
    const [inputsScrollTop, setInputsScrollTop] = useState(0);
    const [inputsViewportHeight, setInputsViewportHeight] = useState(400);

    const handleInputsScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setInputsScrollTop(e.currentTarget.scrollTop);
    }, []);

    useEffect(() => {
        if (!inputsContainerRef.current) return;
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setInputsViewportHeight(entry.contentRect.height || 400);
            }
        });
        ro.observe(inputsContainerRef.current);
        return () => ro.disconnect();
    }, []);

    const INPUT_ITEM_HEIGHT = 74; // height + gap
    const INPUT_OVERSCAN = 3;

    const { visibleInputItems, inputTopSpacerHeight, inputBottomSpacerHeight } = useMemo(() => {
        const total = allInputImages.length;
        if (total === 0) {
            return { visibleInputItems: [], inputTopSpacerHeight: 0, inputBottomSpacerHeight: 0 };
        }

        const startIndex = Math.max(0, Math.floor(inputsScrollTop / INPUT_ITEM_HEIGHT) - INPUT_OVERSCAN);
        const endIndex = Math.min(total, Math.ceil((inputsScrollTop + inputsViewportHeight) / INPUT_ITEM_HEIGHT) + INPUT_OVERSCAN);

        const items: { imgSrc: string; index: number }[] = [];
        for (let i = startIndex; i < endIndex; i++) {
            items.push({ imgSrc: allInputImages[i], index: i });
        }

        const topSpacer = startIndex * INPUT_ITEM_HEIGHT;
        const bottomSpacer = (total - endIndex) * INPUT_ITEM_HEIGHT;

        return {
            visibleInputItems: items,
            inputTopSpacerHeight: topSpacer,
            inputBottomSpacerHeight: bottomSpacer
        };
    }, [allInputImages, inputsScrollTop, inputsViewportHeight]);

    // ==========================================
    // Virtual Scroll Buffering for Packs Buffer (Column 4)
    // ==========================================
    const packsContainerRef = useRef<HTMLDivElement>(null);
    const [packsScrollTop, setPacksScrollTop] = useState(0);
    const [packsViewportHeight, setPacksViewportHeight] = useState(400);

    const handlePacksScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setPacksScrollTop(e.currentTarget.scrollTop);
    }, []);

    useEffect(() => {
        if (!packsContainerRef.current) return;
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setPacksViewportHeight(entry.contentRect.height || 400);
            }
        });
        ro.observe(packsContainerRef.current);
        return () => ro.disconnect();
    }, []);

    const PACK_ITEM_HEIGHT = 148; // card height + gap
    const PACK_OVERSCAN = 2;

    const { visiblePackItems, packTopSpacerHeight, packBottomSpacerHeight } = useMemo(() => {
        const total = state.packs.length;
        if (total === 0) {
            return { visiblePackItems: [], packTopSpacerHeight: 0, packBottomSpacerHeight: 0 };
        }

        const startIndex = Math.max(0, Math.floor(packsScrollTop / PACK_ITEM_HEIGHT) - PACK_OVERSCAN);
        const endIndex = Math.min(total, Math.ceil((packsScrollTop + packsViewportHeight) / PACK_ITEM_HEIGHT) + PACK_OVERSCAN);

        const items: { pack: BatchPreparePack; index: number }[] = [];
        for (let i = startIndex; i < endIndex; i++) {
            items.push({ pack: state.packs[i], index: i });
        }

        const topSpacer = startIndex * PACK_ITEM_HEIGHT;
        const bottomSpacer = (total - endIndex) * PACK_ITEM_HEIGHT;

        return {
            visiblePackItems: items,
            packTopSpacerHeight: topSpacer,
            packBottomSpacerHeight: bottomSpacer
        };
    }, [state.packs, packsScrollTop, packsViewportHeight]);

    return (
        <div className="flex flex-col w-full h-full text-gray-200 select-none overflow-hidden bg-gray-950/90 font-sans">
            {/* Main Header / Status Ribbon */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800/80 bg-gray-900/90 backdrop-blur-md shrink-0">
                <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 shadow-inner">
                        <BatchPrepareIcon className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-gray-100 tracking-wide">
                                {t('batchprep.nodeTitle') || '3D Multiview Batch Prepare'}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold border ${
                                filledActiveViewCount === 4 
                                    ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300' 
                                    : filledActiveViewCount > 0 
                                        ? 'bg-amber-950/70 border-amber-500/50 text-amber-300' 
                                        : 'bg-gray-800 border-gray-700 text-gray-400'
                            }`}>
                                {filledActiveViewCount}/4 Active Views
                            </span>
                            {activePack ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 flex items-center space-x-1 shadow-sm">
                                    <Sparkles className="w-2.5 h-2.5 text-cyan-400 animate-pulse" />
                                    <span>Пак: {activePack.name} (Авто-синхронизация)</span>
                                </span>
                            ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-gray-800 border border-gray-700 text-gray-400">
                                    Живой редактор (Без пака)
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-1.5">
                    <button
                        onClick={handleSaveCurrentToPack}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white flex items-center space-x-1 shadow-sm transition-all border border-indigo-400/30"
                        title={t('batchprep.saveToPackTitle') || 'Сохранить текущие 4 ракурса как новый пак в буфер'}
                    >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>{t('batchprep.savePackBtn') || '+ Пак в буфер'}</span>
                    </button>
                    {state.packs.length > 0 && (
                        <button
                            onClick={handleDownloadAllPacksZip}
                            className="p-1.5 rounded-md bg-gray-800 hover:bg-gray-700 active:bg-gray-900 text-gray-300 hover:text-white border border-gray-700/60 transition-colors"
                            title="Скачать все паки архивом ZIP"
                        >
                            <Download className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* 4-Column Layout */}
            <div className="grid grid-cols-4 gap-2 p-2.5 flex-1 min-h-0 w-full overflow-hidden">
                
                {/* COLUMN 1: INPUT IMAGES WITH VIRTUAL BUFFERING & 64x64 PREVIEWS */}
                <div className="flex flex-col h-full bg-gray-900/70 rounded-lg border border-gray-800 overflow-hidden">
                    <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-gray-800 bg-gray-900/90 shrink-0">
                        <div className="flex items-center space-x-1.5">
                            <span className="text-[11px] font-bold text-gray-300 tracking-wider uppercase">
                                1. {t('batchprep.col1.title') || 'Вход (Inputs)'}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-800 text-gray-400 border border-gray-700 font-semibold">
                                {allInputImages.length}
                            </span>
                        </div>
                        <div className="flex items-center space-x-1">
                            {/* Disconnect connection & embed all images into node */}
                            <button
                                onClick={handleBakeAndDisconnectInput}
                                disabled={allInputImages.length === 0 && !hasIncomingConnections}
                                className={`p-1 rounded transition-colors ${
                                    hasIncomingConnections 
                                        ? 'text-cyan-300 hover:text-cyan-100 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/60 shadow-sm' 
                                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                                } disabled:opacity-35`}
                                title={
                                    hasIncomingConnections
                                        ? "Разорвать входящее соединение и встроить все изображения в ноду"
                                        : "Встроить все изображения в ноду"
                                }
                            >
                                {hasIncomingConnections ? <Unlink className="w-3.5 h-3.5 text-cyan-300" /> : <Link className="w-3.5 h-3.5" />}
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-1 rounded text-gray-300 hover:text-cyan-300 hover:bg-gray-800 transition-colors"
                                title="Загрузить изображения с диска"
                            >
                                <Upload className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={handlePasteFromClipboard}
                                className="p-1 rounded text-gray-300 hover:text-cyan-300 hover:bg-gray-800 transition-colors"
                                title="Вставить из буфера"
                            >
                                <Copy className="w-3.5 h-3.5" />
                            </button>
                            {state.inputImages.length > 0 && (
                                <button
                                    onClick={() => updateState({ inputImages: [], selectedInputIndex: 0 })}
                                    className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
                                    title="Очистить локальные входы"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    <input 
                        ref={fileInputRef} 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        className="hidden" 
                        onChange={handleUploadInputFiles} 
                    />

                    {/* Quick batch assign button */}
                    {allInputImages.length >= 2 && (
                        <div className="px-2 py-1 bg-gray-950/60 border-b border-gray-800/80 flex items-center justify-between shrink-0">
                            <span className="text-[10px] text-gray-400">Быстрое заполнение:</span>
                            <button
                                onClick={() => handleAutoAssignToViews(allInputImages)}
                                className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-600/40 text-cyan-300 hover:bg-cyan-900/80 transition-colors font-medium flex items-center space-x-1"
                                title="Заполнить 4 ракурса из первых 4 входящих изображений"
                            >
                                <span>1→4 Ракурса</span>
                            </button>
                        </div>
                    )}

                    {/* Input items virtualized list */}
                    <div 
                        ref={inputsContainerRef}
                        onScroll={handleInputsScroll}
                        className={`flex-1 min-h-0 overflow-y-auto p-2 space-y-2 no-scrollbar ${
                            isDropOverInputs ? 'bg-cyan-950/20 border-2 border-dashed border-cyan-500/50' : ''
                        }`}
                        onDragOver={(e) => { e.preventDefault(); setIsDropOverInputs(true); }}
                        onDragLeave={() => setIsDropOverInputs(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDropOverInputs(false);
                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                const readPromises = Array.from(e.dataTransfer.files).map(file => {
                                    return new Promise<string>(resolve => {
                                        const r = new FileReader();
                                        r.onload = () => resolve(r.result as string);
                                        r.readAsDataURL(file);
                                    });
                                });
                                Promise.all(readPromises).then(newImgs => {
                                    updateState(prev => ({
                                        inputImages: [...newImgs, ...prev.inputImages],
                                        selectedInputIndex: 0
                                    }));
                                });
                            }
                        }}
                    >
                        {allInputImages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-3 text-gray-500 border border-dashed border-gray-800 rounded-lg">
                                <Upload className="w-6 h-6 mb-1 text-gray-600" />
                                <span className="text-xs font-medium text-gray-400">Нет входящих картинок</span>
                                <span className="text-[10px] text-gray-600 mt-0.5">
                                    Перетащите сюда, вставьте из буфера или подключите ноду на вход
                                </span>
                            </div>
                        ) : (
                            <>
                                {/* Virtual scroll top spacer */}
                                {inputTopSpacerHeight > 0 && (
                                    <div style={{ height: `${inputTopSpacerHeight}px` }} />
                                )}

                                {visibleInputItems.map(({ imgSrc, index: idx }) => {
                                    const isSelected = state.selectedInputIndex === idx;
                                    return (
                                        <div
                                            key={`in-${idx}`}
                                            draggable
                                            onDragStart={(e) => {
                                                // CRITICAL: Always use full resolution original image for drag/drop
                                                setupImageDragData(e, imgSrc, `Input_${idx + 1}.png`);
                                            }}
                                            onClick={() => updateState({ selectedInputIndex: idx })}
                                            className={`group relative flex items-center p-1.5 rounded-md border cursor-pointer transition-all ${
                                                isSelected 
                                                    ? 'bg-cyan-950/40 border-cyan-500/70 shadow-sm shadow-cyan-950/50' 
                                                    : 'bg-gray-800/60 border-gray-700/60 hover:border-gray-600 hover:bg-gray-800'
                                            }`}
                                            style={{ height: '66px' }}
                                        >
                                            <span className="text-[10px] font-bold text-gray-400 w-4 text-center shrink-0">
                                                #{idx + 1}
                                            </span>
                                            {/* 64x64 Preview Thumbnail */}
                                            <div className="w-16 h-16 rounded bg-black/60 overflow-hidden shrink-0 border border-gray-700/70 flex items-center justify-center">
                                                <OptimizedThumbnail
                                                    src={imgSrc}
                                                    size={64}
                                                    alt={`Input ${idx + 1}`}
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>

                                            <div className="ml-2 flex-1 min-w-0 flex flex-col justify-center">
                                                <span className="text-[11px] font-semibold text-gray-200 truncate">
                                                    Кадр #{idx + 1}
                                                </span>
                                                <span className="text-[9px] text-gray-500">
                                                    {isSelected ? '● Выбран для нарезки' : 'Нажмите для выбора'}
                                                </span>
                                            </div>

                                            <div className="flex items-center space-x-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // CRITICAL: Always use full resolution original image for full viewer
                                                        setImageViewer?.({
                                                            sources: [{ src: imgSrc, frameNumber: idx + 1 }],
                                                            initialIndex: 0
                                                        });
                                                    }}
                                                    className="p-1 text-gray-400 hover:text-white rounded"
                                                    title="Просмотр в полном разрешении"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Virtual scroll bottom spacer */}
                                {inputBottomSpacerHeight > 0 && (
                                    <div style={{ height: `${inputBottomSpacerHeight}px` }} />
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* COLUMN 2: MULTIPLE GRID & BATCH SLICING */}
                <div className="flex flex-col h-full bg-gray-900/70 rounded-lg border border-gray-800 overflow-hidden">
                    <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-gray-800 bg-gray-900/90 shrink-0">
                        <span className="text-[11px] font-bold text-gray-300 tracking-wider uppercase">
                            2. {t('batchprep.col2.title') || 'Нарезка (Grid Slice)'}
                        </span>
                        {state.slicedImages.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                                {state.slicedImages.length} частей
                            </span>
                        )}
                    </div>

                    {/* Presets & Border Options Settings Bar */}
                    <div className="p-2 border-b border-gray-800/80 bg-gray-950/40 shrink-0 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-gray-400">Сетка нарезки:</span>
                            <span className="text-[10px] text-gray-500 font-mono">
                                {state.gridConfig.cols}x{state.gridConfig.rows}
                            </span>
                        </div>

                        {/* Presets + Slice 1 + Reset buttons */}
                        <div className="grid grid-cols-4 gap-1">
                            {[
                                { id: '1x2', label: '1x2' },
                                { id: '1x3', label: '1x3' },
                                { id: '1x4', label: '1x4 (FBLR)' },
                                { id: '2x2', label: '2x2' },
                                { id: '2x1', label: '2x1' },
                                { id: '3x1', label: '3x1' },
                            ].map((preset) => {
                                const isAct = state.gridConfig.preset === preset.id;
                                return (
                                    <button
                                        key={preset.id}
                                        onClick={() => handleSetGridPreset(preset.id as any)}
                                        className={`px-1.5 py-1 text-[10px] font-medium rounded border transition-all ${
                                            isAct 
                                                ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm' 
                                                : 'bg-gray-800/80 text-gray-300 border-gray-700/60 hover:bg-gray-700'
                                        }`}
                                    >
                                        {preset.label}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => handlePerformSlice()}
                                disabled={!activeSourceImage || isSlicing || isBatchSlicing}
                                className="px-1.5 py-1 text-[10px] font-semibold rounded bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white disabled:opacity-50 flex items-center justify-center space-x-1 shadow-sm"
                                title="Нарезать текущее выбранное изображение"
                            >
                                <Scissors className="w-3 h-3" />
                                <span>{isSlicing ? '...' : '1 Кадр'}</span>
                            </button>
                            <button
                                onClick={handleResetGrid}
                                className="px-1.5 py-1 text-[10px] font-semibold rounded bg-gray-800 hover:bg-gray-700 active:bg-gray-900 text-gray-300 hover:text-white border border-gray-700/60 flex items-center justify-center space-x-1 transition-colors"
                                title="Сбросить границы, рамку и разделители сетки по умолчанию"
                            >
                                <RotateCcw className="w-3 h-3 text-cyan-400" />
                                <span>Сброс</span>
                            </button>
                        </div>

                        {/* Border Thickness with RELEASE ONLY COMMIT */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-800/60 text-[10px]">
                            <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                                <span className="text-gray-400 shrink-0">Рамка:</span>
                                <input
                                    type="range"
                                    min="0"
                                    max="40"
                                    step="1"
                                    value={localBorderWidth}
                                    onChange={(e) => setLocalBorderWidth(Number(e.target.value))}
                                    onMouseUp={() => commitBorderWidth(localBorderWidth)}
                                    onTouchEnd={() => commitBorderWidth(localBorderWidth)}
                                    onPointerUp={() => commitBorderWidth(localBorderWidth)}
                                    onKeyUp={() => commitBorderWidth(localBorderWidth)}
                                    className="flex-1 accent-cyan-500 h-1.5 bg-gray-800 rounded cursor-pointer"
                                />
                                <span className="font-mono text-cyan-300 w-7 text-right shrink-0">{localBorderWidth}px</span>
                            </div>

                            <button
                                onClick={() => {
                                    const nextMode = state.gridConfig.borderMode === 'all' ? 'inner' : 'all';
                                    updateState(prev => ({
                                        gridConfig: {
                                            ...prev.gridConfig,
                                            borderMode: nextMode
                                        }
                                    }));
                                }}
                                className={`px-1.5 py-0.5 rounded border text-[9px] font-medium transition-colors ${
                                    state.gridConfig.borderMode === 'all' 
                                        ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300' 
                                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
                                }`}
                                title={state.gridConfig.borderMode === 'all' ? 'Режим границы: Внутренние + Внешние (All)' : 'Режим границы: Только между ячейками (Inner)'}
                            >
                                {state.gridConfig.borderMode === 'all' ? 'Внутр.+Внешн.' : 'Только внутр.'}
                            </button>
                        </div>
                    </div>

                    {/* Source Image Slice Overlay Preview: Strictly bounded to image rectangle */}
                    <div className="relative flex-1 min-h-[140px] bg-black/90 border-b border-gray-800/80 flex items-center justify-center overflow-hidden p-2">
                        {activeSourceImage && sourceNaturalSize ? (
                            <div 
                                className="relative select-none flex items-center justify-center"
                                style={{
                                    aspectRatio: `${sourceNaturalSize.width} / ${sourceNaturalSize.height}`,
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    width: 'auto',
                                    height: 'auto',
                                }}
                            >
                                <img 
                                    src={activeSourceImage} 
                                    alt="" 
                                    className="w-full h-full object-contain pointer-events-none select-none block rounded" 
                                />
                                
                                <ImageGridOverlay
                                    gridConfig={{
                                        cols: state.gridConfig.cols,
                                        rows: state.gridConfig.rows,
                                        bounds: state.gridConfig.bounds || { x: 0, y: 0, width: 1, height: 1 },
                                        enableBorder: (state.gridConfig.borderWidth || 0) > 0,
                                        borderWidth: state.gridConfig.borderWidth || 0,
                                        borderMode: state.gridConfig.borderMode || 'inner',
                                        customDividers: true,
                                        colDividers: state.gridConfig.colDividers,
                                        rowDividers: state.gridConfig.rowDividers,
                                    }}
                                    onChangeGridConfig={(newCfg) => {
                                        updateState(prev => ({
                                            gridConfig: {
                                                ...prev.gridConfig,
                                                cols: newCfg.cols,
                                                rows: newCfg.rows,
                                                bounds: newCfg.bounds,
                                                borderWidth: newCfg.borderWidth,
                                                borderMode: newCfg.borderMode,
                                                enableBorder: (newCfg.borderWidth || 0) > 0,
                                                colDividers: newCfg.colDividers,
                                                rowDividers: newCfg.rowDividers,
                                                customDividers: true,
                                            }
                                        }));
                                    }}
                                    imageNaturalSize={sourceNaturalSize}
                                />
                            </div>
                        ) : activeSourceImage ? (
                            <img src={activeSourceImage} alt="" className="max-w-full max-h-full object-contain rounded" />
                        ) : (
                            <span className="text-[11px] text-gray-500">Выберите кадр в Колонке 1</span>
                        )}
                    </div>

                    {/* Generated Slices Grid with 64x64 Previews */}
                    <div className="shrink-0 h-28 flex flex-col overflow-hidden bg-gray-950/70 border-t border-gray-800">
                        <div className="flex items-center justify-between px-2 py-0.5 bg-gray-900 border-b border-gray-800 shrink-0">
                            <span className="text-[10px] font-semibold text-gray-400">Нарезанные части (Slices):</span>
                            <span className="text-[9px] text-gray-500">
                                {state.slicedImages.length > 0 ? `${state.slicedImages.length} шт.` : 'пусто'}
                            </span>
                        </div>

                        <div className="flex-1 min-h-0 p-1.5 grid grid-cols-4 gap-1 overflow-x-auto overflow-y-hidden no-scrollbar">
                            {state.slicedImages.length === 0 ? (
                                <div className="col-span-4 flex flex-col items-center justify-center h-full text-gray-500 text-center p-1">
                                    <Grid className="w-4 h-4 mb-0.5 text-gray-600" />
                                    <span className="text-[9px]">Нажмите "1 Кадр" или "Нарезать ВСЕ"</span>
                                </div>
                            ) : (
                                state.slicedImages.map((sliceData, sliceIdx) => (
                                    <div
                                        key={`slice-${sliceIdx}`}
                                        draggable
                                        onDragStart={(e) => {
                                            // CRITICAL: Always use full resolution original slice for dragging
                                            setupImageDragData(e, sliceData, `Slice_${sliceIdx + 1}.png`);
                                        }}
                                        className="relative group rounded bg-gray-800/80 border border-gray-700/80 overflow-hidden cursor-grab active:cursor-grabbing hover:border-cyan-400/80 transition-all p-1 flex flex-col items-center justify-between h-full"
                                    >
                                        <div className="w-full flex-1 min-h-0 bg-black/60 rounded flex items-center justify-center overflow-hidden">
                                            {/* 64x64 Slice Preview */}
                                            <OptimizedThumbnail
                                                src={sliceData}
                                                size={64}
                                                alt={`Slice ${sliceIdx + 1}`}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <div className="w-full mt-0.5 flex items-center justify-between text-[8px] text-gray-400 px-0.5 shrink-0">
                                            <span className="font-bold text-cyan-300">#{sliceIdx + 1}</span>
                                            <button
                                                onClick={() => {
                                                    // CRITICAL: Full-res viewing
                                                    setImageViewer?.({
                                                        sources: [{ src: sliceData, frameNumber: sliceIdx + 1 }],
                                                        initialIndex: 0
                                                    });
                                                }}
                                                className="hover:text-white p-0.5"
                                            >
                                                <Eye className="w-2.5 h-2.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="p-2 border-t border-gray-800 bg-gray-900/90 shrink-0 flex flex-col space-y-2">
                        {/* Row 1: Auto-send toggle on Left + Send to 3D Views on Right */}
                        <div className="flex items-center space-x-2">
                            {/* Auto-send toggle on the LEFT */}
                            <div 
                                onClick={() => {
                                    const nextVal = !state.autoSendToViews;
                                    updateState({ autoSendToViews: nextVal });
                                    if (nextVal && state.slicedImages.length > 0) {
                                        handleAutoAssignToViews(state.slicedImages);
                                    }
                                    addToast(nextVal ? 'Авто-отправка в 3D Views: ВКЛ' : 'Авто-отправка в 3D Views: ВЫКЛ', 'info');
                                }}
                                className={`h-[32px] px-2.5 rounded-md border flex items-center justify-center space-x-1.5 cursor-pointer select-none transition-all shrink-0 ${
                                    state.autoSendToViews 
                                        ? 'bg-cyan-950/70 border-cyan-500/60 shadow-sm shadow-cyan-950/50' 
                                        : 'bg-gray-800/80 border-gray-700 hover:border-gray-600'
                                }`}
                                title={state.autoSendToViews ? 'Авто-отправка в 3D Views: ВКЛ (нарезка сразу обновляет ракурсы)' : 'Авто-отправка в 3D Views: ВЫКЛ (нажмите для включения)'}
                            >
                                <Zap className={`w-3.5 h-3.5 ${state.autoSendToViews ? 'text-amber-400 animate-pulse' : 'text-gray-400'}`} />
                                <span className="text-[10px] font-medium text-gray-300">Авто</span>
                                <div className={`w-5 h-3 rounded-full p-0.5 flex items-center transition-colors ${
                                    state.autoSendToViews ? 'bg-cyan-500 justify-end' : 'bg-gray-600 justify-start'
                                }`}>
                                    <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
                                </div>
                            </div>

                            {/* Send to 3D Views button on the RIGHT */}
                            <button
                                onClick={() => {
                                    if (state.slicedImages.length > 0) {
                                        handleAutoAssignToViews(state.slicedImages);
                                    } else if (activeSourceImage) {
                                        handlePerformSlice(activeSourceImage).then(() => {
                                            if (!state.autoSendToViews && stateRef.current.slicedImages.length > 0) {
                                                handleAutoAssignToViews(stateRef.current.slicedImages);
                                            }
                                        });
                                    } else {
                                        addToast('Выберите входящее изображение для нарезки', 'info');
                                    }
                                }}
                                disabled={!activeSourceImage && state.slicedImages.length === 0}
                                className="flex-1 py-1.5 px-2 text-xs font-bold rounded-md bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 active:from-cyan-700 active:to-indigo-700 text-white disabled:opacity-40 flex items-center justify-center space-x-1.5 shadow-md shadow-cyan-950/40 transition-all border border-cyan-400/40"
                                title="Отправить нарезанные фрагменты в 4 ракурса 3D (Front, Back, Left, Right)"
                            >
                                <ArrowRight className="w-3.5 h-3.5 text-cyan-200" />
                                <span>Отправить в 3D Views</span>
                            </button>
                        </div>

                        {/* Row 2: BATCH SLICE ALL at the VERY BOTTOM */}
                        <button
                            onClick={handleBatchSliceAllToPackBuffer}
                            disabled={allInputImages.length === 0 || isBatchSlicing || isSlicing}
                            className="w-full py-2 px-2.5 text-xs font-bold rounded-md bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 active:from-emerald-700 active:to-cyan-700 text-white disabled:opacity-40 flex items-center justify-center space-x-2 shadow-md shadow-emerald-950/50 border border-emerald-400/40 transition-all"
                            title={`Нарезать ВСЕ входящие изображения (${allInputImages.length} шт.) по сетке ${state.gridConfig.cols}x${state.gridConfig.rows} и отправить в Пак Буфер`}
                        >
                            {isBatchSlicing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                                    <span>Нарезка {batchProgress?.current || 0}/{batchProgress?.total || allInputImages.length}...</span>
                                </>
                            ) : (
                                <>
                                    <Zap className="w-4 h-4 text-yellow-300" />
                                    <span>Нарезать ВСЕ ({allInputImages.length}) в Пак Буфер</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* COLUMN 3: 4-VIEW MULTIVIEW SLOTS (128x128 PREVIEWS FOR 3D VIEWS) */}
                <div className="flex flex-col h-full bg-gray-900/70 rounded-lg border border-gray-800 overflow-hidden">
                    <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-gray-800 bg-gray-900/90 shrink-0">
                        <div className="flex items-center space-x-1">
                            <span className="text-[11px] font-bold text-gray-300 tracking-wider uppercase">
                                3. {t('batchprep.col3.title') || '4 Ракурса (3D Views)'}
                            </span>
                            {activePack && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60 truncate max-w-[80px]">
                                    {activePack.name}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center space-x-1">
                            <button
                                onClick={handleSwapLeftRight}
                                className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-purple-300 transition-colors border border-gray-700/50"
                                title="Поменять Левый ↔ Правый вид местами (авто-синхронизируется с паком)"
                            >
                                <ArrowLeftRight className="w-3 h-3" />
                            </button>
                            <button
                                onClick={handleSwapFrontBack}
                                className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-blue-300 transition-colors border border-gray-700/50"
                                title="Поменять Передний ↔ Задний вид местами (авто-синхронизируется с паком)"
                            >
                                <ArrowUpDown className="w-3 h-3" />
                            </button>
                            <button
                                onClick={handleRotateViews}
                                className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-amber-300 transition-colors border border-gray-700/50"
                                title="Сдвинуть ракурсы по кругу (Front→Right→Back→Left)"
                            >
                                <RotateCw className="w-3 h-3" />
                            </button>
                            <button
                                onClick={handleClearAllViews}
                                className="p-1 rounded bg-gray-800 hover:bg-red-950/80 text-gray-400 hover:text-red-300 transition-colors border border-gray-700/50"
                                title="Очистить все 4 ракурса"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* 4 Interactive View Cards with 128x128 Previews */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-2 grid grid-cols-2 gap-2 no-scrollbar">
                        {(['front', 'back', 'left', 'right'] as ViewSlotKey[]).map((slotKey) => {
                            const conf = slotConfig[slotKey];
                            const dataUrl = state.activeViews[slotKey];
                            const isMuted = Boolean(state.mutedViews?.[slotKey]);
                            const isOver = Boolean(isDropOverSlot[slotKey]);

                            return (
                                <div
                                    key={`view-slot-${slotKey}`}
                                    draggable={Boolean(dataUrl)}
                                    onDragStart={(e) => {
                                        if (dataUrl) {
                                            setDraggedSlot(slotKey);
                                            // CRITICAL: Always use full resolution original image for drag data
                                            setupImageDragData(e, dataUrl, `${slotKey}.png`);
                                        }
                                    }}
                                    onDragEnd={() => setDraggedSlot(null)}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsDropOverSlot(prev => ({ ...prev, [slotKey]: true }));
                                    }}
                                    onDragLeave={() => {
                                        setIsDropOverSlot(prev => ({ ...prev, [slotKey]: false }));
                                    }}
                                    onDrop={(e) => handleDropOnViewSlot(e, slotKey)}
                                    className={`relative flex flex-col rounded-lg border transition-all p-1.5 ${
                                        isOver
                                            ? 'border-2 border-dashed border-cyan-400 bg-cyan-950/40 scale-[1.02]'
                                            : isMuted
                                                ? 'border-red-500/50 bg-red-950/20 opacity-80'
                                                : dataUrl
                                                    ? `${conf.color} border-opacity-60`
                                                    : 'border-dashed border-gray-700/70 bg-gray-950/40 hover:border-gray-600'
                                    }`}
                                >
                                    {/* Slot Header with Mute & Controls */}
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center space-x-1">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isMuted ? 'text-red-400 line-through opacity-70' : ''}`}>
                                                [{conf.shortcut}] {conf.badge}
                                            </span>
                                        </div>

                                        <div className="flex items-center space-x-1">
                                            {/* MUTE / UNMUTE BUTTON (EYE / EYE-OFF) */}
                                            <button
                                                onClick={() => handleToggleMuteView(slotKey)}
                                                className={`p-1 rounded transition-colors ${
                                                    isMuted 
                                                        ? 'bg-red-900/60 text-red-300 hover:bg-red-800 hover:text-white shadow-sm border border-red-500/40' 
                                                        : 'text-gray-400 hover:text-cyan-300 hover:bg-gray-800'
                                                }`}
                                                title={isMuted ? `Включить ракурс ${conf.badge} (Скрыт)` : `Исключить/скрыть ракурс ${conf.badge} из пака`}
                                            >
                                                {isMuted ? <EyeOff className="w-3 h-3 text-red-300" /> : <Eye className="w-3 h-3" />}
                                            </button>

                                            {dataUrl && (
                                                <>
                                                    <button
                                                        onClick={() => handleFlipView(slotKey)}
                                                        className="p-0.5 rounded text-gray-400 hover:text-white hover:bg-gray-800"
                                                        title="Отразить по горизонтали (Flip)"
                                                    >
                                                        <FlipHorizontal className="w-2.5 h-2.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            // CRITICAL: Full resolution image viewing
                                                            setImageViewer?.({
                                                                sources: [{ src: dataUrl, frameNumber: 1, prompt: conf.label }],
                                                                initialIndex: 0
                                                            });
                                                        }}
                                                        className="p-0.5 rounded text-gray-400 hover:text-white hover:bg-gray-800"
                                                        title="Увеличить в полном разрешении"
                                                    >
                                                        <Maximize2 className="w-2.5 h-2.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleSetSingleView(slotKey, null)}
                                                        className="p-0.5 rounded text-gray-400 hover:text-red-400 hover:bg-gray-800"
                                                        title="Удалить ракурс"
                                                    >
                                                        <X className="w-2.5 h-2.5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* 128x128 3D View Preview Container */}
                                    <div className="flex-1 min-h-[90px] rounded bg-black/60 border border-gray-800/80 flex items-center justify-center overflow-hidden relative">
                                        {dataUrl ? (
                                            <>
                                                <OptimizedThumbnail
                                                    src={dataUrl}
                                                    size={128}
                                                    alt={slotKey}
                                                    className={`w-full h-full object-contain transition-all ${isMuted ? 'opacity-30 grayscale filter' : ''}`}
                                                />
                                                {isMuted && (
                                                    <div className="absolute inset-0 bg-black/65 backdrop-blur-[1px] flex flex-col items-center justify-center p-1 text-center">
                                                        <EyeOff className="w-4 h-4 text-red-400 mb-0.5" />
                                                        <span className="text-[9px] font-bold text-red-300">Исключен из пака</span>
                                                        <button
                                                            onClick={() => handleToggleMuteView(slotKey)}
                                                            className="mt-1 text-[8px] px-1.5 py-0.5 rounded bg-red-900/80 hover:bg-red-800 text-white border border-red-500/40 flex items-center space-x-1"
                                                        >
                                                            <Eye className="w-2.5 h-2.5" />
                                                            <span>Включить</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div 
                                                onClick={() => viewFileInputRef.current[slotKey]?.click()}
                                                className="flex flex-col items-center justify-center p-2 text-center text-gray-600 hover:text-gray-400 cursor-pointer w-full h-full"
                                            >
                                                <Plus className="w-4 h-4 mb-0.5" />
                                                <span className="text-[9px] font-medium">Перетащите или нажмите</span>
                                            </div>
                                        )}
                                    </div>

                                    <input 
                                        ref={(el) => { viewFileInputRef.current[slotKey] = el; }} 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const r = new FileReader();
                                                r.onload = () => handleSetSingleView(slotKey, r.result as string);
                                                r.readAsDataURL(file);
                                            }
                                            e.target.value = '';
                                        }} 
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* Bottom CTA */}
                    <div className="p-2 border-t border-gray-800 bg-gray-900/90 shrink-0">
                        <button
                            onClick={handleSaveCurrentToPack}
                            className="w-full py-1.5 text-xs font-bold rounded-md bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-950/50 transition-all border border-indigo-400/40"
                        >
                            <FolderPlus className="w-3.5 h-3.5" />
                            <span>💾 {t('batchprep.savePackBtn') || 'Сохранить как новый пак в буфер (Col 4)'}</span>
                        </button>
                    </div>
                </div>

                {/* COLUMN 4: PACK BUFFER WITH VIRTUAL BUFFERING & 64x64 PREVIEWS */}
                <div className="flex flex-col h-full bg-gray-900/70 rounded-lg border border-gray-800 overflow-hidden">
                    <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-gray-800 bg-gray-900/90 shrink-0">
                        <div className="flex items-center space-x-1.5">
                            <span className="text-[11px] font-bold text-gray-300 tracking-wider uppercase">
                                4. {t('batchprep.col4.title') || 'Буфер паков (Packs)'}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-semibold">
                                {state.packs.length}
                            </span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <button
                                onClick={handleSaveCurrentToPack}
                                className="p-1 rounded bg-gray-800 hover:bg-indigo-900 text-indigo-300 hover:text-white transition-colors border border-gray-700/60"
                                title="Добавить текущие 4 ракурса как новый пак"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                            {state.packs.length > 0 && (
                                <button
                                    onClick={handleClearAllPacks}
                                    className="p-1 rounded bg-gray-800 hover:bg-red-950/80 text-gray-400 hover:text-red-300 transition-colors border border-gray-700/60"
                                    title="Очистить все паки в буфере"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Common Asset Name Field */}
                    <div className="px-2 py-1.5 bg-gray-950/80 border-b border-gray-800/80 flex items-center space-x-1.5 shrink-0">
                        <span className="text-[10px] font-semibold text-gray-400 shrink-0">Asset Name:</span>
                        <input
                            type="text"
                            value={state.assetBaseName !== undefined ? state.assetBaseName : 'Asset_Name'}
                            placeholder="Asset_Name"
                            onChange={(e) => handleBaseNameChange(e.target.value)}
                            className="flex-1 min-w-0 text-xs font-semibold text-cyan-200 bg-gray-900 border border-gray-700 hover:border-gray-600 focus:border-cyan-400 focus:bg-gray-850 px-2 py-0.5 rounded outline-none shadow-inner"
                        />
                    </div>

                    {/* Pack switcher ribbon */}
                    {state.packs.length > 1 && (
                        <div className="px-2 py-1 bg-gray-950/60 border-b border-gray-800 flex items-center justify-between shrink-0">
                            <span className="text-[10px] text-gray-400">Переключение паков:</span>
                            <div className="flex items-center space-x-1">
                                <button
                                    onClick={() => {
                                        const currIdx = state.packs.findIndex(p => p.id === state.activePackId);
                                        const prevIdx = currIdx <= 0 ? state.packs.length - 1 : currIdx - 1;
                                        handleSelectActivePack(state.packs[prevIdx].id);
                                    }}
                                    className="p-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300"
                                    title="Предыдущий пак"
                                >
                                    <ChevronLeft className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={() => {
                                        const currIdx = state.packs.findIndex(p => p.id === state.activePackId);
                                        const nextIdx = currIdx >= state.packs.length - 1 ? 0 : currIdx + 1;
                                        handleSelectActivePack(state.packs[nextIdx].id);
                                    }}
                                    className="p-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300"
                                    title="Следующий пак"
                                >
                                    <ChevronRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Virtualized Packs List */}
                    <div 
                        ref={packsContainerRef}
                        onScroll={handlePacksScroll}
                        className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2 no-scrollbar"
                    >
                        {state.packs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-3 text-gray-500 border border-dashed border-gray-800 rounded-lg">
                                <Folder className="w-6 h-6 mb-1 text-gray-600" />
                                <span className="text-xs font-medium text-gray-400">Буфер паков пуст</span>
                                <span className="text-[10px] text-gray-600 mt-0.5">
                                    Нажмите "⚡ Нарезать ВСЕ в Пак Буфер" во 2-й колонке или настройте ракурсы вручную
                                </span>
                            </div>
                        ) : (
                            <>
                                {/* Virtual scroll top spacer */}
                                {packTopSpacerHeight > 0 && (
                                    <div style={{ height: `${packTopSpacerHeight}px` }} />
                                )}

                                {visiblePackItems.map(({ pack, index: idx }) => {
                                    const isActive = state.activePackId === pack.id;
                                    return (
                                        <div
                                            key={pack.id}
                                            onClick={() => handleSelectActivePack(pack.id)}
                                            className={`relative flex flex-col p-2 rounded-lg border cursor-pointer transition-all ${
                                                isActive 
                                                    ? 'bg-cyan-950/50 border-cyan-500 shadow-md shadow-cyan-950/80 ring-1 ring-cyan-500/50' 
                                                    : 'bg-gray-800/60 border-gray-700/70 hover:border-gray-600 hover:bg-gray-800'
                                            }`}
                                        >
                                            {/* Pack Header */}
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center space-x-1.5 flex-1 min-w-0 mr-1">
                                                    <span className="text-[10px] font-bold text-gray-400 shrink-0">
                                                        #{idx + 1}
                                                    </span>
                                                    <span className="text-[11px] font-bold text-gray-100 truncate" title={pack.name}>
                                                        {pack.name}
                                                    </span>
                                                </div>

                                                {isActive && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-cyan-500 text-black shrink-0 animate-pulse">
                                                        ACTIVE OUTPUT
                                                    </span>
                                                )}
                                            </div>

                                            {/* 4 Mini 64x64 View Thumbnails Strip */}
                                            <div className="grid grid-cols-4 gap-1 p-1 bg-black/50 rounded border border-gray-800/80">
                                                {(['front', 'back', 'left', 'right'] as ViewSlotKey[]).map((vKey) => {
                                                    const img = pack.views[vKey];
                                                    const isSlotMuted = Boolean(pack.mutedViews?.[vKey]);

                                                    return (
                                                        <div key={`pack-${pack.id}-${vKey}`} className="flex flex-col items-center">
                                                            <div className={`w-full h-10 rounded bg-gray-900 border overflow-hidden flex items-center justify-center relative ${
                                                                isSlotMuted ? 'border-red-500/60 bg-red-950/30' : 'border-gray-800'
                                                            }`}>
                                                                {img ? (
                                                                    <OptimizedThumbnail
                                                                        src={img}
                                                                        size={64}
                                                                        alt=""
                                                                        className={`w-full h-full object-contain ${isSlotMuted ? 'opacity-25 grayscale' : ''}`}
                                                                    />
                                                                ) : (
                                                                    <span className="text-[8px] text-gray-600">-</span>
                                                                )}
                                                                {isSlotMuted && (
                                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                                        <EyeOff className="w-3 h-3 text-red-400" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className={`text-[8px] font-semibold mt-0.5 uppercase ${
                                                                isSlotMuted ? 'text-red-400 line-through' : 'text-gray-400'
                                                            }`}>
                                                                {vKey[0].toUpperCase()}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Pack Toolbar Actions */}
                                            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-800/60">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSelectActivePack(pack.id);
                                                    }}
                                                    className={`text-[9px] px-2 py-0.5 rounded font-medium transition-colors ${
                                                        isActive 
                                                            ? 'bg-cyan-700 text-white' 
                                                            : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                                                    }`}
                                                    title="Выбрать и настроить в редакторе ракурсов (Колонка 3)"
                                                >
                                                    {isActive ? '✓ В редакторе' : 'Настроить виды'}
                                                </button>

                                                <div className="flex items-center space-x-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDuplicatePack(pack);
                                                        }}
                                                        className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-700"
                                                        title="Дублировать пак"
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDownloadPackZip(pack);
                                                        }}
                                                        className="p-1 text-gray-400 hover:text-cyan-300 rounded hover:bg-gray-700"
                                                        title="Скачать ZIP пака"
                                                    >
                                                        <Download className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeletePack(pack.id);
                                                        }}
                                                        className="p-1 text-gray-400 hover:text-red-400 rounded hover:bg-gray-700"
                                                        title="Удалить пак"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Virtual scroll bottom spacer */}
                                {packBottomSpacerHeight > 0 && (
                                    <div style={{ height: `${packBottomSpacerHeight}px` }} />
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});
