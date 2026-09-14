import React, { useEffect, useRef, useState } from 'react';
import { Point } from '../types';
import { useLanguage } from '../localization';

export interface DroppedImageItem {
    name: string;
    dataUrl: string;
    size?: number;
    prompt?: string;
}

export interface ImageDropMenuInfo {
    position: Point; // Screen coordinates { x, y }
    dropWorldPosition: Point; // Transformed canvas coordinates { x, y }
    images: DroppedImageItem[];
}

export type ImageDropTarget = 'image_input' | 'image_editor' | 'note';

interface ImageDropMenuProps {
    isOpen: boolean;
    info: ImageDropMenuInfo | null;
    onClose: () => void;
    onSelect: (target: ImageDropTarget, info: ImageDropMenuInfo) => void;
}

export const ImageDropMenu: React.FC<ImageDropMenuProps> = ({ isOpen, info, onClose, onSelect }) => {
    const { t } = useLanguage();
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuPos, setMenuPos] = useState<Point>({ x: 0, y: 0 });
    const [isVisible, setIsVisible] = useState(false);

    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const initialPosRef = useRef({ x: 0, y: 0 });

    const imagesCount = info?.images?.length || 0;
    const isSingle = imagesCount === 1;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onClose();
                return;
            }

            if (info) {
                const isI = e.code === 'KeyI' || e.key.toLowerCase() === 'i' || e.key === 'ш' || e.key === 'Ш';
                const isN = e.code === 'KeyN' || e.key.toLowerCase() === 'n' || e.key === 'т' || e.key === 'Т';
                const noModifiers = !e.ctrlKey && !e.altKey && !e.metaKey;

                // Hotkey 1 or 'I' (without shift) -> Image Input
                if (noModifiers && !e.shiftKey && (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1' || isI)) {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect('image_input', info);
                    return;
                }

                // Hotkey 2 or 'Shift + I' -> AI Image Editor
                if (noModifiers && ((!e.shiftKey && (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2')) || (e.shiftKey && isI))) {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect('image_editor', info);
                    return;
                }

                // Hotkey 3 or 'N' (without shift) -> Note
                if (noModifiers && !e.shiftKey && (e.key === '3' || e.code === 'Digit3' || e.code === 'Numpad3' || isN)) {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect('note', info);
                    return;
                }
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown, true);
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [isOpen, info, onClose, onSelect]);

    useEffect(() => {
        if (isOpen && info) {
            const width = menuRef.current?.offsetWidth || 340;
            const height = menuRef.current?.offsetHeight || 220;

            let left = info.position.x + 10;
            let top = info.position.y + 10;

            if (left + width > window.innerWidth - 12) {
                left = info.position.x - width - 10;
            }
            if (top + height > window.innerHeight - 12) {
                top = info.position.y - height - 10;
            }

            const clampedX = Math.max(12, Math.min(window.innerWidth - width - 12, left));
            const clampedY = Math.max(12, Math.min(window.innerHeight - height - 12, top));

            setMenuPos({ x: clampedX, y: clampedY });
            setIsVisible(true);
        } else if (!isOpen) {
            setIsVisible(false);
        }
    }, [isOpen, info]);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        isDraggingRef.current = true;
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        initialPosRef.current = { ...menuPos };

        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
            // ignore
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDraggingRef.current || !menuRef.current) return;
        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;

        const width = menuRef.current.offsetWidth || 340;
        const height = menuRef.current.offsetHeight || 220;

        const targetX = Math.max(8, Math.min(window.innerWidth - width - 8, initialPosRef.current.x + deltaX));
        const targetY = Math.max(8, Math.min(window.innerHeight - height - 8, initialPosRef.current.y + deltaY));

        menuRef.current.style.left = `${targetX}px`;
        menuRef.current.style.top = `${targetY}px`;
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;

        if (menuRef.current) {
            const deltaX = e.clientX - dragStartRef.current.x;
            const deltaY = e.clientY - dragStartRef.current.y;

            const width = menuRef.current.offsetWidth || 340;
            const height = menuRef.current.offsetHeight || 220;

            const targetX = Math.max(8, Math.min(window.innerWidth - width - 8, initialPosRef.current.x + deltaX));
            const targetY = Math.max(8, Math.min(window.innerHeight - height - 8, initialPosRef.current.y + deltaY));

            setMenuPos({ x: targetX, y: targetY });
        }

        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
            // ignore
        }
    };

    if (!isOpen || !info) return null;

    return (
        <div
            ref={menuRef}
            id="image-drop-menu"
            className={`fixed bg-gray-800/95 backdrop-blur-md rounded-xl shadow-2xl p-2 flex flex-col space-y-1.5 z-50 border border-gray-700/80 min-w-[310px] max-w-[380px] select-none ${
                isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            } transition-opacity duration-150`}
            style={{
                left: `${menuPos.x}px`,
                top: `${menuPos.y}px`
            }}
            onMouseDown={e => e.stopPropagation()}
        >
            {/* Header - Draggable & Unselectable */}
            <div
                className="px-2.5 py-1.5 border-b border-gray-700/60 mb-1 flex items-center justify-between cursor-move rounded-t-lg bg-gray-900/40 hover:bg-gray-900/70 transition-colors select-none group"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                title="Перетащите для перемещения / Drag to move"
            >
                <div className="flex items-center space-x-2 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400 group-hover:text-cyan-400 transition-colors" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-12a2 2 0 10-.001 4.001A2 2 0 0013 2zm0 6a2 2 0 10-.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10-.001 4.001A2 2 0 0013 14z" />
                    </svg>
                    <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
                    <span className="text-xs font-semibold text-gray-300 select-none">
                        {isSingle
                            ? (t('imageDropMenu.singleImage') || '1 image dropped')
                            : (t('imageDropMenu.countImages', { count: imagesCount }) || `${imagesCount} images dropped`)}
                    </span>
                </div>
                <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] text-gray-500 font-mono select-none">
                        ESC
                    </span>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        className="text-gray-400 hover:text-white p-0.5 rounded hover:bg-gray-700/60 transition-colors"
                        title="Закрыть (ESC)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Option 1: Image Input */}
            <button
                id="image-drop-option-input"
                onClick={() => onSelect('image_input', info)}
                className="flex items-center justify-between p-2.5 rounded-lg text-left w-full text-gray-200 hover:bg-gray-700/80 hover:text-white transition-all group border border-transparent hover:border-gray-600/60"
            >
                <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono font-bold text-gray-500 group-hover:text-cyan-400 w-4 text-center">1.</span>
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/25 group-hover:text-emerald-300 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 15l-5-5L5 21" />
                        </svg>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-100 group-hover:text-white">Image Input</span>
                        <span className="text-xs text-gray-400 group-hover:text-gray-300">
                            {isSingle
                                ? (t('imageDropMenu.imageInput.single') || 'Single mode')
                                : (t('imageDropMenu.imageInput.batch', { count: imagesCount }) || `Batch mode (${imagesCount} images)`)}
                        </span>
                    </div>
                </div>
                <span className="ml-3 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-700/80 group-hover:bg-cyan-600/30 text-gray-400 group-hover:text-cyan-300 border border-gray-600/50 group-hover:border-cyan-500/40 transition-colors">
                    I
                </span>
            </button>

            {/* Option 2: AI Image Editor */}
            <button
                id="image-drop-option-editor"
                onClick={() => onSelect('image_editor', info)}
                className="flex items-center justify-between p-2.5 rounded-lg text-left w-full text-gray-200 hover:bg-gray-700/80 hover:text-white transition-all group border border-transparent hover:border-gray-600/60"
            >
                <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono font-bold text-gray-500 group-hover:text-cyan-400 w-4 text-center">2.</span>
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/25 group-hover:text-purple-300 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                        </svg>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-100 group-hover:text-white">AI Image Editor</span>
                        <span className="text-xs text-gray-400 group-hover:text-gray-300">
                            {t('imageDropMenu.imageEditor', { count: imagesCount }) || `All to Input (${imagesCount})`}
                        </span>
                    </div>
                </div>
                <span className="ml-3 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-700/80 group-hover:bg-cyan-600/30 text-gray-400 group-hover:text-cyan-300 border border-gray-600/50 group-hover:border-cyan-500/40 transition-colors whitespace-nowrap">
                    Shift + I
                </span>
            </button>

            {/* Option 3: Note */}
            <button
                id="image-drop-option-note"
                onClick={() => onSelect('note', info)}
                className="flex items-center justify-between p-2.5 rounded-lg text-left w-full text-gray-200 hover:bg-gray-700/80 hover:text-white transition-all group border border-transparent hover:border-gray-600/60"
            >
                <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono font-bold text-gray-500 group-hover:text-cyan-400 w-4 text-center">3.</span>
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/25 group-hover:text-amber-300 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-100 group-hover:text-white">Note</span>
                        <span className="text-xs text-gray-400 group-hover:text-gray-300">
                            {t('imageDropMenu.note', { count: imagesCount }) || `References mode (${imagesCount})`}
                        </span>
                    </div>
                </div>
                <span className="ml-3 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-700/80 group-hover:bg-cyan-600/30 text-gray-400 group-hover:text-cyan-300 border border-gray-600/50 group-hover:border-cyan-500/40 transition-colors">
                    N
                </span>
            </button>
        </div>
    );
};

export default ImageDropMenu;
