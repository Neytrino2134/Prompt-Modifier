
import React, { useState, useEffect, useRef } from 'react';

interface DebouncedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    value: string;
    onDebouncedChange: (value: string) => void;
    debounceTime?: number;
}

export const DebouncedInput: React.FC<DebouncedInputProps> = ({ 
    value: externalValue, 
    onDebouncedChange, 
    debounceTime = 300, 
    onChange,
    onPaste,
    ...props 
}) => {
    const [localValue, setLocalValue] = useState(externalValue);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);

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

    return (
        <input
            {...props}
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onPaste={handlePaste}
        />
    );
};