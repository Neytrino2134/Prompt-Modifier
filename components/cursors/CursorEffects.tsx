import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { generateCursorCss, getActiveCursorDefinition } from './cursorDefinitions';

interface ClickRipple {
    id: number;
    x: number;
    y: number;
    color: string;
    glowColor: string;
    isRightClick: boolean;
}

export const CursorEffects: React.FC = () => {
    const context = useAppContext();
    const cursorSkin = context?.cursorSkin || 'default';
    const currentTheme = context?.currentTheme || 'cyan';
    const isCursorEffectEnabled = context?.isCursorEffectEnabled === true;

    const [ripples, setRipples] = useState<ClickRipple[]>([]);
    const nextIdRef = useRef(0);

    // Inject dynamic cursor stylesheet
    useEffect(() => {
        let styleTag = document.getElementById('custom-cursor-skin-style') as HTMLStyleElement | null;
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'custom-cursor-skin-style';
            document.head.appendChild(styleTag);
        }

        const css = generateCursorCss(cursorSkin, currentTheme);
        styleTag.textContent = css;

        document.documentElement.setAttribute('data-cursor-skin', cursorSkin);

        return () => {
            if (styleTag && styleTag.parentNode) {
                // leave or update on unmount
            }
        };
    }, [cursorSkin, currentTheme]);

    // Handle tactile click reactions
    const handleMouseDown = useCallback((e: MouseEvent) => {
        if (!isCursorEffectEnabled || cursorSkin === 'default') return;

        const activeSet = getActiveCursorDefinition(cursorSkin, currentTheme);
        const isRight = e.button === 2;
        const id = nextIdRef.current++;

        const newRipple: ClickRipple = {
            id,
            x: e.clientX,
            y: e.clientY,
            color: isRight ? '#f43f5e' : activeSet.accentColor,
            glowColor: isRight ? 'rgba(244, 63, 94, 0.8)' : activeSet.glowColor,
            isRightClick: isRight
        };

        setRipples((prev) => [...prev.slice(-4), newRipple]);

        setTimeout(() => {
            setRipples((prev) => prev.filter((r) => r.id !== id));
        }, 450);
    }, [cursorSkin, currentTheme, isCursorEffectEnabled]);

    useEffect(() => {
        if (!isCursorEffectEnabled || cursorSkin === 'default') {
            setRipples([]);
            return;
        }

        window.addEventListener('mousedown', handleMouseDown, { capture: true, passive: true });
        return () => {
            window.removeEventListener('mousedown', handleMouseDown, { capture: true });
        };
    }, [handleMouseDown, isCursorEffectEnabled, cursorSkin]);

    if (!isCursorEffectEnabled || cursorSkin === 'default' || ripples.length === 0) {
        return null;
    }

    return (
        <div className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden">
            {ripples.map((ripple) => (
                <div
                    key={ripple.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ left: ripple.x, top: ripple.y }}
                >
                    {/* Inner high-speed spark */}
                    <div
                        className="w-2.5 h-2.5 rounded-full animate-cursor-spark"
                        style={{
                            backgroundColor: ripple.color,
                            boxShadow: `0 0 10px 2px ${ripple.glowColor}`
                        }}
                    />
                    {/* Outer radiant ring */}
                    <div
                        className="absolute inset-0 -m-3 w-8 h-8 rounded-full border border-dashed animate-cursor-ring"
                        style={{
                            borderColor: ripple.color,
                            boxShadow: `0 0 14px 1px ${ripple.glowColor}`
                        }}
                    />
                    {/* Crosshair pulse */}
                    <div
                        className="absolute inset-0 -m-2 w-6 h-6 animate-cursor-cross"
                        style={{
                            background: `radial-gradient(circle, ${ripple.glowColor} 0%, transparent 70%)`
                        }}
                    />
                </div>
            ))}
        </div>
    );
};
