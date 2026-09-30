import React, { useState, useEffect, useRef } from 'react';
import { useTextContextMenu } from '../contexts/TextContextMenuContext';

interface DebouncedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    value: string;
    onDebouncedChange: (value: string) => void;
    debounceTime?: number;
    disableCustomContextMenu?: boolean;
}

export const DebouncedInput: React.FC<DebouncedInputProps> = ({ 
    value: externalValue, 
    onDebouncedChange, 
    debounceTime = 300, 
    onChange,
    onPaste,
    onContextMenu,
    spellCheck = true,
    disableCustomContextMenu = false,
    ...props 
}) => {
    const [localValue, setLocalValue] = useState(externalValue);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);
    const inputRef = useRef<HTMLInputElement>(null);

    let contextMenu: ReturnType<typeof useTextContextMenu> | null = null;
    try {
        contextMenu = useTextContextMenu();
    } catch {
        contextMenu = null;
    }

    useEffect(() => {
        if (!isTypingRef.current && externalValue !== localValue) {
            setLocalValue(externalValue);
        }
    }, [externalValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        
        if (onChange) onChange(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            onDebouncedChange(localValue);
            isTypingRef.current = false;
        }
        if (props.onBlur) props.onBlur(e);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        // Prevent scroll jump behavior
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        
        const appContainer = document.getElementById('app-container');
        const appX = appContainer ? appContainer.scrollLeft : 0;
        const appY = appContainer ? appContainer.scrollTop : 0;
        
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

    const handleContextMenu = (e: React.MouseEvent<HTMLInputElement>) => {
        if (onContextMenu) {
            onContextMenu(e);
        }

        if (!disableCustomContextMenu && contextMenu && inputRef.current) {
            contextMenu.openContextMenu(e, {
                element: inputRef.current,
                onDebouncedChange,
                onValueUpdate: (val) => setLocalValue(val)
            });
        }
    };

    return (
        <input
            ref={inputRef}
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
