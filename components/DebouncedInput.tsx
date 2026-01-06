
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

    return (
        <input
            {...props}
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
        />
    );
};
