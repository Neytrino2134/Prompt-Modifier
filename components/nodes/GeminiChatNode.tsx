




import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import type { NodeContentProps } from '../../types';
import { ActionButton } from '../ActionButton';
import { CopyIcon } from '../../components/icons/AppIcons';
import { useAppContext } from '../../contexts/AppContext';
import { Tooltip } from '../Tooltip';
import CustomSelect from '../CustomSelect';

// Helper function to format inline text (bold, code)
const formatText = (text: string) => {
    // Basic sanitization
    let safeText = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/"/g, "&#039;");

    // Bold **text** - Themed
    safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong class="text-accent-text font-bold">$1</strong>');
    
    // Bold __text__ - Themed
    safeText = safeText.replace(/__(.*?)__/g, '<strong class="text-accent-text font-bold">$1</strong>');

    // Inline code `text` - Themed
    safeText = safeText.replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1 rounded text-accent-text font-mono text-xs">$1</code>');

    return safeText;
};

// Component for Code Block with Copy Button
const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group/code my-2">
            <div className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity z-10">
                <button 
                    onClick={handleCopy}
                    className="p-1.5 bg-gray-700 hover:bg-accent text-gray-300 hover:text-white rounded text-xs flex items-center gap-1 shadow-sm transition-colors"
                    title={copied ? "Copied!" : "Copy Code"}
                >
                    {copied ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <CopyIcon className="h-4 w-4" />
                    )}
                </button>
            </div>
            <pre className="bg-gray-900/80 p-3 rounded-md border border-gray-600 text-accent-text overflow-x-auto font-mono text-xs shadow-inner [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-500 select-text">
                <code>{code}</code>
            </pre>
        </div>
    );
};

