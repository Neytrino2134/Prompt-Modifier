
import React, { useState, useRef, useEffect, useCallback, useReducer } from 'react';
import ReactDOM from 'react-dom';
import { useLanguage } from '../localization';
import { Point } from '../types';
import { generateImage } from '../services/geminiService';
import { getNextFloatingZIndex } from '../utils/ui';

// Sub Components
import { EditorHeader } from './image-editor-modal/EditorHeader';
import { EditorSidebar } from './image-editor-modal/EditorSidebar';
import { EditorFloatingToolbar } from './image-editor-modal/EditorFloatingToolbar';
import { EditorFooter } from './image-editor-modal/EditorFooter';
import { PalettePanel } from './image-editor-modal/PalettePanel';

interface ImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (imageDataUrl: string) => void;
  imageSrc: string | null;
}

const LOCAL_STORAGE_POS_KEY = 'imageEditorModalPosition';
const LOCAL_STORAGE_SIZE_KEY = 'imageEditorModalSize';

type EditorTool = 'hand' | 'transform' | 'pencil' | 'rectangle' | 'zoom' | 'eyedropper';
type TransformHandle = 'tl' | 'tr' | 'bl' | 'br' | 'none';

const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ isOpen, onClose, onApply, imageSrc }) => {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editsCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const isInitialOpen = useRef(true);

  // --- State ---
  const [zIndex, setZIndex] = useState(getNextFloatingZIndex());
  const [isMaximized, setIsMaximized] = useState(false);

  const [viewState, setViewState] = useState({ zoom: 1, offset: { x: 0, y: 0 } });
  
  const [isVisible, setIsVisible] = useState(false);
  
  const [imageState, setImageState] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const [isFlipped, setIsFlipped] = useState(false);
  
  // Settings
  const [aspectRatio, setAspectRatio] = useState('free');
  const [resolution, setResolution] = useState('auto');
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [backgroundType, setBackgroundType] = useState<'checkerboard' | string>('checkerboard');
  const [isSnappingEnabled, setIsSnappingEnabled] = useState(true);
  const [isFreeAspect, setIsFreeAspect] = useState(false); 
  const [isProcessing, setIsProcessing] = useState(false); 
  const [modificationPrompt, setModificationPrompt] = useState('');

  // Tools
  const [activeTool, setActiveTool] = useState<EditorTool>('transform');
  const [drawColor, setDrawColor] = useState('#ff0000');
  const [brushSize, setBrushSize] = useState(5);

  // Interaction
  const [isInteracting, setIsInteracting] = useState(false);
  const [activeHandle, setActiveHandle] = useState<TransformHandle>('none');
  
  const interactionStartRef = useRef<{ 
      mouse: Point, 
      viewOffset: Point, 
      imgState: typeof imageState,
      startDist?: number,
      startAspectRatio?: number,
      startZoom?: number
  } | null>(null);
  
  const currentMouseImagePos = useRef<Point | null>(null);
  const drawStartImagePos = useRef<Point | null>(null);
  const hoverMousePos = useRef<Point | null>(null);

  // Modal Window
  const [position, setPosition] = useState<Point>(() => {
      try {
          const saved = localStorage.getItem(LOCAL_STORAGE_POS_KEY);
          if (saved) return JSON.parse(saved);
      } catch {}
      return { x: 0, y: 0 };
  });
  const [size, setSize] = useState<{ width: string | number; height: string | number }>(() => {
      try {
          const saved = localStorage.getItem(LOCAL_STORAGE_SIZE_KEY);
          if (saved) return JSON.parse(saved);
      } catch {}
      return { width: '90vw', height: '90vh' }; // Default wider for palette
  });
  
  const modalDragInfo = useRef<{ offset: Point } | null>(null);
  const positionRef = useRef(position);
  useEffect(() => { positionRef.current = position; }, [position]);

  const handleFocusWindow = () => {
      setZIndex(getNextFloatingZIndex());
  };

  const toggleMaximize = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsMaximized(!isMaximized);
  };

  // --- Handlers ---

  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    handleFocusWindow(); 
    e.preventDefault(); e.stopPropagation();
    
    if (isMaximized) return; 

    e.currentTarget.setPointerCapture(e.pointerId);
    modalDragInfo.current = { offset: { x: e.clientX - position.x, y: e.clientY - position.y } };
  };
  
  const handleHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!modalDragInfo.current) return;
    setPosition({ x: e.clientX - modalDragInfo.current.offset.x, y: e.clientY - modalDragInfo.current.offset.y });
  };
  
  const handleHeaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    modalDragInfo.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    localStorage.setItem(LOCAL_STORAGE_POS_KEY, JSON.stringify(positionRef.current));
  };

  const handleContainerMouseUp = () => {
      if (containerRef.current && !isMaximized) {
          const rect = containerRef.current.getBoundingClientRect();
          const newSize = { width: rect.width, height: rect.height };
          setSize(newSize);
          localStorage.setItem(LOCAL_STORAGE_SIZE_KEY, JSON.stringify(newSize));
      }
  };

  useEffect(() => {
    if (isOpen) {
      isInitialOpen.current = true;
      setIsFlipped(false);
      handleFocusWindow();
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeTool === 'rectangle') {
        setBrushSize(1);
    }
  }, [activeTool]);

  useEffect(() => {
    if (isOpen && imageSrc) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            imageRef.current = img;
            const offCanvas = document.createElement('canvas');
            offCanvas.width = img.width;
            offCanvas.height = img.height;
            editsCanvasRef.current = offCanvas;

            setImageState({ x: 0, y: 0, width: img.width, height: img.height });
            
            if (!localStorage.getItem(LOCAL_STORAGE_POS_KEY)) {
                 setPosition({ x: (window.innerWidth - 1200)/2, y: (window.innerHeight - 800)/2 });
                 setSize({ width: 1200, height: 800 });
            }
        };
        img.src = imageSrc;
    } else {
        imageRef.current = null;
        editsCanvasRef.current = null;
    }
  }, [isOpen, imageSrc]);

  useEffect(() => {
    let newW = 1024;
    let newH = 1024;

    if (resolution !== 'auto') {
        const parts = resolution.split('x').map(Number);
        if (parts.length === 2) { newW = parts[0]; newH = parts[1]; }
    } else if (imageRef.current) {
        const img = imageRef.current;
        if (aspectRatio !== 'free') {
             const [rw, rh] = aspectRatio.split(':').map(Number);
             if (rw && rh) {
                 const targetRatio = rw / rh;
                 const imgRatio = img.width / img.height;
                 if (imgRatio > targetRatio) { newW = img.width; newH = img.width / targetRatio; }
                 else { newH = img.height; newW = img.height * targetRatio; }
             } else { newW = img.width; newH = img.height; }
        } else { newW = img.width; newH = img.height; }
    }
    
    newW = Math.round(newW);
    newH = Math.round(newH);

    setCanvasSize({ width: newW, height: newH });
    
    if(isOpen) {
        if (isInitialOpen.current) {
            setViewState(prev => ({ ...prev, zoom: 0.4, offset: { x: 0, y: 0 } }));
            isInitialOpen.current = false;
        } else {
            if (imageRef.current) {
                const imgW = imageRef.current.width;
                const imgH = imageRef.current.height;
                const ratio = Math.min(newW / imgW, newH / imgH);
                setImageState({ x: 0, y: 0, width: imgW * ratio, height: imgH * ratio });
            }
        }
    }

  }, [aspectRatio, resolution, isOpen, imageRef.current]); 

  // Coordinate Helpers
  const screenToWorld = (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const domX = clientX - rect.left;
      const domY = clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const wx = (domX - cx - viewState.offset.x) / viewState.zoom;
      const wy = (domY - cy - viewState.offset.y) / viewState.zoom;
      return { x: wx, y: wy };
  };

  const getMouseInImage = (e: React.MouseEvent | MouseEvent) => {
      const w = screenToWorld(e.clientX, e.clientY);
      const lx = w.x - imageState.x;
      const ly = w.y - imageState.y;
      const img = imageRef.current;
      if (!img) return { x: 0, y: 0 };
      const uncenterX = lx + imageState.width / 2;
      const uncenterY = ly + imageState.height / 2;
      const scaleX = imageState.width / img.width;
      const scaleY = imageState.height / img.height;
      return { x: uncenterX / scaleX, y: uncenterY / scaleY };
  };
  
  // Helper for eyedropper color extraction
  const pickColorAt = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const px = Math.floor(x * scaleX);
        const py = Math.floor(y * scaleY);
        
        const pixel = ctx.getImageData(px, py, 1, 1).data;
        const hex = "#" + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);
        setDrawColor(hex);
  };

  const createCheckerboardPattern = (ctx: CanvasRenderingContext2D) => {
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 20;
    patternCanvas.height = 20;
    const pCtx = patternCanvas.getContext('2d');
    if(pCtx) {
        pCtx.fillStyle = '#ccc';
        pCtx.fillRect(0,0,10,10);
        pCtx.fillRect(10,10,10,10);
        pCtx.fillStyle = '#fff';
        pCtx.fillRect(10,0,10,10);
        pCtx.fillRect(0,10,10,10);
    }
    return ctx.createPattern(patternCanvas, 'repeat');
  };

  const draw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect && (canvas.width !== rect.width || canvas.height !== rect.height)) {
          canvas.width = rect.width;
          canvas.height = rect.height;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      
      ctx.fillStyle = '#374151'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.save();
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      ctx.translate(cx + viewState.offset.x, cy + viewState.offset.y);
      ctx.scale(viewState.zoom, viewState.zoom);
      
      const boardW = canvasSize.width;
      const boardH = canvasSize.height;
      
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 10;
      ctx.fillStyle = '#000'; 
      ctx.fillRect(-boardW/2, -boardH/2, boardW, boardH);
      ctx.shadowColor = 'transparent';
      
      if (backgroundType === 'checkerboard') {
          const pattern = createCheckerboardPattern(ctx);
          if (pattern) ctx.fillStyle = pattern;
          else ctx.fillStyle = '#fff';
      } else {
          ctx.fillStyle = backgroundType;
      }
      ctx.fillRect(-boardW/2, -boardH/2, boardW, boardH);

      ctx.beginPath();
      ctx.rect(-boardW/2, -boardH/2, boardW, boardH);
      ctx.clip();

      if (imageRef.current) {
          const img = imageRef.current;
          ctx.save();
          ctx.translate(imageState.x, imageState.y);
          const drawW = imageState.width;
          const drawH = imageState.height;
          if (isFlipped) ctx.scale(-1, 1);
          ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
          if (editsCanvasRef.current) {
              ctx.drawImage(editsCanvasRef.current, -drawW / 2, -drawH / 2, drawW, drawH);
          }
          
          if (isInteracting && activeTool === 'rectangle' && drawStartImagePos.current && currentMouseImagePos.current) {
               const start = drawStartImagePos.current;
               const curr = currentMouseImagePos.current;
               const scaleX = drawW / img.width;
               const scaleY = drawH / img.height;
               const sx = (start.x * scaleX) - drawW / 2;
               const sy = (start.y * scaleY) - drawH / 2;
               const w = (curr.x - start.x) * scaleX;
               const h = (curr.y - start.y) * scaleY;
               
               ctx.strokeStyle = drawColor;
               ctx.lineWidth = brushSize / ((scaleX + scaleY)/2); 
               ctx.strokeRect(sx, sy, w, h);
          }
          
          // Draw brush cursor
          if (activeTool === 'pencil' && hoverMousePos.current) {
               const scaleX = drawW / img.width;
               const scaleY = drawH / img.height;
               const scaleAvg = (scaleX + scaleY) / 2;
               
               const cursorX = (hoverMousePos.current.x * scaleX) - drawW / 2;
               const cursorY = (hoverMousePos.current.y * scaleY) - drawH / 2;
               const radius = (brushSize / 2) * scaleAvg;

               ctx.beginPath();
               ctx.arc(cursorX, cursorY, radius, 0, Math.PI * 2);
               ctx.strokeStyle = drawColor;
               ctx.lineWidth = 1 / viewState.zoom;
               ctx.stroke();
               
               ctx.beginPath();
               ctx.arc(cursorX, cursorY, Math.max(0, radius - (1/viewState.zoom)), 0, Math.PI * 2);
               ctx.strokeStyle = 'rgba(255,255,255,0.5)';
               ctx.lineWidth = 1 / viewState.zoom;
               ctx.stroke();
          }

          ctx.restore();
      }
      
      ctx.restore(); 
      
      ctx.save();
      ctx.translate(cx + viewState.offset.x, cy + viewState.offset.y);
      ctx.scale(viewState.zoom, viewState.zoom);

      if (imageRef.current && activeTool === 'transform') {
          const drawW = imageState.width;
          const drawH = imageState.height;

          ctx.save();
          ctx.translate(imageState.x, imageState.y);
          ctx.strokeStyle = '#22d3ee'; 
          ctx.lineWidth = 2 / viewState.zoom; 
          ctx.strokeRect(-drawW/2, -drawH/2, drawW, drawH);

          const handleSize = 8 / viewState.zoom;
          ctx.fillStyle = '#22d3ee';
          const corners = [
              { x: -drawW/2, y: -drawH/2 },
              { x: drawW/2, y: -drawH/2 },
              { x: -drawW/2, y: drawH/2 },
              { x: drawW/2, y: drawH/2 }
          ];
          corners.forEach(c => {
              ctx.fillRect(c.x - handleSize/2, c.y - handleSize/2, handleSize, handleSize);
          });
          ctx.restore();
      }
      ctx.restore();
      
      // Magnifier for Eyedropper
      if (activeTool === 'eyedropper' && hoverMousePos.current) {
           // Not implemented: Drawing a magnifier loupe is complex on same canvas
           // Cursor change handled in mousemove
      }

  }, [viewState, imageState, canvasSize, backgroundType, isFlipped, activeTool, isInteracting, drawColor, brushSize]);

  useEffect(() => {
      if (isOpen) {
          let frameId = requestAnimationFrame(draw);
          const loop = () => {
              draw();
              frameId = requestAnimationFrame(loop);
          };
          loop();
          return () => cancelAnimationFrame(frameId);
      }
  }, [isOpen, draw]);

  const getHitHandle = (wx: number, wy: number): TransformHandle => {
      if (!imageRef.current) return 'none';
      const w = imageState.width;
      const h = imageState.height;
      const cx = imageState.x;
      const cy = imageState.y;

      const handleSize = 10 / viewState.zoom; 
      const check = (x: number, y: number) => Math.abs(wx - x) < handleSize && Math.abs(wy - y) < handleSize;

      if (check(cx - w/2, cy - h/2)) return 'tl';
      if (check(cx + w/2, cy - h/2)) return 'tr';
      if (check(cx - w/2, cy + h/2)) return 'bl';
      if (check(cx + w/2, cy + h/2)) return 'br';
      return 'none';
  };
  
  const isPointInImage = (wx: number, wy: number) => {
      if (!imageRef.current) return false;
      const w = imageState.width;
      const h = imageState.height;
      const cx = imageState.x;
      const cy = imageState.y;
      return wx >= cx - w/2 && wx <= cx + w/2 && wy >= cy - h/2 && wy <= cy + h/2;
  };

  const handleZoomAtPoint = (clientX: number, clientY: number, newZoom: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clampedZoom = Math.max(0.1, Math.min(newZoom, 5));
      const domX = clientX - rect.left;
      const domY = clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const mouseX = domX - cx;
      const mouseY = domY - cy;
      const oldOx = viewState.offset.x;
      const oldOy = viewState.offset.y;
      const scaleFactor = clampedZoom / viewState.zoom;
      const newOx = mouseX - (mouseX - oldOx) * scaleFactor;
      const newOy = mouseY - (mouseY - oldOy) * scaleFactor;
      setViewState({ zoom: clampedZoom, offset: { x: newOx, y: newOy } });
  };
  
  const handleSliderZoom = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newZoom = Number(e.target.value);
      const scaleFactor = newZoom / viewState.zoom;
      setViewState({
          zoom: newZoom,
          offset: {
              x: viewState.offset.x * scaleFactor,
              y: viewState.offset.y * scaleFactor
          }
      });
  };

  const snap = (val: number, target: number, threshold: number): number => {
    return Math.abs(val - target) < threshold ? target : val;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
      handleFocusWindow(); 
      e.preventDefault();
      
      if (activeTool === 'eyedropper') {
          pickColorAt(e);
          return;
      }
      
      if (activeTool === 'zoom') {
          interactionStartRef.current = {
              mouse: { x: e.clientX, y: e.clientY },
              viewOffset: { ...viewState.offset },
              imgState: { ...imageState },
              startZoom: viewState.zoom
          };
          setIsInteracting(true);
          return;
      }

      const w = screenToWorld(e.clientX, e.clientY);
      
      if (activeTool === 'transform') {
          const handle = getHitHandle(w.x, w.y);
          if (handle !== 'none') {
              setActiveHandle(handle);
              setIsInteracting(true);
              interactionStartRef.current = {
                  mouse: { x: e.clientX, y: e.clientY },
                  viewOffset: { ...viewState.offset },
                  imgState: { ...imageState },
                  startDist: Math.hypot(w.x - imageState.x, w.y - imageState.y),
                  startAspectRatio: imageState.width / imageState.height
              };
              return;
          } else if (isPointInImage(w.x, w.y)) {
              setActiveHandle('none'); 
          } else {
              return; 
          }
      }

      setIsInteracting(true);
      interactionStartRef.current = {
          mouse: { x: e.clientX, y: e.clientY },
          viewOffset: { ...viewState.offset },
          imgState: { ...imageState }
      };

      if (activeTool === 'pencil' || activeTool === 'rectangle') {
          const imgPos = getMouseInImage(e);
          drawStartImagePos.current = imgPos;
          currentMouseImagePos.current = imgPos;
          
          if (activeTool === 'pencil' && editsCanvasRef.current) {
              const ctx = editsCanvasRef.current.getContext('2d');
              if (ctx) {
                  ctx.beginPath();
                  ctx.moveTo(imgPos.x, imgPos.y);
                  ctx.lineCap = 'round';
                  ctx.lineJoin = 'round';
                  ctx.strokeStyle = drawColor;
                  ctx.lineWidth = brushSize;
                  ctx.stroke();
              }
          }
      }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      const w = screenToWorld(e.clientX, e.clientY);
      
      // Update hover position for brush cursor
      const imgPos = getMouseInImage(e);
      hoverMousePos.current = imgPos;
      
      if (!isInteracting) {
           if (activeTool === 'transform') {
               const handle = getHitHandle(w.x, w.y);
               if (handle !== 'none') document.body.style.cursor = 'nwse-resize';
               else if (isPointInImage(w.x, w.y)) document.body.style.cursor = 'move';
               else document.body.style.cursor = 'default';
           } else if (activeTool === 'hand') {
               document.body.style.cursor = 'grab';
           } else if (activeTool === 'zoom') {
               document.body.style.cursor = 'ew-resize';
           } else if (activeTool === 'eyedropper') {
                // Should change to eyedropper cursor, usually handled via CSS but we can force it
                // We use inline style for simplicity in this dynamic context
                document.body.style.cursor = 'crosshair'; 
           } else {
               document.body.style.cursor = 'crosshair';
           }
           return;
      }

      const start = interactionStartRef.current;
      if (!start) return;

      const dx = e.clientX - start.mouse.x;
      const dy = e.clientY - start.mouse.y;

      if (activeTool === 'hand') {
          setViewState(prev => ({
              ...prev,
              offset: {
                  x: start.viewOffset.x + dx,
                  y: start.viewOffset.y + dy
              }
          }));
          document.body.style.cursor = 'grabbing';
      } else if (activeTool === 'zoom') {
          const sensitivity = 200;
          const zoomFactor = Math.pow(2, dx / sensitivity); 
          const newZoom = Math.max(0.1, Math.min(10, (start.startZoom || 1) * zoomFactor));
          setViewState(prev => ({ ...prev, zoom: newZoom }));
      } else if (activeTool === 'transform') {
          if (activeHandle !== 'none') {
              const mouseW = screenToWorld(e.clientX, e.clientY);
              const origHalfW = start.imgState.width / 2;
              const origHalfH = start.imgState.height / 2;
              const origLeft = start.imgState.x - origHalfW;
              const origRight = start.imgState.x + origHalfW;
              const origTop = start.imgState.y - origHalfH;
              const origBottom = start.imgState.y + origHalfH;
              
              let newLeft = origLeft;
              let newRight = origRight;
              let newTop = origTop;
              let newBottom = origBottom;

              if (activeHandle === 'tl') { newLeft = mouseW.x; newTop = mouseW.y; }
              if (activeHandle === 'tr') { newRight = mouseW.x; newTop = mouseW.y; }
              if (activeHandle === 'bl') { newLeft = mouseW.x; newBottom = mouseW.y; }
              if (activeHandle === 'br') { newRight = mouseW.x; newBottom = mouseW.y; }

              if (isSnappingEnabled) {
                  const SNAP_DIST = 10 / viewState.zoom;
                  const canvHalfW = canvasSize.width / 2;
                  const canvHalfH = canvasSize.height / 2;
                  if (activeHandle.includes('l')) {
                      newLeft = snap(newLeft, -canvHalfW, SNAP_DIST);
                      newLeft = snap(newLeft, 0, SNAP_DIST);
                      newLeft = snap(newLeft, canvHalfW, SNAP_DIST);
                  }
                  if (activeHandle.includes('r')) {
                      newRight = snap(newRight, canvHalfW, SNAP_DIST);
                      newRight = snap(newRight, 0, SNAP_DIST);
                      newRight = snap(newRight, -canvHalfW, SNAP_DIST);
                  }
                  if (activeHandle.includes('t')) {
                      newTop = snap(newTop, -canvHalfH, SNAP_DIST);
                      newTop = snap(newTop, 0, SNAP_DIST);
                      newTop = snap(newTop, canvHalfH, SNAP_DIST);
                  }
                  if (activeHandle.includes('b')) {
                      newBottom = snap(newBottom, canvHalfH, SNAP_DIST);
                      newBottom = snap(newBottom, 0, SNAP_DIST);
                      newBottom = snap(newBottom, -canvHalfH, SNAP_DIST);
                  }
              }

              let newW = Math.abs(newRight - newLeft);
              let newH = Math.abs(newBottom - newTop);

              if (!isFreeAspect && start.startAspectRatio) {
                  const ratio = start.startAspectRatio;
                  if (newW / ratio > newH) newH = newW / ratio;
                  else newW = newH * ratio;

                  if (activeHandle === 'tl') { newLeft = newRight - newW; newTop = newBottom - newH; } 
                  if (activeHandle === 'tr') { newRight = newLeft + newW; newTop = newBottom - newH; } 
                  if (activeHandle === 'bl') { newLeft = newRight - newW; newBottom = newTop + newH; } 
                  if (activeHandle === 'br') { newRight = newLeft + newW; newBottom = newTop + newH; } 
              }

              const newX = (newLeft + newRight) / 2;
              const newY = (newTop + newBottom) / 2;
              
              setImageState({ x: newX, y: newY, width: newW, height: newH });

          } else {
              const vx = dx / viewState.zoom;
              const vy = dy / viewState.zoom;
              let newX = start.imgState.x + vx;
              let newY = start.imgState.y + vy;
              
              if (isSnappingEnabled) {
                  const SNAP_DIST = 10 / viewState.zoom;
                  const imgHalfW = start.imgState.width / 2;
                  const imgHalfH = start.imgState.height / 2;
                  const canvHalfW = canvasSize.width / 2;
                  const canvHalfH = canvasSize.height / 2;
                  
                  const leftEdge = newX - imgHalfW;
                  const rightEdge = newX + imgHalfW;
                  const topEdge = newY - imgHalfH;
                  const bottomEdge = newY + imgHalfH;

                  if (Math.abs(leftEdge - (-canvHalfW)) < SNAP_DIST) newX = -canvHalfW + imgHalfW;
                  else if (Math.abs(rightEdge - canvHalfW) < SNAP_DIST) newX = canvHalfW - imgHalfW;
                  else if (Math.abs(leftEdge - 0) < SNAP_DIST) newX = 0 + imgHalfW; 
                  else if (Math.abs(rightEdge - 0) < SNAP_DIST) newX = 0 - imgHalfW; 
                  else if (Math.abs(newX - 0) < SNAP_DIST) newX = 0; 

                  if (Math.abs(topEdge - (-canvHalfH)) < SNAP_DIST) newY = -canvHalfH + imgHalfH;
                  else if (Math.abs(bottomEdge - canvHalfH) < SNAP_DIST) newY = canvHalfH - imgHalfH;
                  else if (Math.abs(topEdge - 0) < SNAP_DIST) newY = 0 + imgHalfH; 
                  else if (Math.abs(bottomEdge - 0) < SNAP_DIST) newY = 0 - imgHalfH;
                  else if (Math.abs(newY - 0) < SNAP_DIST) newY = 0;
              }
              setImageState(prev => ({ ...prev, x: newX, y: newY }));
          }
      } else if (activeTool === 'pencil') {
          // const imgPos = getMouseInImage(e); // Already calculated above
          if (editsCanvasRef.current) {
              const ctx = editsCanvasRef.current.getContext('2d');
              if (ctx) {
                  ctx.lineTo(imgPos.x, imgPos.y);
                  ctx.stroke();
              }
          }
      } else if (activeTool === 'rectangle') {
           // const imgPos = getMouseInImage(e); // Already calculated above
           currentMouseImagePos.current = imgPos;
      }
  };

  const handleCanvasMouseUp = () => {
      setIsInteracting(false);
      setActiveHandle('none');
      interactionStartRef.current = null;
      
      if (activeTool === 'rectangle' && drawStartImagePos.current && currentMouseImagePos.current && editsCanvasRef.current) {
           const ctx = editsCanvasRef.current.getContext('2d');
           if (ctx) {
               const s = drawStartImagePos.current;
               const c = currentMouseImagePos.current;
               const w = c.x - s.x;
               const h = c.y - s.y;
               ctx.strokeStyle = drawColor;
               ctx.lineWidth = brushSize;
               ctx.strokeRect(s.x, s.y, w, h);
           }
      }
      drawStartImagePos.current = null;
      currentMouseImagePos.current = null;
  };
  
  const handleCanvasMouseLeave = () => {
      hoverMousePos.current = null;
      handleCanvasMouseUp();
  };

  const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault(); e.stopPropagation();
      const zoomFactor = Math.pow(1.001, -e.deltaY); 
      const newZoom = Math.max(0.1, Math.min(5, viewState.zoom * zoomFactor));
      handleZoomAtPoint(e.clientX, e.clientY, newZoom);
  };

  const handleFitImageToCanvas = () => {
      if (!imageRef.current) return;
      const imgW = imageRef.current.width;
      const imgH = imageRef.current.height;
      const canvasW = canvasSize.width;
      const canvasH = canvasSize.height;
      const ratio = Math.min(canvasW / imgW, canvasH / imgH);
      setImageState({ x: 0, y: 0, width: imgW * ratio, height: imgH * ratio });
  };

  const handleFillImageToCanvas = () => {
      if (!imageRef.current) return;
      const imgW = imageRef.current.width;
      const imgH = imageRef.current.height;
      const canvasW = canvasSize.width;
      const canvasH = canvasSize.height;
      const ratio = Math.max(canvasW / imgW, canvasH / imgH);
      setImageState({ x: 0, y: 0, width: imgW * ratio, height: imgH * ratio });
  };

  const handleReset = () => {
       setImageState({ x: 0, y: 0, width: imageRef.current?.width || 0, height: imageRef.current?.height || 0 });
       setIsFlipped(false);
       setAspectRatio('free');
       setResolution('auto');
       if (editsCanvasRef.current) {
           const ctx = editsCanvasRef.current.getContext('2d');
           if (ctx) ctx.clearRect(0, 0, editsCanvasRef.current.width, editsCanvasRef.current.height);
       }
  };
  
  const handleRemoveObject = async () => {
      if (!imageRef.current || isProcessing) return;
      setIsProcessing(true);
      try {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = imageRef.current.width;
          tempCanvas.height = imageRef.current.height;
          const ctx = tempCanvas.getContext('2d');
          if (!ctx) throw new Error("Could not get context");
          ctx.drawImage(imageRef.current, 0, 0);
          if (editsCanvasRef.current) {
              ctx.drawImage(editsCanvasRef.current, 0, 0);
          }
          const mergedDataUrl = tempCanvas.toDataURL('image/png');
          const base64ImageData = mergedDataUrl.split(',')[1];
          const mimeType = 'image/png';
          
          const prompt = "Modify the image based on the colored markings: 1. REMOVE objects covered in RED. 2. STRICTLY PRESERVE and do NOT change objects covered in GREEN. Fill the removed red areas naturally to match the surroundings.";

          const newImageUrl = await generateImage(prompt, '1:1', [{ base64ImageData, mimeType }], 'gemini-3-flash-preview');
          
          const newImg = new Image();
          newImg.onload = () => {
              imageRef.current = newImg;
              if (editsCanvasRef.current) {
                   const eCtx = editsCanvasRef.current.getContext('2d');
                   eCtx?.clearRect(0, 0, editsCanvasRef.current.width, editsCanvasRef.current.height);
              }
              setIsProcessing(false);
          };
          newImg.src = newImageUrl;

      } catch (error) {
          console.error("Error removing object:", error);
          setIsProcessing(false);
          alert("Failed to remove object. Please check console.");
      }
  };

  const handleRemoveBackground = async () => {
        if (!imageRef.current || isProcessing) return;
        setIsProcessing(true);
        try {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = imageRef.current.width;
            tempCanvas.height = imageRef.current.height;
            const ctx = tempCanvas.getContext('2d');
            if (!ctx) throw new Error("Could not get context");
            ctx.drawImage(imageRef.current, 0, 0);
            
            const mergedDataUrl = tempCanvas.toDataURL('image/png');
            const base64ImageData = mergedDataUrl.split(',')[1];
            const mimeType = 'image/png';
            
            const prompt = "Replace the background with solid pure black color (#000000). Keep the main subject exactly identical.";

            const newImageUrl = await generateImage(prompt, '1:1', [{ base64ImageData, mimeType }], 'gemini-3-flash-preview');
            
            const newImg = new Image();
            newImg.crossOrigin = "anonymous";
            newImg.onload = () => {
                 // Background removal logic (simulated by flood fill transparent logic if API returns black bg)
                 // This mirrors previous implementation logic in EditorSidebar but now called from here or passed down
                 // For now, let's just set the image as the result
                 imageRef.current = newImg;
                 setIsProcessing(false);
            };
            newImg.src = newImageUrl;
        } catch (error) {
            setIsProcessing(false);
        }
  };

  const handleRequestModification = async () => {
        if (!imageRef.current || isProcessing || !modificationPrompt.trim()) return;
        setIsProcessing(true);
        try {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = imageRef.current.width;
            tempCanvas.height = imageRef.current.height;
            const ctx = tempCanvas.getContext('2d');
            if (!ctx) throw new Error("Could not get context");
            ctx.drawImage(imageRef.current, 0, 0);
            if (editsCanvasRef.current) {
                ctx.drawImage(editsCanvasRef.current, 0, 0);
            }
            const mergedDataUrl = tempCanvas.toDataURL('image/png');
            const base64ImageData = mergedDataUrl.split(',')[1];
            const mimeType = 'image/png';
            
            const newImageUrl = await generateImage(modificationPrompt, '1:1', [{ base64ImageData, mimeType }], 'gemini-3-flash-preview');
            
            const newImg = new Image();
            newImg.onload = () => {
                imageRef.current = newImg;
                if (editsCanvasRef.current) {
                     const eCtx = editsCanvasRef.current.getContext('2d');
                     eCtx?.clearRect(0, 0, editsCanvasRef.current.width, editsCanvasRef.current.height);
                }
                setIsProcessing(false);
            };
            newImg.src = newImageUrl;
  
        } catch (error) {
            console.error("Error requesting modification:", error);
            setIsProcessing(false);
            alert("Failed to request changes. Please check console.");
        }
  };

  const handleApply = () => {
      if (!canvasRef.current || !imageRef.current) return;
      const width = canvasSize.width;
      const height = canvasSize.height;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;
      
      if (backgroundType !== 'checkerboard') {
          ctx.fillStyle = backgroundType;
          ctx.fillRect(0, 0, width, height);
      }
      
      const cx = width / 2;
      const cy = height / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.translate(imageState.x, imageState.y);
      const drawW = imageState.width;
      const drawH = imageState.height;
      if (isFlipped) ctx.scale(-1, 1);
      const img = imageRef.current;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      if (editsCanvasRef.current) {
          ctx.drawImage(editsCanvasRef.current, -drawW / 2, -drawH / 2, drawW, drawH);
      }
      ctx.restore();
      const dataUrl = tempCanvas.toDataURL('image/png');
      onApply(dataUrl);
      onClose();
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className={`fixed inset-0 z-[${zIndex}] pointer-events-none transition-opacity duration-300 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div 
        ref={containerRef}
        className="absolute bg-gray-800 rounded-lg shadow-2xl border-2 border-gray-700 flex flex-col pointer-events-auto overflow-hidden"
        onMouseDown={handleFocusWindow}
        style={isMaximized ? {
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
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
            minHeight: '600px',
            resize: 'both',
        }}
        onMouseUp={handleContainerMouseUp}
      >
        <EditorHeader 
            onClose={onClose} 
            onPointerDown={handleHeaderPointerDown} 
            onPointerMove={handleHeaderPointerMove} 
            onPointerUp={handleHeaderPointerUp}
        />

        <div className="flex-grow min-h-0 flex">
            {/* Left Sidebar (Settings) */}
            <EditorSidebar 
                resolution={resolution} setResolution={setResolution}
                aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
                backgroundType={backgroundType} setBackgroundType={setBackgroundType}
                activeTool={activeTool}
                isSnappingEnabled={isSnappingEnabled} setIsSnappingEnabled={setIsSnappingEnabled}
                isFreeAspect={isFreeAspect} setIsFreeAspect={setIsFreeAspect}
                brushSize={brushSize} setBrushSize={setBrushSize}
                modificationPrompt={modificationPrompt} setModificationPrompt={setModificationPrompt}
                isProcessing={isProcessing}
                handleRequestModification={handleRequestModification}
                handleRemoveObject={handleRemoveObject}
                handleRemoveBackground={handleRemoveBackground}
                canvasSize={canvasSize}
            />

            {/* Canvas Area */}
            <div className="flex-grow bg-black/90 relative overflow-hidden flex items-center justify-center" style={{ cursor: activeTool === 'hand' ? (isInteracting ? 'grabbing' : 'grab') : 'default' }}>
                
                <EditorFloatingToolbar 
                    activeTool={activeTool}
                    setActiveTool={setActiveTool}
                    onFit={handleFitImageToCanvas}
                    onFill={handleFillImageToCanvas}
                    onFlip={() => setIsFlipped(f => !f)}
                />

                <canvas 
                    ref={canvasRef}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseLeave}
                    onWheel={handleWheel}
                    onContextMenu={(e) => e.preventDefault()}
                />
            </div>
            
            {/* Right Panel (Palette) */}
            <PalettePanel 
                color={drawColor} 
                onChange={setDrawColor}
            />
        </div>
        
        <EditorFooter 
            zoom={viewState.zoom}
            onZoomChange={handleSliderZoom}
            onClose={onClose}
            onReset={handleReset}
            onApply={handleApply}
            isProcessing={isProcessing}
        />
      </div>
    </div>,
    document.body
  );
};

export default ImageEditorModal;
