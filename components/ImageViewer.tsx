


import React, { useState, useRef, useEffect } from 'react';
import type { Point } from '../types';
import { ActionButton } from './ActionButton';
import { useLanguage } from '../localization';
import { getNextFloatingZIndex } from '../utils/ui';
import { FullScreenIcon, ExitFullScreenIcon, CopyIcon } from './icons/AppIcons';

interface ImageViewerProps {
  sources: { src: string; frameNumber: number; prompt?: string }[];
  initialIndex: number;
  initialPosition: Point;
  onClose: () => void;
  onDownloadImageFromUrl: (imageUrl: string, frameNumber: number, prompt: string) => void;
  onCopyImageToClipboard: (imageUrl: string) => Promise<void>;
  onOpenInEditor?: (imageUrl: string) => void;
  addToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const LOCAL_STORAGE_POS_KEY = 'imageViewerPosition';
const LOCAL_STORAGE_SIZE_KEY = 'imageViewerSize';

const ImageViewer: React.FC<ImageViewerProps> = ({ sources, initialIndex, initialPosition, onClose, onDownloadImageFromUrl, onCopyImageToClipboard, onOpenInEditor, addToast }) => {
  const { t } = useLanguage();
  
  // Window State
  const [zIndex, setZIndex] = useState(getNextFloatingZIndex());
  const [isMaximized, setIsMaximized] = useState(false);

  const [position, setPosition] = useState(() => {
      try {
          const saved = localStorage.getItem(LOCAL_STORAGE_POS_KEY);
          if (saved) {
              const parsed = JSON.parse(saved);
              // Basic bounds check to ensure it's somewhat visible
              if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
                   // Allow off-screen restoration but ensure it's not completely lost
                   return parsed;
              }
          }
      } catch (e) { console.error("Failed to load ImageViewer position", e); }
      return initialPosition;
  });