// A component to render markdown-like content from the AI
const MarkdownContent: React.FC<{ content: string }> = React.memo(({ content }) => {
    // Split by code blocks first to avoid formatting inside code
    // Matches ```prompt ... ``` OR generic ``` ... ```
    const parts = content.split(/(```prompt\n[\s\S]*?\n```|```[\s\S]*?```)/g);

    return (
        <div className="text-sm leading-relaxed space-y-2 text-gray-200 break-words cursor-text">
            {parts.map((part, index) => {
                // 1. Special Prompt Code Block
                const promptMatch = part.match(/```prompt\n([\s\S]*?)\n```/);
                if (promptMatch) {
                    return <CodeBlock key={index} code={promptMatch[1].trim()} />;
                }

                // 2. Generic Code Block
                const codeMatch = part.match(/```([\s\S]*?)```/);
                if (codeMatch) {
                    let rawCode = codeMatch[1];
                    // Clean up language identifier (e.g., "bash", "python") from the first line
                    // It usually looks like "bash\n<code...>"
                    const firstNewLine = rawCode.indexOf('\n');
                    if (firstNewLine !== -1) {
                        const potentialLang = rawCode.substring(0, firstNewLine).trim();
                        // If the first line is a single word (no spaces), treat it as a language tag and remove it
                        if (potentialLang && !potentialLang.includes(' ')) {
                             rawCode = rawCode.substring(firstNewLine + 1);
                        }
                    }
                    return <CodeBlock key={index} code={rawCode.trim()} />;
                }

                // 3. Standard Text Content
                if (!part.trim()) return null;

                const lines = part.split('\n');
                const elements: React.ReactNode[] = [];
                let listBuffer: React.ReactNode[] = [];
                let isOrderedList = false;

                const flushList = () => {
                    if (listBuffer.length > 0) {
                        if (isOrderedList) {
                            // Changed list-inside to list-outside + ml-4 for better indentation
                            elements.push(
                                <ol key={`list-${index}-${elements.length}`} className="list-decimal list-outside ml-4 space-y-1 mb-2 marker:text-gray-500 select-text">
                                    {[...listBuffer]}
                                </ol>
                            );
                        } else {
                            elements.push(
                                <ul key={`list-${index}-${elements.length}`} className="list-disc list-outside ml-4 space-y-1 mb-2 marker:text-gray-500 select-text">
                                    {[...listBuffer]}
                                </ul>
                            );
                        }
                        listBuffer = [];
                    }
                };

                lines.forEach((line, lineIdx) => {
                    // Regex for list items and headers
                    const orderedMatch = line.match(/^(\d+)\.\s+(.*)/);
                    const unorderedMatch = line.match(/^[\*\-]\s+(.*)/);
                    const headerMatch = line.match(/^(#{1,6})\s+(.*)/);

                    if (orderedMatch) {
                        // Ordered List Item
                        if (listBuffer.length > 0 && !isOrderedList) flushList(); // Switch list type if needed
                        isOrderedList = true;
                        
                        // Extract the number from string to maintain continuity across code blocks
                        const itemNumber = parseInt(orderedMatch[1], 10);
                        
                        listBuffer.push(
                            <li 
                                key={lineIdx} 
                                value={itemNumber} // Explicitly set value to fix numbering resets
                                dangerouslySetInnerHTML={{ __html: formatText(orderedMatch[2]) }} 
                            />
                        );
                    } else if (unorderedMatch) {
                        // Unordered List Item
                        if (listBuffer.length > 0 && isOrderedList) flushList(); // Switch list type if needed
                        isOrderedList = false;
                        listBuffer.push(<li key={lineIdx} dangerouslySetInnerHTML={{ __html: formatText(unorderedMatch[1]) }} />);
                    } else {
                        flushList(); // End any active list

                        if (headerMatch) {
                            // Headers
                            const level = headerMatch[1].length;
                            const fontSize = level === 1 ? 'text-lg' : level === 2 ? 'text-base' : 'text-sm';
                            // Themed header color
                            elements.push(
                                <div key={lineIdx} className={`${fontSize} font-bold text-accent-text mt-3 mb-1 border-b border-gray-700/50 pb-1 select-text`} dangerouslySetInnerHTML={{ __html: formatText(headerMatch[2]) }} />
                            );
                        } else {
                            // Paragraphs
                            if (line.trim() === '') {
                                elements.push(<div key={lineIdx} className="h-2" />); // Spacer for empty lines
                            } else {
                                elements.push(<div key={lineIdx} className="min-h-[1.2em] select-text" dangerouslySetInnerHTML={{ __html: formatText(line) }} />);
                            }
                        }
                    }
                });
                flushList(); // Flush any remaining list items

                return <div key={index} className="select-text">{elements}</div>;
            })}
        </div>
    );
});

// Internal Style Button Component with Tooltip
const StyleButton: React.FC<{ id: string; label: string; icon: React.ReactNode; isActive: boolean; onClick: () => void; }> = ({ label, icon, isActive, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);
    return (
        <div className="relative flex-1 flex" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} onMouseDown={e => e.stopPropagation()}>
            <button
                onClick={onClick}
                // Themed active state
                className={`flex-1 flex items-center justify-center p-1.5 rounded transition-all duration-200 group ${isActive ? 'bg-accent text-white shadow-sm' : 'hover:bg-gray-700 text-gray-400 hover:text-gray-200'}`}
            >
                {icon}
            </button>
             {/* Styled Tooltip */}
             <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-700 text-slate-200 text-xs whitespace-nowrap rounded shadow-xl z-50 pointer-events-none transition-opacity duration-200 ease-out origin-bottom ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                {label}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-700"></div>
            </div>
        </div>
    );
};

const FloatingCopyButton: React.FC<{ 
    selection: Selection; 
    onCopy: () => void; 
    rootRef: React.RefObject<HTMLDivElement>;
    scale: number;
}> = ({ selection, onCopy, rootRef, scale }) => {
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

    useEffect(() => {
        if (!selection || selection.rangeCount === 0 || selection.toString().length === 0) {
            setPosition(null);
            return;
        }

        const range = selection.getRangeAt(0);
        const rangeRect = range.getBoundingClientRect();
        
        // Ensure the selection is actually inside our node
        if (rootRef.current && !rootRef.current.contains(range.commonAncestorContainer)) {
            setPosition(null);
            return;
        }
        
        if (!rootRef.current) return;
        const rootRect = rootRef.current.getBoundingClientRect();

        // Calculate relative position within the node, accounting for zoom scale
        // We use client coordinates for both, difference gives screen pixels, divide by scale gives local node pixels.
        const top = (rangeRect.top - rootRect.top) / scale - 40; 
        const left = (rangeRect.left - rootRect.left) / scale + (rangeRect.width / scale / 2);

        setPosition({ top, left });
    }, [selection, rootRef, scale]);

    if (!position) return null;

    // Render absolutely within the node (node has relative positioning)
    return (
        <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCopy(); }}
            style={{ top: position.top, left: position.left, transform: 'translateX(-50%)' }}
            className="absolute z-[100] px-3 py-1.5 bg-gray-800 text-white text-xs font-bold rounded-lg shadow-xl border border-gray-600 hover:bg-gray-700 hover:border-cyan-500 transition-all flex items-center gap-2 animate-fade-in-up"
        >
            <CopyIcon className="h-3 w-3" />
            Copy
        </button>
    );
};

