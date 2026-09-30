import React, { useState, useRef, useEffect } from 'react';
import { useTextContextMenu } from '../contexts/TextContextMenuContext';

interface SyntaxHighlightedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    value: string;
    onDebouncedChange: (value: string) => void;
    debounceTime?: number;
    disableCustomContextMenu?: boolean;
}

export const SyntaxHighlightedTextarea: React.FC<SyntaxHighlightedTextareaProps> = ({ 
    value: externalValue, 
    onDebouncedChange, 
    debounceTime = 300, 
    className = '',
    style,
    spellCheck = true,
    disableCustomContextMenu = false,
    onContextMenu,
    ...props 
}) => {
    const [localValue, setLocalValue] = useState(externalValue);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const isTypingRef = useRef(false);

    let contextMenu: ReturnType<typeof useTextContextMenu> | null = null;
    try {
        contextMenu = useTextContextMenu();
    } catch {
        contextMenu = null;
    }

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

    // Sync width/padding to account for scrollbar
    useEffect(() => {
        if (!textareaRef.current || !backdropRef.current) return;
        
        const syncDimensions = () => {
            const textarea = textareaRef.current;
            const backdrop = backdropRef.current;
            
            if (textarea && backdrop) {
                const computed = window.getComputedStyle(textarea);
                const borderLeft = parseFloat(computed.borderLeftWidth) || 0;
                const borderRight = parseFloat(computed.borderRightWidth) || 0;
                const scrollbarWidth = textarea.offsetWidth - textarea.clientWidth - borderLeft - borderRight;
                
                if (scrollbarWidth > 0) {
                    const currentPaddingRight = parseFloat(computed.paddingRight) || 0;
                    backdrop.style.paddingRight = `${currentPaddingRight + scrollbarWidth}px`;
                } else {
                    backdrop.style.removeProperty('padding-right');
                }
            }
        };

        const observer = new ResizeObserver(syncDimensions);
        observer.observe(textareaRef.current);
        
        textareaRef.current.addEventListener('input', syncDimensions);
        
        return () => {
            observer.disconnect();
            if (textareaRef.current) textareaRef.current.removeEventListener('input', syncDimensions);
        };
    }, []);

    // Render text with highlights
    const renderHighlights = (text: string) => {
        // Regex to match [Entity-N] or [Character-N]
        const parts = text.split(/(\[(?:Entity|Character)-[^\]]+\])/g);
        
        return parts.map((part, index) => {
            if (part.match(/^\[(?:Entity|Character)-[^\]]+\]$/)) {
                return <span key={index} className="text-connection-text font-medium">{part}</span>;
            }
            return <span key={index}>{part}</span>;
        });
    };

    return (
        <div className="relative w-full h-full group/highlighter" style={style}>
            {/* Backdrop Layer (Highlights) */}
            <div 
                ref={backdropRef}
                className={`absolute inset-0 pointer-events-none whitespace-pre-wrap break-words overflow-hidden text-transparent ${className}`}
                style={{
                    color: 'transparent',
                    zIndex: 0,
                    borderColor: 'transparent',
                }}
                aria-hidden="true"
            >
                {/* Inner wrapper to apply visible text color for highlights */}
                <div className="text-gray-200" style={{ width: '100%', height: '100%' }}>
                    {renderHighlights(localValue)}
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
                onContextMenu={handleContextMenu}
                className={`relative w-full h-full text-transparent caret-white resize-none focus:outline-none z-10 ${className}`}
                style={{ 
                    color: 'transparent', 
                    caretColor: 'white',
                    backgroundColor: 'transparent',
                    ...style 
                }}
                spellCheck={spellCheck}
            />
        </div>
    );
};
