
import React, { useState, useEffect, useCallback, useRef } from 'react';

interface DebouncedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    value: string;
    onDebouncedChange: (value: string) => void;
    debounceTime?: number;
}

export const DebouncedTextarea: React.FC<DebouncedTextareaProps> = ({ 
    value: externalValue, 
    onDebouncedChange, 
    debounceTime = 300, 
    onChange, // Capture original onChange to prevent double binding if passed
    ...props 
}) => {
    const [localValue, setLocalValue] = useState(externalValue);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);

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

    return (
        <textarea
            {...props}
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
        />
    );
};