  const [size, setSize] = useState<{ width: string | number; height: string | number }>(() => {
      try {
          const saved = localStorage.getItem(LOCAL_STORAGE_SIZE_KEY);
          if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed.width && parsed.height) {
                  return parsed;
              }
          }
      } catch (e) { console.error("Failed to load ImageViewer size", e); }
      return { width: '80vw', height: '80vh' };
  });
  
  const [isVisible, setIsVisible] = useState(false);

  // Keep a ref to the latest position for the closure
  const positionRef = useRef(position);
  useEffect(() => {
      positionRef.current = position;
  }, [position]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const dragInfo = useRef<{ offset: Point } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  
  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const imageDragStart = useRef<{ x: number, y: number } | null>(null);

  // Stats
  const [imgStats, setImgStats] = useState<{ width: number, height: number, size: string | null }>({ width: 0, height: 0, size: null });

  const currentSource = sources[currentIndex];

  const calculateFileSize = (src: string) => {
      if (src.startsWith('data:')) {
          const base64Length = src.length - (src.indexOf(',') + 1);
          const padding = (src.charAt(src.length - 1) === '=') ? (src.charAt(src.length - 2) === '=' ? 2 : 1) : 0;
          const sizeBytes = (base64Length * 0.75) - padding;
          return formatBytes(sizeBytes);
      }
      return null;
  };
  
  // Trigger fade-in on mount
  useEffect(() => {
      requestAnimationFrame(() => setIsVisible(true));
      handleFocusWindow(); // Bring to front
  }, []);

  // Load image stats and resize window when source changes
  useEffect(() => {
      if (!currentSource) return;
      const img = new Image();
      img.onload = () => {
          setImgStats({
              width: img.naturalWidth,
              height: img.naturalHeight,
              size: calculateFileSize(currentSource.src)
          });

          const hasSavedPos = localStorage.getItem(LOCAL_STORAGE_POS_KEY);
          const hasSavedSize = localStorage.getItem(LOCAL_STORAGE_SIZE_KEY);

          if (!hasSavedPos || !hasSavedSize) {
                const chromeHeight = 100;
                const chromeWidth = 20;
                
                const viewportW = window.innerWidth;
                const viewportH = window.innerHeight;
                
                const maxW = viewportW * 0.95;
                const maxH = viewportH * 0.95;
                
                let desiredW = img.naturalWidth + chromeWidth;
                let desiredH = img.naturalHeight + chromeHeight;
                
                if (desiredW > maxW || desiredH > maxH) {
                    const scale = Math.min(
                        (maxW - chromeWidth) / img.naturalWidth,
                        (maxH - chromeHeight) / img.naturalHeight
                    );
                    desiredW = img.naturalWidth * scale + chromeWidth;
                    desiredH = img.naturalHeight * scale + chromeHeight;
                }
                
                desiredW = Math.max(desiredW, 800);
                desiredH = Math.max(desiredH, 456);
                
                setSize({ width: desiredW, height: desiredH });
                setPosition({
                    x: (viewportW - desiredW) / 2,
                    y: (viewportH - desiredH) / 2
                });
          }

          if (containerRef.current) {
              const { width: cw, height: ch } = containerRef.current.getBoundingClientRect();
              const availableW = cw - 20;
              const availableH = ch - 20;
              
              if (availableW > 0 && availableH > 0) {
                  const scaleW = availableW / img.naturalWidth;
                  const scaleH = availableH / img.naturalHeight;
                  const fitScale = Math.min(scaleW, scaleH);
                  setZoom(Math.min(fitScale, 1)); 
              } else {
                  setZoom(1);
              }
          } else {
              setZoom(1);
          }
          
          setImageOffset({ x: 0, y: 0 });
      };
      img.src = currentSource.src;
  }, [currentSource]);

  const handleFocusWindow = () => {
      setZIndex(getNextFloatingZIndex());
  };

  const toggleMaximize = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsMaximized(!isMaximized);
  };

  const handlePrevious = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex(prev => {
        const newIndex = (prev > 0 ? prev - 1 : sources.length - 1);
        return newIndex;
    });
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex(prev => {
        const newIndex = (prev < sources.length - 1 ? prev + 1 : 0);
        return newIndex;
    });
  };
  
  const resetZoom = () => {
      setZoom(1); 
      setImageOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onClose, sources.length]);


  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    handleFocusWindow();
    e.preventDefault();
    e.stopPropagation();
    
    if (isMaximized) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    dragInfo.current = {
      offset: {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      },
    };
  };

  const handleHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragInfo.current) return;
    const newX = e.clientX - dragInfo.current.offset.x;
    const newY = e.clientY - dragInfo.current.offset.y;
    setPosition({ x: newX, y: newY });
  };

  const handleHeaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragInfo.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    localStorage.setItem(LOCAL_STORAGE_POS_KEY, JSON.stringify(positionRef.current));
  };

  const handleContainerMouseUp = () => {
      if (mainContainerRef.current && !isMaximized) {
          const rect = mainContainerRef.current.getBoundingClientRect();
          const newSize = { width: rect.width, height: rect.height };
          setSize(newSize);
          localStorage.setItem(LOCAL_STORAGE_SIZE_KEY, JSON.stringify(newSize));
      }
  };

  const handleWheel = (e: React.WheelEvent) => {
      e.stopPropagation();
      if (!containerRef.current) return;
      const zoomFactor = Math.pow(1.0005, -e.deltaY); 
      const newZoom = Math.max(0.1, Math.min(10, zoom * zoomFactor));

      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const mouseRelX = mouseX - rect.width / 2;
      const mouseRelY = mouseY - rect.height / 2;

      const scaleFactor = newZoom / zoom;
      const newOffsetX = mouseRelX - (mouseRelX - imageOffset.x) * scaleFactor;
      const newOffsetY = mouseRelY - (mouseRelY - imageOffset.y) * scaleFactor;

      setZoom(newZoom);
      setImageOffset({ x: newOffsetX, y: newOffsetY });
  };

  const isImageLargerThanContainer = () => {
      if (!containerRef.current || imgStats.width === 0) return false;
      const { width: cw, height: ch } = containerRef.current.getBoundingClientRect();
      const displayedW = imgStats.width * zoom;
      const displayedH = imgStats.height * zoom;
      return displayedW > cw || displayedH > ch;
  };

  const canDrag = zoom > 1 || isImageLargerThanContainer();

  const handleImageMouseDown = (e: React.MouseEvent) => {
      handleFocusWindow(); 
      if (canDrag || e.button === 1) { 
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingImage(true);
        imageDragStart.current = { x: e.clientX - imageOffset.x, y: e.clientY - imageOffset.y };
        
        window.addEventListener('mousemove', handleGlobalImageMouseMove);
        window.addEventListener('mouseup', handleGlobalImageMouseUp);
      }
  };
  
  const handleGlobalImageMouseMove = (e: MouseEvent) => {
      if (imageDragStart.current) {
          e.preventDefault();
          e.stopPropagation();
          setImageOffset({
              x: e.clientX - imageDragStart.current.x,
              y: e.clientY - imageDragStart.current.y
          });
      }
  };
  
  const handleGlobalImageMouseUp = () => {
      setIsDraggingImage(false);
      imageDragStart.current = null;
      window.removeEventListener('mousemove', handleGlobalImageMouseMove);
      window.removeEventListener('mouseup', handleGlobalImageMouseUp);
  };
  
  useEffect(() => {
      return () => {
          window.removeEventListener('mousemove', handleGlobalImageMouseMove);
          window.removeEventListener('mouseup', handleGlobalImageMouseUp);
      };
  }, []);

  if (!currentSource) {
      onClose();
      return null;
  }

  return (
    <div
      ref={mainContainerRef}
      className={`fixed bg-gray-800 rounded-lg shadow-2xl border-2 border-gray-700 flex flex-col z-[${zIndex}] group transition-opacity duration-300 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={isMaximized ? {
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        maxWidth: '100vw',
        maxHeight: '100vh',
        borderRadius: 0,
        border: 'none',
      } : {
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        maxWidth: '98vw',
        maxHeight: '98vh',
        minWidth: '800px',
        minHeight: '456px',
        resize: 'both',
        overflow: 'hidden',
      }}
      onMouseDown={(e) => { e.stopPropagation(); handleFocusWindow(); }}
      onMouseUp={handleContainerMouseUp}
    >
      <div
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
        className="bg-gray-700 text-white font-bold p-2 rounded-t-md flex justify-between items-center cursor-move flex-shrink-0"
      >
        <span>{t('imageViewer.title')} - Frame {currentSource.frameNumber}</span>
        <div className="flex items-center space-x-1">
            <ActionButton title="Copy Image" onClick={(e) => { e.stopPropagation(); onCopyImageToClipboard(currentSource.src); }}>
                <CopyIcon className="h-5 w-5" />
            </ActionButton>
            <ActionButton title="Download Image" onClick={(e) => { 
                e.stopPropagation(); 
                onDownloadImageFromUrl(currentSource.src, currentSource.frameNumber, currentSource.prompt || '');
                if (addToast) addToast(t('toast.downloadStarted'), 'success'); 
            }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </ActionButton>
            <div className="w-px h-4 bg-gray-500 mx-1"></div>
            <button 
                onClick={toggleMaximize} 
                className="p-1 text-gray-400 rounded-full hover:bg-gray-600 hover:text-white transition-colors"
                title={isMaximized ? "Restore" : "Full Screen"}
            >
                {isMaximized ? <ExitFullScreenIcon /> : <FullScreenIcon />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="p-1 text-gray-400 rounded-full hover:bg-gray-600 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
        </div>
      </div>
      <div 
        ref={containerRef}
        className="p-1 flex-grow min-h-0 bg-gray-900 relative overflow-hidden flex items-center justify-center"
        onWheel={handleWheel}
        onMouseDown={handleImageMouseDown}
      >
        <img
          src={currentSource.src}
          alt={`Full-size view of frame ${currentSource.frameNumber}`}
          className="shrink-0"
          style={{
             width: imgStats.width || 'auto',
             height: imgStats.height || 'auto',
             maxWidth: 'none',
             maxHeight: 'none',
             transform: `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${zoom})`,
             cursor: canDrag ? (isDraggingImage ? 'grabbing' : 'grab') : 'default',
             pointerEvents: 'auto',
             transformOrigin: 'center', 
          }}
          draggable={false}
          onMouseDown={(e) => e.preventDefault()}
        />

        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-gray-800/90 backdrop-blur-sm p-2 rounded-full flex items-center space-x-3 border border-gray-600 shadow-lg z-20" onMouseDown={e => e.stopPropagation()}>
            <button 
                onClick={resetZoom} 
                className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 text-xs font-bold text-white flex items-center justify-center border border-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                title="Reset to 100% (Actual Size)"
            >
                1:1
            </button>
            <input 
                type="range" 
                min="0.1" 
                max="5" 
                step="0.01" 
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))} 
                className="w-32 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <span className="text-xs font-mono text-gray-300 w-12 text-right">{Math.round(zoom * 100)}%</span>
         </div>

         {sources.length > 1 && (
            <>
                <button
                    onClick={handlePrevious}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/40 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-cyan-500 z-10"
                    aria-label="Previous image"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <button
                    onClick={handleNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/40 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-cyan-500 z-10"
                    aria-label="Next image"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </>
        )}
      </div>
      <div className="bg-gray-800 text-gray-400 text-xs px-3 py-1 border-t border-gray-700 flex justify-between items-center rounded-b-lg select-none">
          <div>
              {imgStats.width > 0 && <span>{imgStats.width} x {imgStats.height} px</span>}
          </div>
          {onOpenInEditor && (
             <button 
                 onClick={(e) => { e.stopPropagation(); onOpenInEditor(currentSource.src); }}
                 className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors font-semibold"
             >
                 {t('node.action.editor')}
             </button>
          )}
          <div>
              {imgStats.size && <span>{imgStats.size}</span>}
          </div>
      </div>
    </div>
  );
};

export default ImageViewer;
