import React, { useState, useEffect, useRef } from 'react';
import { useTextContextMenu } from '../contexts/TextContextMenuContext';

interface DebouncedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    value: string;
    onDebouncedChange: (value: string) => void;
    debounceTime?: number;
    disableCustomContextMenu?: boolean;
}

export const DebouncedTextarea: React.FC<DebouncedTextareaProps> = ({ 
    value: externalValue, 
    onDebouncedChange, 
    debounceTime = 300, 
    onChange, // Capture original onChange to prevent double binding if passed
    onPaste,  // Capture original onPaste to call it after our logic
    onContextMenu,
    spellCheck = true,
    disableCustomContextMenu = false,
    ...props 
}) => {
    const [localValue, setLocalValue] = useState(externalValue);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    // Custom context menu hook (safely optional if outside provider)
    let contextMenu: ReturnType<typeof useTextContextMenu> | null = null;
    try {
        contextMenu = useTextContextMenu();
    } catch {
        contextMenu = null;
    }

    // Sync with external value changes (e.g. undo/redo or other nodes updating this)
    // Only sync if user is NOT currently typing in this specific component
    useEffect(() => {
        if (!isTypingRef.current && externalValue !== localValue) {
            setLocalValue(externalValue);
        }
    }, [externalValue]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        isTypingRef.current = true;

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            onDebouncedChange(newValue);
            isTypingRef.current = false;
        }, debounceTime);
        
        if (onChange) {
            onChange(e);
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            // Flush changes immediately on blur
            onDebouncedChange(localValue);
            isTypingRef.current = false;
        }
        if (props.onBlur) props.onBlur(e);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        // Prevent scroll jump behavior (Browser trying to scroll viewport to caret)
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        
        // Also check if app-container needs restoring (though html/body overflow:hidden should fix most)
        const appContainer = document.getElementById('app-container');
        const appX = appContainer ? appContainer.scrollLeft : 0;
        const appY = appContainer ? appContainer.scrollTop : 0;
        
        // Use requestAnimationFrame to restore scroll position immediately after the browser's default action
        requestAnimationFrame(() => {
            window.scrollTo(scrollX, scrollY);
            if (appContainer) {
                appContainer.scrollTo(appX, appY);
            }
        });

        if (onPaste) {
            onPaste(e);
        }
    };

    const handleContextMenu = (e: React.MouseEvent<HTMLTextAreaElement>) => {
        if (onContextMenu) {
            onContextMenu(e);
        }

        if (!disableCustomContextMenu && contextMenu && textareaRef.current) {
            contextMenu.openContextMenu(e, {
                element: textareaRef.current,
                onDebouncedChange,
                onValueUpdate: (val) => setLocalValue(val)
            });
        }
    };

    return (
        <textarea
            ref={textareaRef}
            spellCheck={spellCheck}
            {...props}
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onPaste={handlePaste}
            onContextMenu={handleContextMenu}
        />
    );
};
