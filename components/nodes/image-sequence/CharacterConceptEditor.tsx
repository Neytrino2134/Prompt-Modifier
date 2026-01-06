
import React, { useRef, useState } from 'react';
import { CharacterConcept } from '../../../types';
import { ActionButton } from '../../ActionButton';
import { DebouncedTextarea } from '../../DebouncedTextarea';
import { DebouncedInput } from '../../DebouncedInput';

interface CharacterConceptEditorProps {
    concept: { id: string; name: string; prompt: string; image: string | null; fullDescription?: string; isConnected: boolean };
    displayImage: string | null;
    fullResImage: string | null;
    isReadOnly: boolean;
    onUpdate: (updates: Partial<CharacterConcept>) => void;
    onDelete: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    isFirst: boolean;
    isLast: boolean;
    onDetach: () => void;
    onViewImage: (imageUrl: string) => void;
    t: (key: string) => string;
    hasError?: boolean;
}

const AspectRatioIcon: React.FC<{ width: number; height: number }> = ({ width, height }) => {
    const ratio = width / height;
    let iconPath = "";
    let title = "";

    if (ratio > 1.2) {
        iconPath = "M2 6h20v12H2z";
        title = "Landscape";
    } else if (ratio < 0.85) {
        iconPath = "M6 2h12v20H6z";
        title = "Portrait";
    } else {
        iconPath = "M4 4h16v16H4z";
        title = "Square";
    }

    return (
        <div className="bg-black/60 rounded-tl-md px-1.5 py-1 flex items-center justify-center" title={title}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white/90" viewBox="0 0 24 24" fill="currentColor">
                 <path d={iconPath} />
            </svg>
        </div>
    );
};

export const CharacterConceptEditor: React.FC<CharacterConceptEditorProps> = ({ concept, displayImage, fullResImage, isReadOnly, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast, onDetach, onViewImage, t, hasError }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number } | null>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if(ev.target?.result) {
                    onUpdate({ image: ev.target.result as string });
                }
            };
            reader.readAsDataURL(file);
        }
        // Reset file input
        if (e.target) e.target.value = '';
    };

    const handleDragEnter = (e: React.DragEvent) => {
        if (concept.isConnected) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        if (concept.isConnected) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };
    
    const handleDragOver = (e: React.DragEvent) => {
         if (concept.isConnected) return;
         e.preventDefault();
         e.stopPropagation();
         setIsDragOver(true);
    };

    const handleDrop = (e: React.DragEvent) => {
        if (concept.isConnected) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        // Internal drag
        const dragImageData = e.dataTransfer.getData('application/prompt-modifier-drag-image');
        if (dragImageData) {
            if (dragImageData.startsWith('data:')) {
                 onUpdate({ image: dragImageData });
            } else {
                 fetch(dragImageData)
                    .then(res => res.blob())
                    .then(blob => {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                             if (ev.target?.result) {
                                 onUpdate({ image: ev.target.result as string });
                             }
                        };
                        reader.readAsDataURL(blob);
                    });
            }
            return;
        }

        // File drop
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if(ev.target?.result) {
                    onUpdate({ image: ev.target.result as string });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleImageContainerClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const imageToView = fullResImage || displayImage;
        if (imageToView) {
            onViewImage(imageToView);
        } else if (!concept.isConnected) {
            fileInputRef.current?.click();
        }
    };
    
    const handleClearImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdate({ image: null });
        setImgDimensions(null);
    };

    const handleImageDragStart = (e: React.DragEvent) => {
         const imageToDrag = fullResImage || displayImage;
         if (imageToDrag) {
             e.dataTransfer.setData('application/prompt-modifier-drag-image', imageToDrag);
             e.dataTransfer.effectAllowed = 'copy';
             e.stopPropagation();
         }
    };

    return (
        <div className={`bg-gray-800 rounded-lg p-2 flex flex-col h-full border-2 ${hasError ? 'border-red-500' : 'border-gray-700'} w-full`}>
            <div className="flex justify-between items-center mb-2">
                {/* Apply error style to ID header if duplicate */}
                <span className={`text-xs font-bold ${hasError ? 'text-red-500 animate-pulse' : 'text-gray-400'} truncate`} title={concept.id}>{concept.id}</span>
                <div className="flex items-center space-x-1">
                    {concept.isConnected && (
                         <ActionButton title="Detach" tooltipPosition="left" onClick={(e) => { e.stopPropagation(); onDetach(); }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        </ActionButton>
                    )}
                    <div className="flex flex-col">
                         <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={isFirst} className="text-gray-500 hover:text-white disabled:opacity-30"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg></button>
                         <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={isLast} className="text-gray-500 hover:text-white disabled:opacity-30"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
                    </div>
                    {!concept.isConnected && (
                        <ActionButton title={t('node.action.delete')} tooltipPosition="left" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </ActionButton>
                    )}
                </div>
            </div>
            
            <div className="flex-grow flex flex-col space-y-2 min-h-0">
                 <div 
                    className={`aspect-square bg-gray-900 rounded flex items-center justify-center overflow-hidden relative group flex-shrink-0 cursor-pointer transition-all ${isDragOver ? 'ring-2 ring-cyan-400 bg-gray-800' : 'hover:ring-1 hover:ring-cyan-500'}`}
                    onClick={handleImageContainerClick}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    title={displayImage ? "Click to View" : "Click to Upload or Drop Image"}
                 >
                    {displayImage ? (
                        <>
                            <img 
                                src={displayImage} 
                                alt={concept.name} 
                                className="w-full h-full object-cover" 
                                draggable={true}
                                onDragStart={handleImageDragStart}
                                onLoad={(e) => setImgDimensions({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
                            />
                            {!concept.isConnected && (
                                <div className="absolute top-1 right-1">
                                     <ActionButton title={t('node.action.clear')} onClick={handleClearImage}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </ActionButton>
                                </div>
                            )}
                            {imgDimensions && (
                                <div className="absolute bottom-0 right-0 pointer-events-none z-10">
                                    <AspectRatioIcon width={imgDimensions.width} height={imgDimensions.height} />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-gray-600 text-xs text-center px-1 pointer-events-none">
                            {concept.isConnected ? "No Image" : "Drop or Click"}
                        </div>
                    )}
                    <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                 </div>
                 
                 <div className="space-y-1 flex-grow flex flex-col min-h-0">
                     <DebouncedInput
                        value={concept.name} 
                        onDebouncedChange={(val) => onUpdate({ name: val })}
                        className={`w-full bg-gray-900 text-xs text-white p-1 rounded border border-gray-700 focus:outline-none focus:border-cyan-500`}
                        placeholder="Name" 
                        readOnly={isReadOnly}
                     />
                     <DebouncedTextarea 
                        value={concept.prompt}
                        onDebouncedChange={(val) => onUpdate({ prompt: val })}
                        className="w-full flex-grow bg-gray-900 text-xs text-gray-300 p-1 rounded border border-gray-700 focus:outline-none focus:border-cyan-500 resize-none custom-scrollbar"
                        placeholder="Appearance prompt..."
                        readOnly={isReadOnly}
                     />
                 </div>
            </div>
        </div>
    );
};
