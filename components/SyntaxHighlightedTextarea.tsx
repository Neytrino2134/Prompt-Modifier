
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';

interface SyntaxHighlightedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    value: string;
    onDebouncedChange: (value: string) => void;
    debounceTime?: number;
}

export const SyntaxHighlightedTextarea: React.FC<SyntaxHighlightedTextareaProps> = ({ 
    value: externalValue, 
    onDebouncedChange, 
    debounceTime = 300, 
    className = '',
    style,
    ...props 
}) => {
    const [localValue, setLocalValue] = useState(externalValue);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const isTypingRef = useRef(false);

    // Sync with external value changes
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
        
        if (props.onChange) {
            props.onChange(e);
        }
    };

    const handleScroll = () => {
        if (textareaRef.current && backdropRef.current) {
            backdropRef.current.scrollTop = textareaRef.current.scrollTop;
            backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };

    // Render text with highlights
    const renderHighlights = (text: string) => {
        // Regex to match [Entity-N] or [Character-N]
        // Capturing groups: 1=Whole tag
        const parts = text.split(/(\[(?:Entity|Character)-[^\]]+\])/g);
        
        return parts.map((part, index) => {
            if (part.match(/^\[(?:Entity|Character)-[^\]]+\]$/)) {
                // Changed to text-connection-text as requested
                return <span key={index} className="text-connection-text font-bold">{part}</span>;
            }
            return <span key={index}>{part}</span>;
        });
    };

    // Extract base padding/font classes from the passed className to apply to both layers
    // We assume the className passed contains Tailwind classes like 'p-2', 'text-xs', etc.
    // The specific coloring classes should be applied to the wrapper or specific layers.
    
    return (
        <div className="relative w-full h-full group/highlighter" style={style}>
            {/* Backdrop Layer (Highlights) */}
            <div 
                ref={backdropRef}
                className={`absolute inset-0 pointer-events-none whitespace-pre-wrap break-words overflow-hidden text-transparent ${className}`}
                style={{
                    color: 'transparent', // Hide raw text
                    zIndex: 0,
                    // Ensure padding matches textarea perfectly. 
                    // Note: Default tailwind p-1 is 0.25rem, p-2 is 0.5rem. 
                    // We rely on className passing consistent padding.
                }}
                aria-hidden="true"
            >
                {/* Render colored text here. 
                    The trick is: The container text is transparent, but spans override color. 
                */}
                <div className="text-gray-200">
                    {renderHighlights(localValue)}
                    {/* Add a trailing space to fix height issues with trailing newlines */}
                    {localValue.endsWith('\n') && <br />}
                </div>
            </div>

            {/* Foreground Layer (Input) */}
            <textarea
                {...props}
                ref={textareaRef}
                value={localValue}
                onChange={handleChange}
                onScroll={handleScroll}
                className={`relative w-full h-full bg-transparent text-transparent caret-white resize-none focus:outline-none z-10 ${className}`}
                style={{ 
                    // Important: Text color transparent to show backdrop, but caret must be visible
                    color: 'transparent', 
                    caretColor: 'white',
                    ...style 
                }}
                spellCheck={false}
            />
        </div>
    );
};
