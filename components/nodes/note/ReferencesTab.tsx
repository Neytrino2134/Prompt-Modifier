
import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { ReferenceItemCard } from './ReferenceItemCard';
import { ActionButton } from '../../ActionButton';
import { setupImageDragData } from '../../../utils/imageUtils';
import JSZip from 'jszip';

interface ReferenceItem {
    id: string;
    image: string | null;
    caption: string;
}

interface ReferencesTabProps {
    nodeTitle?: string;
    references: ReferenceItem[];
    isLocked: boolean; // Connected to upstream
    
    // Actions
    onAddImages: (filesOrData: (File | string | { image: string, caption: string })[], targetIndex?: number) => void;
    onReorder: (sourceIndex: number, targetIndex: number) => void;
    onUpdateCaption: (id: string, newCaption: string) => void;
    onRemoveReference: (id: string) => void;
    onDetach: () => void;
    onShuffle: () => void;
    onUndoShuffle: () => void;
    canUndoShuffle: boolean;
    
    // UI Helpers
    t: (key: string) => string;
    deselectAllNodes: () => void;
    setImageViewer: (state: any) => void;
    addToast: (msg: string, type?: any) => void;
    getFullSizeImage: (index: number) => string | undefined;
    setFullSizeImage: (index: number, dataUrl: string) => void;
    isMinimal: boolean;
}

const CARD_WIDTH = 200;
const CARD_HEIGHT = 270;
const GAP = 8;
const CONTAINER_PADDING = 8;

