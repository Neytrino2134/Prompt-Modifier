
import React from 'react';

// Global counter for floating windows (Viewers, Editors)
// Starts high to ensure it's above standard UI elements
let globalFloatingZIndex = 500;

export const getNextFloatingZIndex = () => {
    return ++globalFloatingZIndex;
};

export const createResizeDragHandler = (
    height: number,
    setHeight: (newHeight: number) => void,
    contentRef: React.RefObject<HTMLDivElement>,
    minTop: number = 50,
    minBottom: number = 80
) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startHeight = height;

    const handleDrag = (moveEvent: MouseEvent) => {
        const dy = moveEvent.clientY - startY;
        const newHeight = startHeight + dy;
        
        if (contentRef.current) {
            const contentHeight = contentRef.current.offsetHeight;
            const maxHeight = contentHeight - minBottom;
            setHeight(Math.max(minTop, Math.min(newHeight, maxHeight)));
        }
    };

    const handleDragEnd = () => {
        window.removeEventListener('mousemove', handleDrag);
        window.removeEventListener('mouseup', handleDragEnd);
    };

    window.addEventListener('mousemove', handleDrag);
    window.addEventListener('mouseup', handleDragEnd);
};
