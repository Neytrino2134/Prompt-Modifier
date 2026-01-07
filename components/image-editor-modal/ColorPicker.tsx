
import React, { useState, useEffect, useRef, useCallback } from 'react';

interface ColorPickerProps {
    color: string;
    onChange: (color: string) => void;
}

// Helpers
const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
};

const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

const rgbToHsv = (r: number, g: number, b: number) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max === min) h = 0;
    else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s, v };
};

const hsvToRgb = (h: number, s: number, v: number) => {
    let r = 0, g = 0, b = 0;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};

export const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange }) => {
    const [hsv, setHsv] = useState({ h: 0, s: 1, v: 1 });
    const [hexInput, setHexInput] = useState(color);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const barRef = useRef<HTMLCanvasElement>(null);
    const isDraggingSV = useRef(false);
    const isDraggingHue = useRef(false);

    useEffect(() => {
        const rgb = hexToRgb(color);
        setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
        setHexInput(color);
    }, [color]);

    const updateColorFromHsv = (h: number, s: number, v: number) => {
        const rgb = hsvToRgb(h / 360, s, v);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        onChange(hex);
        setHsv({ h, s, v });
        setHexInput(hex);
    };

    const drawSV = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        // Fill with Hue
        ctx.fillStyle = `hsl(${hsv.h}, 100%, 50%)`;
        ctx.fillRect(0, 0, w, h);

        // Gradient White (Horizontal)
        const gradWhite = ctx.createLinearGradient(0, 0, w, 0);
        gradWhite.addColorStop(0, 'rgba(255,255,255,1)');
        gradWhite.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradWhite;
        ctx.fillRect(0, 0, w, h);

        // Gradient Black (Vertical)
        const gradBlack = ctx.createLinearGradient(0, 0, 0, h);
        gradBlack.addColorStop(0, 'rgba(0,0,0,0)');
        gradBlack.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = gradBlack;
        ctx.fillRect(0, 0, w, h);

        // Draw selection circle
        const x = hsv.s * w;
        const y = (1 - hsv.v) * h;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.stroke();
    }, [hsv]);

    const drawHue = useCallback(() => {
        const canvas = barRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, '#ff0000');
        grad.addColorStop(1/6, '#ffff00');
        grad.addColorStop(2/6, '#00ff00');
        grad.addColorStop(3/6, '#00ffff');
        grad.addColorStop(4/6, '#000000');
        grad.addColorStop(4/6, '#0000ff');
        grad.addColorStop(5/6, '#ff00ff');
        grad.addColorStop(1, '#ff0000');
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Hue indicator
        const x = (hsv.h / 360) * w;
        ctx.fillStyle = 'white';
        ctx.fillRect(x - 2, 0, 4, h);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 2, 0, 4, h);

    }, [hsv.h]);

    useEffect(() => { drawSV(); }, [drawSV]);
    useEffect(() => { drawHue(); }, [drawHue]);

    const handleSV = (e: React.MouseEvent | MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
        const s = x / rect.width;
        const v = 1 - (y / rect.height);
        updateColorFromHsv(hsv.h, s, v);
    };

    const handleHue = (e: React.MouseEvent | MouseEvent) => {
        const canvas = barRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const h = (x / rect.width) * 360;
        updateColorFromHsv(h, hsv.s, hsv.v);
    };
    
    // UseEffect for global mouse events during drag
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (isDraggingSV.current) handleSV(e);
            if (isDraggingHue.current) handleHue(e);
        };
        const onUp = () => {
            isDraggingSV.current = false;
            isDraggingHue.current = false;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        
        const onStartSV = (e: React.MouseEvent) => {
            isDraggingSV.current = true;
            handleSV(e);
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        };

        const onStartHue = (e: React.MouseEvent) => {
            isDraggingHue.current = true;
            handleHue(e);
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        };
        
        // Attach handlers to elements manually or use refs in JSX
        const svEl = canvasRef.current;
        const hueEl = barRef.current;
        
        if (svEl) svEl.onmousedown = onStartSV as any;
        if (hueEl) hueEl.onmousedown = onStartHue as any;

        return () => {
             if (svEl) svEl.onmousedown = null;
             if (hueEl) hueEl.onmousedown = null;
        };
    }, [hsv]); 

    const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setHexInput(val);
        if (/^#[0-9A-F]{6}$/i.test(val)) {
            onChange(val);
            const rgb = hexToRgb(val);
            setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
        }
    };
    
    const presets = [
        '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', 
        '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e', '#ffffff', '#000000'
    ];

    return (
        <div className="flex flex-col gap-3 p-2 bg-gray-800 rounded border border-gray-700 w-full">
            {/* SV Square */}
            <canvas ref={canvasRef} width={200} height={150} className="w-full h-[150px] rounded cursor-crosshair shadow-inner" />
            
            {/* Hue Bar */}
            <canvas ref={barRef} width={200} height={20} className="w-full h-[20px] rounded cursor-ew-resize shadow-inner" />
            
            {/* Inputs */}
            <div className="flex gap-2 items-center">
                <div className="w-8 h-8 rounded border border-gray-500 shadow-sm flex-shrink-0" style={{ backgroundColor: color }}></div>
                <div className="flex-grow flex items-center bg-gray-900 rounded border border-gray-600 px-2 py-1">
                    <span className="text-gray-500 text-xs mr-1">#</span>
                    <input 
                        type="text" 
                        value={hexInput.replace('#', '')} 
                        onChange={handleHexChange}
                        className="bg-transparent text-xs text-white outline-none w-full uppercase font-mono"
                        maxLength={6}
                    />
                </div>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 justify-between">
                {presets.map(p => (
                    <button 
                        key={p} 
                        onClick={() => { onChange(p); setHexInput(p); const rgb = hexToRgb(p); setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b)); }}
                        className={`w-5 h-5 rounded-full border border-gray-600 transition-transform hover:scale-110 ${color === p ? 'ring-2 ring-white' : ''}`}
                        style={{ backgroundColor: p }}
                    />
                ))}
            </div>
            
            <div className="flex text-[10px] text-gray-500 justify-between px-1">
                <span>R:{hexToRgb(color).r} G:{hexToRgb(color).g} B:{hexToRgb(color).b}</span>
            </div>
        </div>
    );
};
