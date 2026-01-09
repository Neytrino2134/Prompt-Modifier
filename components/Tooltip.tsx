
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
    content: string | React.ReactNode;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    align?: 'start' | 'center' | 'end';
    className?: string;
    delay?: number;
    usePortal?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({ 
    content, 
    children, 
    position = 'top', 
    align = 'center',
    className = "",
    delay = 0,
    usePortal = true
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState<{ x: number, y: number } | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const triggerRef = useRef<HTMLDivElement>(null);

    const updatePosition = () => {
        if (!triggerRef.current || !usePortal) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const gap = 6; 

        let x = 0;
        let y = 0;

        // Calculate X
        if (position === 'top' || position === 'bottom') {
            if (align === 'start') x = rect.left;
            else if (align === 'end') x = rect.right;
            else x = rect.left + rect.width / 2;
        } else if (position === 'left') {
            x = rect.left - gap;
        } else if (position === 'right') {
            x = rect.right + gap;
        }

        // Calculate Y
        if (position === 'top') {
            y = rect.top - gap;
        } else if (position === 'bottom') {
            y = rect.bottom + gap;
        } else {
            y = rect.top + rect.height / 2;
        }

        setCoords({ x, y });
    };

    const handleMouseEnter = () => {
        if (usePortal) updatePosition();
        if (delay > 0) {
            timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
        } else {
            setIsVisible(true);
        }
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setIsVisible(false);
    };

    // Update position on scroll/resize to keep tooltip attached (only for portal)
    useEffect(() => {
        if (isVisible && usePortal) {
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isVisible, usePortal]);

    // Safety watchdog: Sometimes (e.g. in Nativefier/WebViews) mouseleave isn't fired if an element becomes disabled
    // or if the mouse moves very quickly. We manually check global mouse position when tooltip is visible.
    useEffect(() => {
        if (!isVisible) return;
        
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                const pad = 10; // buffer pixels to allow some wiggle room around the element
                const isOver = 
                    e.clientX >= rect.left - pad && 
                    e.clientX <= rect.right + pad && 
                    e.clientY >= rect.top - pad && 
                    e.clientY <= rect.bottom + pad;
                
                if (!isOver) {
                    setIsVisible(false);
                    if (timeoutRef.current) clearTimeout(timeoutRef.current);
                }
            }
        };
        
        window.addEventListener('mousemove', handleGlobalMouseMove);
        return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
    }, [isVisible]);

    if (!content) return <div className={className}>{children}</div>;

    // Calculate CSS Transform based on position/alignment
    let transform = '';
    let posClasses = '';
    
    // Logic for Portal Transform (coords are top/left)
    if (usePortal) {
        if (position === 'top') {
            if (align === 'center') transform = 'translate(-50%, -100%)';
            else if (align === 'start') transform = 'translate(0, -100%)';
            else if (align === 'end') transform = 'translate(-100%, -100%)';
        } else if (position === 'bottom') {
            if (align === 'center') transform = 'translate(-50%, 0)';
            else if (align === 'start') transform = 'translate(0, 0)';
            else if (align === 'end') transform = 'translate(-100%, 0)';
        } else if (position === 'left') {
            transform = 'translate(-100%, -50%)';
        } else if (position === 'right') {
            transform = 'translate(0, -50%)';
        }
    } else {
        // Logic for Absolute Positioning (Relative to parent)
        if (position === 'top') {
            posClasses = 'bottom-full mb-2';
            if (align === 'center') { posClasses += ' left-1/2'; transform = 'translate(-50%, 0)'; }
            else if (align === 'start') posClasses += ' left-0';
            else if (align === 'end') posClasses += ' right-0';
        } else if (position === 'bottom') {
            posClasses = 'top-full mt-2';
             if (align === 'center') { posClasses += ' left-1/2'; transform = 'translate(-50%, 0)'; }
            else if (align === 'start') posClasses += ' left-0';
            else if (align === 'end') posClasses += ' right-0';
        } else if (position === 'left') {
            posClasses = 'right-full mr-2 top-1/2';
            transform = 'translate(0, -50%)';
        } else if (position === 'right') {
            posClasses = 'left-full ml-2 top-1/2';
            transform = 'translate(0, -50%)';
        }
    }

    return (
        <>
            <div 
                ref={triggerRef}
                className={`relative flex items-center justify-center ${className} pointer-events-auto`}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onMouseDown={() => setIsVisible(false)}
            >
                {children}

                {!usePortal && isVisible && (
                     <div
                        className={`absolute z-50 px-3 py-1.5 bg-slate-700 text-slate-200 text-xs font-medium whitespace-nowrap rounded-md shadow-xl pointer-events-none ${posClasses}`}
                        style={{
                            transform: transform,
                            animation: 'fade-in-tooltip 0.15s ease-out'
                        }}
                    >
                        {content}
                    </div>
                )}
            </div>
            
            {usePortal && isVisible && coords && createPortal(
                <div
                    className="fixed z-[9999] px-3 py-1.5 bg-slate-700 text-slate-200 text-xs font-medium whitespace-nowrap rounded-md shadow-xl pointer-events-none"
                    style={{
                        top: coords.y,
                        left: coords.x,
                        transform: transform,
                        animation: 'fade-in-tooltip 0.15s ease-out'
                    }}
                >
                    <style>{`
                        @keyframes fade-in-tooltip {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                    `}</style>
                    {content}
                </div>,
                document.body
            )}
        </>
    );
};