const GeminiChatNodeComponent: React.FC<NodeContentProps> = ({ node, onValueChange, onSendMessage, isChatting, t, onSelectNode, addToast }) => {
    const context = useAppContext();
    const viewScale = context?.viewTransform.scale || 1;

    const chatValue = useMemo(() => {
        try {
            return JSON.parse(node.value || '{}');
        } catch {
            return { messages: [], currentInput: '', style: 'general', attachment: null, model: 'gemini-3-flash-preview' };
        }
    }, [node.value]);

    const { messages = [], currentInput = '', style = 'general', attachment = null, model = 'gemini-3-flash-preview' } = chatValue;
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const isUserAtBottomRef = useRef(true); // Track if user is at bottom
    
    const rootRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Text Selection State
    const [selection, setSelection] = useState<Selection | null>(null);

    // --- Auto-Grow Logic ---
    useLayoutEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        // Reset height to allow shrinking if text is deleted
        textarea.style.height = '120px';
        
        // Calculate new height based on content
        const scrollHeight = textarea.scrollHeight;
        
        // Clamp height between 120px and 200px
        const newHeight = Math.min(Math.max(120, scrollHeight), 200);
        
        textarea.style.height = `${newHeight}px`;
        
        // Show scrollbar only if content exceeds max height
        textarea.style.overflowY = scrollHeight > 200 ? 'auto' : 'hidden';

    }, [currentInput]);

    // Handle Scroll to track user position
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        e.stopPropagation();
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        // Check if user is within 50px of the bottom
        isUserAtBottomRef.current = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
    };

    // Auto-scroll effect
    useEffect(() => {
        if (chatContainerRef.current && isUserAtBottomRef.current) {
             chatContainerRef.current.scrollTo({
                 top: chatContainerRef.current.scrollHeight,
                 behavior: 'smooth'
             });
        }
    }, [messages, isChatting]); // Dependencies trigger scroll check

    // Handle Selection Change
    useEffect(() => {
        const handleSelectionChange = () => {
            const sel = window.getSelection();
            if (sel && sel.toString().length > 0) {
                // Verify selection is inside this component
                if (chatContainerRef.current && chatContainerRef.current.contains(sel.anchorNode)) {
                    setSelection(sel);
                    return;
                }
            }
            setSelection(null);
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, []);

    const handleSend = () => {
        if (!isChatting) {
            onSendMessage(node.id);
            // Force scroll to bottom on send
            isUserAtBottomRef.current = true; 
        }
    };

    const handleStyleChange = (newStyle: string) => {
        onValueChange(node.id, JSON.stringify({ ...chatValue, style: newStyle }));
    };

    const handleModelChange = (newModel: string) => {
        onValueChange(node.id, JSON.stringify({ ...chatValue, model: newModel }));
    };
    
    const handleFileClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Convert to Base64 for storage/transmission
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            const newAttachment = {
                name: file.name,
                type: file.type,
                data: dataUrl
            };
            onValueChange(node.id, JSON.stringify({ ...chatValue, attachment: newAttachment }));
            if (addToast) addToast("File attached", "success");
        };
        reader.readAsDataURL(file);
        
        // Reset input
        e.target.value = '';
    };

    const handlePasteClipboard = async () => {
        try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                // Check for images
                if (item.types.some(t => t.startsWith('image/'))) {
                    const blob = await item.getType(item.types.find(t => t.startsWith('image/'))!);
                    const file = new File([blob], "pasted_image.png", { type: blob.type });
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        const dataUrl = ev.target?.result as string;
                        onValueChange(node.id, JSON.stringify({ ...chatValue, attachment: { name: file.name, type: file.type, data: dataUrl } }));
                        if (addToast) addToast(t('toast.pastedFromClipboard'), "success");
                    };
                    reader.readAsDataURL(file);
                    return;
                }
            }
            
            // Fallback to text if no image found in items
            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                     onValueChange(node.id, JSON.stringify({ ...chatValue, currentInput: currentInput + text }));
                     if (addToast) addToast(t('toast.pastedFromClipboard'), "success");
                }
            } catch (err) {
                 // Ignore text error if image check failed silently
            }

        } catch (e) {
            // Fallback for Firefox which might block .read() without gesture
            try {
                const text = await navigator.clipboard.readText();
                 if (text) {
                     onValueChange(node.id, JSON.stringify({ ...chatValue, currentInput: currentInput + text }));
                 }
            } catch (err) {
                if (addToast) addToast(t('toast.pasteFailed'), "error");
            }
        }
    };

    const handleRemoveAttachment = () => {
        onValueChange(node.id, JSON.stringify({ ...chatValue, attachment: null }));
    };
    
    const handleFloatingCopy = () => {
        if (selection) {
            navigator.clipboard.writeText(selection.toString());
            if (addToast) addToast(t('toast.copiedToClipboard'));
            selection.removeAllRanges();
            setSelection(null);
        }
    };
    
    // Download Functions
    const handleDownloadTxt = (content: string) => {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `Gemini_Chat_${timestamp}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadDoc = (content: string) => {
        // 1. Basic sanitization
        let htmlBody = content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // 2. Headers (Must be done before newlines are replaced if they rely on line starts)
        htmlBody = htmlBody.replace(/^### (.*$)/gim, '<h3 style="color: #0891b2; font-size: 14pt; margin-top: 12pt; margin-bottom: 3pt; font-family: \'Calibri Light\', sans-serif;">$1</h3>');
        htmlBody = htmlBody.replace(/^## (.*$)/gim, '<h2 style="color: #0891b2; font-size: 16pt; margin-top: 14pt; margin-bottom: 6pt; font-family: \'Calibri Light\', sans-serif;">$1</h2>');
        htmlBody = htmlBody.replace(/^# (.*$)/gim, '<h1 style="color: #0891b2; font-size: 18pt; margin-top: 16pt; margin-bottom: 6pt; font-family: \'Calibri Light\', sans-serif;">$1</h1>');

        // 3. Bold / Italic
        htmlBody = htmlBody.replace(/\*\*(.*?)\*\*/g, '<b style="color: #0891b2;">$1</b>');
        htmlBody = htmlBody.replace(/__(.*?)__/g, '<b style="color: #0891b2;">$1</b>');
        htmlBody = htmlBody.replace(/\*(.*?)\*/g, '<i>$1</i>');
        htmlBody = htmlBody.replace(/_(.*?)_/g, '<i>$1</i>');

        // 4. Code Blocks
        htmlBody = htmlBody.replace(/```([\s\S]*?)```/g, (match, codeContent) => {
             // Preserve newlines inside code as <br>
             const formattedCode = codeContent.replace(/\n/g, '<br>');
             return `<div style="background-color: #f5f5f5; padding: 10px; border: 1px solid #ccc; border-radius: 5px; font-family: 'Courier New', monospace; font-size: 10pt; margin: 10px 0;">${formattedCode}</div>`;
        });

        // 5. Inline Code
        htmlBody = htmlBody.replace(/`([^`]+)`/g, '<span style="background-color: #f0f0f0; padding: 2px; border-radius: 4px; font-family: \'Courier New\', monospace; color: #d63384; font-size: 10pt;">$1</span>');

        // 6. Global Newlines to <br> for remaining text
        htmlBody = htmlBody.replace(/\n/g, '<br>');

        const htmlContent = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>Gemini Export</title>
                <style>
                    body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #000000; line-height: 1.5; }
                    h1, h2, h3, h4, h5, h6 { font-family: 'Calibri Light', 'Arial', sans-serif; color: #0891b2; }
                    strong, b { color: #0891b2; }
                </style>
            </head>
            <body>
                ${htmlBody}
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', htmlContent], {
            type: 'application/msword'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `Gemini_Chat_${timestamp}.doc`; 
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const styles = [
        { id: 'general', label: t('geminiChat.mode.general'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> },
        { id: 'prompt', label: t('geminiChat.mode.prompt'), icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path strokeLinecap="round" strokeLinejoin="round" d="m21 15-5-5L5 21" /></svg> },
        { id: 'script', label: t('geminiChat.mode.script'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
        { id: 'youtube', label: t('geminiChat.mode.youtube'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> },
        { id: 'developer', label: t('geminiChat.mode.developer'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg> }
    ];
    
    const activeLabel = styles.find(s => s.id === style)?.label;

    const stopPropagation = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const modelOptions = [
        { value: 'gemini-3-flash-preview', label: 'Flash 3.0' },
        { value: 'gemini-3-pro-preview', label: 'Pro 3.0' }
    ];

    return (
        <div className="flex flex-col h-full relative" ref={rootRef}>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange} 
                accept="image/*,.txt,.pdf,.json" 
            />
            
            {selection && <FloatingCopyButton selection={selection} onCopy={handleFloatingCopy} rootRef={rootRef} scale={viewScale} />}

            {/* Top Bar with Style Switcher and Model Selector */}
            <div className="flex items-center bg-gray-900/50 p-1 rounded-md mb-2 shrink-0 justify-between gap-2" onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}>
                <div className="flex space-x-1 flex-1">
                    {styles.map(s => (
                        <StyleButton
                            key={s.id}
                            id={s.id}
                            label={s.label}
                            icon={s.icon}
                            isActive={style === s.id}
                            onClick={() => handleStyleChange(s.id)}
                        />
                    ))}
                </div>
                
                {/* Model Selector - Compact */}
                <div className="w-[100px] flex-shrink-0">
                    <CustomSelect
                        value={model}
                        onChange={handleModelChange}
                        options={modelOptions}
                        disabled={isChatting}
                    />
                </div>
            </div>

            {/* Chat Messages */}
            <div 
                ref={chatContainerRef} 
                onWheel={e => e.stopPropagation()}
                onScroll={handleScroll} 
                className="flex-grow p-2 bg-gray-900/50 rounded-md overflow-y-auto overflow-x-hidden mb-1 space-y-4 custom-scrollbar select-text cursor-text"
                onMouseDown={stopPropagation}
                onMouseMove={stopPropagation}
                onMouseUp={stopPropagation}
                onClick={stopPropagation}
            >
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2 opacity-50 select-none pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        <span className="text-xs font-medium">{activeLabel}</span>
                        <span className="text-[10px] text-gray-600">{model === 'gemini-3-pro-preview' ? 'Pro 3.0' : 'Flash 3.0'}</span>
                    </div>
                )}
                {messages.map((msg: { role: string, content: string }, index: number) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {/* User Message: Themed Accent Color */}
                        <div className={`relative group max-w-[90%] p-3 rounded-lg select-text flex gap-2 ${msg.role === 'user' ? 'bg-accent text-white shadow-md' : 'bg-gray-800 border border-gray-700'}`}>
                           
                           {/* Content Wrapper */}
                           <div className="min-w-0 flex-grow">
                               {msg.role === 'model' ? (
                                   <MarkdownContent content={msg.content} /> 
                               ) : (
                                   <p className={`text-sm whitespace-pre-wrap break-words select-text ${msg.role === 'user' ? 'text-white' : 'text-gray-200'}`}>
                                       {msg.content}
                                   </p>
                               )}
                           </div>
                           
                           {/* Sticky Action Sidebar */}
                           {msg.role === 'model' && (
                               <div className="flex flex-col justify-start shrink-0 self-stretch">
                                    <div className="sticky top-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                                       <ActionButton
                                           title={t('node.action.copy')}
                                           onClick={(e) => {
                                               e.stopPropagation();
                                               navigator.clipboard.writeText(msg.content);
                                               addToast(t('toast.copiedToClipboard'));
                                           }}
                                           className="p-1.5 bg-gray-800/80 rounded-md text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 shadow-sm"
                                           tooltipPosition="left"
                                       >
                                           <CopyIcon className="h-3 w-3" />
                                       </ActionButton>
                                       
                                       <ActionButton
                                           title={t('node.action.downloadTxt')}
                                           onClick={(e) => {
                                               e.stopPropagation();
                                               handleDownloadTxt(msg.content);
                                           }}
                                           className="p-1.5 bg-gray-800/80 rounded-md text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 shadow-sm"
                                           tooltipPosition="left"
                                       >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                       </ActionButton>

                                       <ActionButton
                                           title={t('node.action.downloadDoc')}
                                           onClick={(e) => {
                                               e.stopPropagation();
                                               handleDownloadDoc(msg.content);
                                           }}
                                           className="p-1.5 bg-gray-800/80 rounded-md text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 shadow-sm"
                                           tooltipPosition="left"
                                       >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                            </svg>
                                       </ActionButton>
                                   </div>
                               </div>
                           )}
                        </div>
                    </div>
                ))}
                {isChatting && (
                    <div className="flex justify-start">
                        <div className="p-3 rounded-lg bg-gray-800 border border-gray-700">
                            <div className="flex items-center space-x-1">
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="relative w-full group flex-shrink-0 bg-gray-700 rounded-md border-none focus-within:ring-1 focus-within:ring-node-selected transition-shadow">
                
                {/* Attachment Preview Overlay */}
                {attachment && (
                    <div className="absolute -top-8 left-2 bg-gray-800 text-accent-text text-xs px-2 py-1 rounded-t-md border border-accent/50 border-b-0 flex items-center gap-2 max-w-[200px] shadow-sm z-0">
                        <span className="truncate">{attachment.name}</span>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleRemoveAttachment(); }}
                            className="text-gray-500 hover:text-red-400"
                            title="Remove attachment"
                        >
                            &times;
                        </button>
                    </div>
                )}

                <textarea
                    ref={textareaRef}
                    value={currentInput}
                    onChange={(e) => onValueChange(node.id, JSON.stringify({ ...chatValue, currentInput: e.target.value }))}
                    onKeyDown={(e) => { 
                         e.stopPropagation(); // Stop hotkeys
                         if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } 
                    }}
                    onKeyUp={e => e.stopPropagation()}
                    placeholder={t('node.content.chatPlaceholder')}
                    onWheel={e => e.stopPropagation()}
                    onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}
                    onMouseMove={stopPropagation}
                    onMouseUp={stopPropagation}
                    // Styles for auto-grow behavior (min-h: 120px, max-h: 200px)
                    className="w-full p-2 pr-12 bg-transparent border-none rounded-md resize-none focus:outline-none text-sm text-white placeholder-gray-400"
                    style={{ minHeight: '120px', maxHeight: '200px', overflowY: 'hidden' }}
                />
                
                {/* Actions (Vertical Column) */}
                <div className="absolute bottom-2 right-2 flex flex-col gap-2 items-center">
                     <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip content="Вставить из буфера" position="left">
                             <button 
                                onClick={handlePasteClipboard} 
                                className="p-1.5 rounded-md transition-colors duration-200 bg-gray-600 hover:bg-gray-500 text-gray-300 hover:text-white"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 14l2 2 4-4" />
                                </svg>
                            </button>
                        </Tooltip>
                        
                        <Tooltip content="Прикрепить файл" position="left">
                            <button 
                                onClick={handleFileClick} 
                                className={`p-1.5 rounded-md transition-colors duration-200 ${attachment ? 'bg-accent/20 text-accent-text border border-accent/50' : 'bg-gray-600 hover:bg-gray-500 text-gray-300 hover:text-white'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                     <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                            </button>
                        </Tooltip>
                     </div>
                    
                    <Tooltip content="Отправить" position="left">
                        <button 
                            onClick={handleSend} 
                            disabled={isChatting || (!currentInput.trim() && !attachment)} 
                            className="p-1.5 bg-accent hover:bg-accent-hover rounded-md text-white disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-200 shadow-md"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                            </svg>
                        </button>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
};

export const GeminiChatNode = React.memo(GeminiChatNodeComponent);