export const ReferencesTab: React.FC<ReferencesTabProps> = ({
    nodeTitle, references, isLocked, onAddImages, onReorder, onUpdateCaption, onRemoveReference, onDetach,
    onShuffle, onUndoShuffle, canUndoShuffle,
    t, deselectAllNodes, setImageViewer, addToast, getFullSizeImage,
    isMinimal
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // State
    const [containerWidth, setContainerWidth] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);
    const [isDragOverContainer, setIsDragOverContainer] = useState(false);
    const [isDragOverAdd, setIsDragOverAdd] = useState(false);
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
    const [insertionIndex, setInsertionIndex] = useState<number | null>(null);
    const [selectedRefId, setSelectedRefId] = useState<string | null>(null);
    const [manualOrderInputs, setManualOrderInputs] = useState<Record<string, string>>({});
    const [isDownloadingZip, setIsDownloadingZip] = useState(false);

    // Observe container resize
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            if (entries[0]) setContainerWidth(entries[0].contentRect.width);
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Virtualization Logic
    const gridLayout = useMemo(() => {
        const availableWidth = Math.max(0, containerWidth - (CONTAINER_PADDING * 2));
        const columns = Math.max(1, Math.floor((availableWidth + GAP) / (CARD_WIDTH + GAP)));
        const totalItems = references.length + (isLocked ? 0 : 1); // +1 for Add Button if not locked
        const totalRows = Math.ceil(totalItems / columns);
        const totalHeight = (totalRows * CARD_HEIGHT) + (Math.max(0, totalRows - 1) * GAP) + (CONTAINER_PADDING * 2);
        return { columns, totalHeight, totalItems };
    }, [containerWidth, references.length, isLocked]);

    const visibleItems = useMemo(() => {
        const { columns, totalItems } = gridLayout;
        const buffer = 600;
        const visibleStart = Math.max(0, scrollTop - buffer);
        const visibleEnd = scrollTop + (containerRef.current?.clientHeight || 600) + buffer;

        const items = [];
        const startRow = Math.floor((visibleStart - CONTAINER_PADDING) / (CARD_HEIGHT + GAP));
        const endRow = Math.ceil((visibleEnd - CONTAINER_PADDING) / (CARD_HEIGHT + GAP));
        
        for (let row = Math.max(0, startRow); row <= endRow; row++) {
            for (let col = 0; col < columns; col++) {
                const index = (row * columns) + col;
                if (index >= totalItems) break;

                const top = CONTAINER_PADDING + (row * (CARD_HEIGHT + GAP));
                const left = CONTAINER_PADDING + (col * (CARD_WIDTH + GAP));

                items.push({
                    index,
                    top,
                    left,
                    isAddButton: !isLocked && index === references.length
                });
            }
        }
        return items;
    }, [gridLayout, scrollTop, references.length, isLocked]);

    // Handlers
    const handleFilesFromInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onAddImages(Array.from(e.target.files));
        }
        if (e.target) e.target.value = '';
    };

    const handleContainerDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        setIsDragOverContainer(false); setIsDragOverAdd(false); setInsertionIndex(null);
        if (isLocked) return;

        // Check for internal reorder
        const reorderIndexStr = e.dataTransfer.getData('note-ref-index');
        if (reorderIndexStr) {
            const sourceIndex = parseInt(reorderIndexStr, 10);
            if (!isNaN(sourceIndex)) {
                // If dropped on container but not specific slot, move to end
                onReorder(sourceIndex, references.length);
            }
            setDraggingIndex(null); // Ensure drag state is cleared
            return;
        }

        // Check for rich info (Image + Caption)
        const dragInfoData = e.dataTransfer.getData('application/prompt-modifier-drag-info');
        if (dragInfoData) {
             try {
                 const { src, prompt } = JSON.parse(dragInfoData);
                 onAddImages([{ image: src, caption: prompt || '' }]);
                 return;
             } catch (e) { console.error("Error parsing drag info", e); }
        }
        
        // Check for files/images
        const dragImageData = e.dataTransfer.getData('application/prompt-modifier-drag-image');
        if (dragImageData) {
            onAddImages([dragImageData]);
            return;
        }

        const files = Array.from(e.dataTransfer.files).filter((f: File) => f.type.startsWith('image/'));
        if (files.length > 0) {
            onAddImages(files);
        }
    };

    const handleItemDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault(); e.stopPropagation();
        setIsDragOverContainer(false); setIsDragOverAdd(false); setInsertionIndex(null);
        if (isLocked) return;

        const reorderIndexStr = e.dataTransfer.getData('note-ref-index');
        if (reorderIndexStr) {
            const sourceIndex = parseInt(reorderIndexStr, 10);
            if (!isNaN(sourceIndex)) {
                onReorder(sourceIndex, targetIndex);
            }
            setDraggingIndex(null); // Ensure drag state is cleared
            return;
        }
        
        // Check for rich info (Image + Caption)
        const dragInfoData = e.dataTransfer.getData('application/prompt-modifier-drag-info');
        if (dragInfoData) {
             try {
                 const { src, prompt } = JSON.parse(dragInfoData);
                 onAddImages([{ image: src, caption: prompt || '' }], targetIndex);
                 return;
             } catch (e) { console.error("Error parsing drag info", e); }
        }

        // Dropping external files/images onto a specific slot to insert before
        const dragImageData = e.dataTransfer.getData('application/prompt-modifier-drag-image');
        if (dragImageData) {
            onAddImages([dragImageData], targetIndex);
            return;
        }
        
        const files = Array.from(e.dataTransfer.files).filter((f: File) => f.type.startsWith('image/'));
        if (files.length > 0) {
            onAddImages(files, targetIndex);
        }
    };

    const handleItemDragStart = (e: React.DragEvent, index: number) => {
        if (isLocked) return;
        e.stopPropagation();
        setDraggingIndex(index);
        e.dataTransfer.setData('note-ref-index', index.toString());
        e.dataTransfer.effectAllowed = 'move';
    };

    // New Handler for Drag End
    const handleItemDragEnd = (e: React.DragEvent) => {
        setDraggingIndex(null);
        setInsertionIndex(null);
        setIsDragOverContainer(false);
        setIsDragOverAdd(false);
    };
    
    // New Handler for Refresh/Reset State
    const handleRefreshState = () => {
        setDraggingIndex(null);
        setInsertionIndex(null);
        setIsDragOverContainer(false);
        setIsDragOverAdd(false);
        setSelectedRefId(null);
    };

    const handleManualReorder = (id: string, currentIdx: number, newPosStr?: string) => {
        if (!newPosStr || isLocked) return;
        const newPos = parseInt(newPosStr, 10);
        
        if (isNaN(newPos) || newPos < 1 || newPos === currentIdx + 1) return;
        
        let targetIndex;
        if (newPos > references.length) {
             targetIndex = references.length; // Move to end if exceeds length
        } else {
             targetIndex = newPos - 1;
             if (currentIdx < targetIndex) targetIndex = newPos; // logic adjustment for array splice behavior
        }
        
        onReorder(currentIdx, targetIndex);
        setManualOrderInputs(prev => { const next = {...prev}; delete next[id]; return next; });
    };

    const copyImage = async (imgData: string) => {
        if (!imgData) return;
        try {
            const res = await fetch(imgData);
            const blob = await res.blob();
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob as Blob })]);
            addToast(t('toast.copiedToClipboard'));
        } catch (e) {
            addToast(t('toast.copyFailed'), 'error');
        }
    };

    const getImageStats = (src: string): Promise<{ width: number; height: number; aspectRatio: string; format: string; mimeType: string }> => {
        let mimeType = 'image/png';
        let format = 'png';
        const match = src.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/i);
        if (match) {
            mimeType = match[1].toLowerCase();
            if (mimeType.includes('jpeg') || mimeType.includes('jpg')) format = 'jpg';
            else if (mimeType.includes('webp')) format = 'webp';
            else if (mimeType.includes('gif')) format = 'gif';
            else format = 'png';
        } else {
            const extMatch = src.split('?')[0].match(/\.(png|jpe?g|webp|gif|svg)$/i);
            if (extMatch) {
                format = extMatch[1].toLowerCase().replace('jpeg', 'jpg');
                mimeType = `image/${format === 'jpg' ? 'jpeg' : format}`;
            }
        }

        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const width = img.naturalWidth || img.width;
                const height = img.naturalHeight || img.height;
                const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
                const divisor = gcd(width, height) || 1;
                const aspectX = Math.round(width / divisor);
                const aspectY = Math.round(height / divisor);
                const aspectRatio = (aspectX <= 32 && aspectY <= 32 && aspectX > 0 && aspectY > 0)
                    ? `${aspectX}:${aspectY}`
                    : (height > 0 ? (width / height).toFixed(2) : '1:1');
                resolve({ width, height, aspectRatio, format, mimeType });
            };
            img.onerror = () => {
                resolve({ width: 0, height: 0, aspectRatio: 'unknown', format, mimeType });
            };
            img.src = src;
        });
    };

    const handleDownloadAllZip = async () => {
        if (references.length === 0 || isDownloadingZip) return;

        const validReferences = references
            .map((ref, index) => ({ ref, index, fullImage: getFullSizeImage(index) || ref.image }))
            .filter(item => Boolean(item.fullImage));

        if (validReferences.length === 0) {
            if (addToast) addToast(t('node.note.action.noImages') || 'Нет изображений для скачивания', 'error');
            return;
        }

        setIsDownloadingZip(true);
        try {
            const zip = new JSZip();
            const padLength = Math.max(2, String(references.length).length);
            const metadataItems: Array<{
                index: number;
                position: number;
                id: string;
                filename: string;
                caption: string;
                width: number;
                height: number;
                aspectRatio: string;
                format: string;
                sizeBytes?: number;
            }> = [];
            const captionsList: string[] = [];

            for (let i = 0; i < validReferences.length; i++) {
                const { ref, index, fullImage } = validReferences[i];
                const position = index + 1;
                const numPrefix = String(position).padStart(padLength, '0');

                // 1. Get image statistics (dimensions, format)
                const stats = await getImageStats(fullImage!);

                // 2. Clean caption for filename
                const cleanCaption = (ref.caption || '')
                    .trim()
                    .replace(/[\/\\:*?"<>|\r\n\t]+/g, '_')
                    .replace(/\s+/g, '_')
                    .replace(/^_+|_+$/g, '')
                    .slice(0, 50);

                // 3. Construct filename: e.g. 01_MyCaption_1024x1024.png or 01_reference_1024x1024.png
                const dimStr = stats.width && stats.height ? `_${stats.width}x${stats.height}` : '';
                const captionPart = cleanCaption ? `_${cleanCaption}` : '_reference';
                const filename = `${numPrefix}${captionPart}${dimStr}.${stats.format}`;

                // 4. Fetch blob and add to ZIP
                const response = await fetch(fullImage!);
                const blob = await response.blob();
                zip.file(filename, blob);

                // 5. Accumulate metadata & captions
                metadataItems.push({
                    index: i + 1,
                    position,
                    id: ref.id,
                    filename,
                    caption: ref.caption || '',
                    width: stats.width,
                    height: stats.height,
                    aspectRatio: stats.aspectRatio,
                    format: stats.format,
                    sizeBytes: blob.size
                });

                captionsList.push(
                    `#${numPrefix} [${filename}]${stats.width ? ` (${stats.width}x${stats.height})` : ''}\n${ref.caption ? ref.caption : '(No caption)'}\n`
                );
            }

            // Export metadata.json
            const metadata = {
                exportDate: new Date().toISOString(),
                nodeTitle: nodeTitle || 'Note References',
                totalItems: validReferences.length,
                items: metadataItems
            };
            zip.file('metadata.json', JSON.stringify(metadata, null, 2));

            // Export captions.txt
            const captionsText = `=== Note References Captions ===\nExport Date: ${new Date().toLocaleString()}\nTotal Images: ${validReferences.length}\n\n` + captionsList.join('\n----------------------------------------\n\n');
            zip.file('captions.txt', captionsText);

            // Export summary.txt
            const summaryText = `Note References Archive Summary\n===============================\nTitle: ${nodeTitle || 'Note'}\nExport Date: ${new Date().toLocaleString()}\nTotal Exported Images: ${validReferences.length}\n\nFiles List:\n${metadataItems.map(m => `  ${m.position.toString().padStart(padLength, '0')}. ${m.filename} | ${m.width}x${m.height} (${m.aspectRatio}) | ${(m.sizeBytes ? (m.sizeBytes / 1024).toFixed(1) + ' KB' : '')}${m.caption ? ` | Caption: "${m.caption.slice(0, 60)}${m.caption.length > 60 ? '...' : ''}"` : ''}`).join('\n')}\n`;
            zip.file('summary.txt', summaryText);

            // Generate ZIP Blob
            const content = await zip.generateAsync({
                type: 'blob',
                compression: 'STORE'
            });

            const dateStr = new Date().toISOString().slice(0, 10);
            const cleanNodeTitle = (nodeTitle || 'Note_References')
                .replace(/[\/\\:*?"<>|\r\n\t]+/g, '_')
                .replace(/\s+/g, '_')
                .slice(0, 30);
            const zipFilename = `${cleanNodeTitle}_${validReferences.length}_refs_${dateStr}.zip`;

            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = zipFilename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            if (addToast) addToast(t('node.note.action.zipSuccess') || 'ZIP архив успешно скачан!', 'success');
        } catch (err: any) {
            console.error('Error generating Note references ZIP:', err);
            if (addToast) addToast(`Ошибка создания ZIP: ${err?.message || err}`, 'error');
        } finally {
            setIsDownloadingZip(false);
        }
    };

    const openImageViewer = (index: number) => {
        const ref = references[index];
        if (!ref || !ref.image) return;
        
        setImageViewer({
            sources: references.filter(r => r.image).map((r, i) => ({ 
                src: getFullSizeImage(i) || r.image!, 
                frameNumber: 0, 
                prompt: r.caption 
            })),
            initialIndex: index
        });
    };

    const isEmpty = references.length === 0;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            {!isMinimal && (
                <div className="flex justify-between items-center px-2 py-1 bg-gray-900/30 mb-1 rounded flex-shrink-0">
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('node.note.nestedImages')}</span>
                       <button onClick={handleRefreshState} className="p-0.5 rounded hover:bg-gray-700 text-gray-500 hover:text-white transition-colors" title="Reset/Refresh State">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                            </svg>
                       </button>
                       {isLocked && (
                            <div className="flex items-center text-cyan-400 text-xs gap-1 bg-cyan-900/30 px-1.5 py-0.5 rounded border border-cyan-700/50">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                <span className="font-semibold">Linked</span>
                                <button onClick={onDetach} className="ml-1 hover:text-white" title="Detach and Keep Data"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                            </div>
                       )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                        {!isEmpty && (
                            <ActionButton 
                                title={isDownloadingZip ? (t('node.note.action.downloadingZip') || 'Creating ZIP archive...') : (t('node.note.action.downloadZip') || 'Download all as ZIP archive')} 
                                onClick={handleDownloadAllZip}
                                disabled={isDownloadingZip}
                                className="hover:text-cyan-400 hover:border-cyan-500/50"
                            >
                                {isDownloadingZip ? (
                                    <svg className="animate-spin h-4 w-4 text-cyan-400" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                )}
                            </ActionButton>
                        )}
                        {!isLocked && !isEmpty && (
                             <div className="flex items-center space-x-1">
                                <ActionButton title={t('node.note.action.undoShuffle')} onClick={onUndoShuffle} disabled={!canUndoShuffle}>
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                </ActionButton>
                                <ActionButton title={t('node.note.action.shuffle')} onClick={onShuffle}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                </ActionButton>
                             </div>
                        )}
                    </div>
                </div>
            )}

            {/* Content */}
            <div 
                ref={containerRef}
                className={`flex-grow w-full overflow-y-auto custom-scrollbar rounded-md transition-colors ${isDragOverContainer ? 'bg-cyan-900/20 ring-2 ring-cyan-500 ring-inset' : 'bg-transparent'}`}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); if (!isLocked && isEmpty) setIsDragOverContainer(true); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOverContainer(false); setIsDragOverAdd(false); setInsertionIndex(null); }}
                onDrop={handleContainerDrop}
                onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
                onWheel={e => e.stopPropagation()}
            >
                 {isEmpty && !isLocked ? (
                     <div 
                        className="h-full flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:text-gray-400 transition-colors p-4 text-center"
                        onClick={() => fileInputRef.current?.click()}
                     >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <p className="text-sm font-medium">{t('node.note.dropPlaceholder')}</p>
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFilesFromInput} multiple accept="image/*" />
                     </div>
                 ) : isEmpty && isLocked ? (
                     <div className="h-full flex flex-col items-center justify-center text-gray-500 p-4 text-center">
                        <span className="text-sm italic">Waiting for prompt data...</span>
                    </div>
                 ) : (
                     <div style={{ height: gridLayout.totalHeight, position: 'relative', width: '100%' }}>
                         {visibleItems.map(({ index, top, left, isAddButton }) => {
                             if (isAddButton) {
                                 return (
                                    <div 
                                        key="add-button"
                                        className={`absolute bg-gray-800/50 rounded-md border-2 border-dashed flex flex-col gap-2 items-center justify-center cursor-pointer transition-colors ${isDragOverAdd ? 'border-cyan-500 text-cyan-500 bg-cyan-900/20' : 'border-gray-700 hover:border-cyan-500 hover:text-cyan-500 text-gray-500'}`}
                                        style={{ width: `${CARD_WIDTH}px`, height: `${CARD_HEIGHT}px`, top, left }}
                                        onClick={() => fileInputRef.current?.click()}
                                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOverAdd(true); }}
                                        onDrop={handleContainerDrop}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                        <span className="text-xs font-medium">Add Images</span>
                                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFilesFromInput} multiple accept="image/*" />
                                    </div>
                                 );
                             }

                             const ref = references[index];
                             if (!ref) return null;

                             return (
                                 <ReferenceItemCard
                                     key={ref.id}
                                     id={ref.id}
                                     index={index}
                                     image={ref.image}
                                     caption={ref.caption}
                                     manualOrderValue={manualOrderInputs[ref.id] ?? (index + 1).toString()}
                                     isLocked={isLocked}
                                     isDragging={draggingIndex === index}
                                     isSelected={selectedRefId === ref.id}
                                     top={top}
                                     left={left}
                                     width={CARD_WIDTH}
                                     height={CARD_HEIGHT}
                                     
                                     onSelect={setSelectedRefId}
                                     onDragStart={handleItemDragStart}
                                     onDragEnd={handleItemDragEnd}
                                     onDrop={handleItemDrop}
                                     onDragOver={(e, i) => { if (!isLocked) { e.preventDefault(); e.stopPropagation(); setInsertionIndex(i); } }}
                                     onManualOrderChange={(id, val) => setManualOrderInputs(prev => ({...prev, [id]: val}))}
                                     onManualOrderSubmit={handleManualReorder}
                                     onMove={(idx, dir) => {
                                         onReorder(idx, dir === 'up' ? idx - 1 : idx + 2);
                                     }}
                                     onMoveToStart={() => onReorder(index, 0)}
                                     onMoveToEnd={() => onReorder(index, references.length)}
                                     onRemove={onRemoveReference}
                                     onCaptionChange={onUpdateCaption}
                                     onViewImage={openImageViewer}
                                     onCopyImage={(img) => copyImage(getFullSizeImage(index) || img)}
                                     onImageDragStart={(e, img) => {
                                         const dragImg = getFullSizeImage(index) || img;
                                         if (dragImg) {
                                             setupImageDragData(e, dragImg, `${(ref.caption || 'Reference').slice(0, 30).replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.png`, ref.caption);
                                             e.stopPropagation();
                                         }
                                     }}
                                     deselectAllNodes={deselectAllNodes}
                                     isFirst={index === 0}
                                     isLast={index === references.length - 1}
                                     insertionIndex={insertionIndex}
                                     t={t}
                                 />
                             );
                         })}
                     </div>
                 )}
            </div>
        </div>
    );
};
