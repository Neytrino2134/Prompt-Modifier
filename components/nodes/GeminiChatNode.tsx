
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { NodeContentProps } from '../../types';
import { ActionButton } from '../ActionButton';
import { CopyIcon } from '../../components/icons/AppIcons';

// Helper function to format inline text (bold, code)
const formatText = (text: string) => {
    // Basic sanitization
    let safeText = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    // Bold **text** - Themed
    safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong class="text-accent-text font-bold">$1</strong>');
    
    // Bold __text__ - Themed
    safeText = safeText.replace(/__(.*?)__/g, '<strong class="text-accent-text font-bold">$1</strong>');

    // Inline code `text` - Themed
    safeText = safeText.replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1 rounded text-accent-text font-mono text-xs">$1</code>');

    return safeText;
};

// A component to render markdown-like content from the AI
const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
    // Split by code blocks first to avoid formatting inside code
    // Matches ```prompt ... ``` OR generic ``` ... ```
    const parts = content.split(/(```prompt\n[\s\S]*?\n```|```[\s\S]*?```)/g);

    return (
        <div className="text-sm leading-relaxed space-y-2 text-gray-200 break-words">
            {parts.map((part, index) => {
                // 1. Special Prompt Code Block
                const promptMatch = part.match(/```prompt\n([\s\S]*?)\n```/);
                if (promptMatch) {
                    return (
                        <pre key={index} className="bg-gray-900/80 p-3 my-2 rounded-md border border-gray-600 text-accent-text overflow-x-auto font-mono text-xs shadow-inner [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
                            <code>{promptMatch[1].trim()}</code>
                        </pre>
                    );
                }

                // 2. Generic Code Block
                const codeMatch = part.match(/```([\s\S]*?)```/);
                if (codeMatch) {
                     return (
                        <pre key={index} className="bg-gray-800 p-3 my-2 rounded-md border border-gray-700 text-gray-300 overflow-x-auto font-mono text-xs shadow-inner [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
                            <code>{codeMatch[1].trim()}</code>
                        </pre>
                    );
                }

                // 3. Standard Text Content
                if (!part.trim()) return null;

                const lines = part.split('\n');
                const elements: React.ReactNode[] = [];
                let listBuffer: React.ReactNode[] = [];
                let isOrderedList = false;

                const flushList = () => {
                    if (listBuffer.length > 0) {
                        elements.push(
                            isOrderedList 
                                ? <ol key={`list-${index}-${elements.length}`} className="list-decimal list-inside pl-2 space-y-1 mb-2 marker:text-gray-500">{[...listBuffer]}</ol>
                                : <ul key={`list-${index}-${elements.length}`} className="list-disc list-inside pl-2 space-y-1 mb-2 marker:text-gray-500">{[...listBuffer]}</ul>
                        );
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
                        listBuffer.push(<li key={lineIdx} dangerouslySetInnerHTML={{ __html: formatText(orderedMatch[2]) }} />);
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
                                <div key={lineIdx} className={`${fontSize} font-bold text-accent-text mt-3 mb-1 border-b border-gray-700/50 pb-1`} dangerouslySetInnerHTML={{ __html: formatText(headerMatch[2]) }} />
                            );
                        } else {
                            // Paragraphs
                            if (line.trim() === '') {
                                elements.push(<div key={lineIdx} className="h-2" />); // Spacer for empty lines
                            } else {
                                elements.push(<div key={lineIdx} className="min-h-[1.2em]" dangerouslySetInnerHTML={{ __html: formatText(line) }} />);
                            }
                        }
                    }
                });
                flushList(); // Flush any remaining list items

                return <div key={index}>{elements}</div>;
            })}
        </div>
    );
};

// Internal Style Button Component with Tooltip
const StyleButton: React.FC<{ id: string; label: string; icon: React.ReactNode; isActive: boolean; onClick: () => void; }> = ({ label, icon, isActive, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);
    return (
        <div className="relative flex-1 flex" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
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

export const GeminiChatNode: React.FC<NodeContentProps> = ({ node, onValueChange, onSendMessage, isChatting, t, onSelectNode, addToast }) => {
    const chatValue = useMemo(() => {
        try {
            return JSON.parse(node.value || '{}');
        } catch {
            return { messages: [], currentInput: '', style: 'general', inputHeight: 120, attachment: null };
        }
    }, [node.value]);

    const { messages = [], currentInput = '', style = 'general', inputHeight = 120, attachment = null } = chatValue;
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Resizing Refs
    const startYRef = useRef<number>(0);
    const startHeightRef = useRef<number>(0);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isChatting]);

    const handleSend = () => {
        if (!isChatting) {
            onSendMessage(node.id);
        }
    };

    const handleStyleChange = (newStyle: string) => {
        onValueChange(node.id, JSON.stringify({ ...chatValue, style: newStyle }));
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
            
            // Fallback to text if no image found in items (or browser doesn't support reading files from clipboard directly via read())
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
            // Fallback for Firefox which might block .read() without gesture or permissions, or plain text handling
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

    // --- Resizing Logic (Top Edge) ---
    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        startYRef.current = e.clientY;
        startHeightRef.current = inputHeight;
        
        document.addEventListener('mousemove', handleResizeMouseMove);
        document.addEventListener('mouseup', handleResizeMouseUp);
    };

    const handleResizeMouseMove = (e: MouseEvent) => {
        // Dragging UP decreases clientY, so delta is negative. 
        // We want dragging UP to INCREASE height.
        const delta = startYRef.current - e.clientY;
        const newHeight = Math.max(60, Math.min(500, startHeightRef.current + delta));
        
        onValueChange(node.id, JSON.stringify({ ...chatValue, inputHeight: newHeight }));
    };

    const handleResizeMouseUp = () => {
        document.removeEventListener('mousemove', handleResizeMouseMove);
        document.removeEventListener('mouseup', handleResizeMouseUp);
    };

    const styles = [
        { id: 'general', label: t('geminiChat.mode.general'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> },
        { id: 'prompt', label: t('geminiChat.mode.prompt'), icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path strokeLinecap="round" strokeLinejoin="round" d="m21 15-5-5L5 21" /></svg> },
        { id: 'script', label: t('geminiChat.mode.script'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
        { id: 'youtube', label: t('geminiChat.mode.youtube'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> }
    ];
    
    const activeLabel = styles.find(s => s.id === style)?.label;

    return (
        <div className="flex flex-col h-full">
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange} 
                accept="image/*,.txt,.pdf,.json" 
            />

            {/* Style Switcher */}
            <div className="flex bg-gray-900/50 p-1 rounded-md mb-2 space-x-1 shrink-0" onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}>
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

            {/* Chat Messages */}
            <div ref={chatContainerRef} onWheel={e => e.stopPropagation()} className="flex-grow p-2 bg-gray-900/50 rounded-md overflow-y-auto overflow-x-hidden mb-1 space-y-4 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2 opacity-50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        <span className="text-xs font-medium">{activeLabel}</span>
                    </div>
                )}
                {messages.map((msg: { role: string, content: string }, index: number) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {/* User Message: Themed Accent Color */}
                        <div className={`relative group max-w-[90%] p-3 rounded-lg select-text ${msg.role === 'user' ? 'bg-accent/40 border border-accent/30' : 'bg-gray-800 border border-gray-700'}`}>
                           {msg.role === 'model' ? <MarkdownContent content={msg.content} /> : <p className="text-sm whitespace-pre-wrap break-words text-gray-200">{msg.content}</p>}
                           
                           {msg.role === 'model' && (
                               <ActionButton
                                   title={t('node.action.copy')}
                                   onClick={(e) => {
                                       e.stopPropagation();
                                       navigator.clipboard.writeText(msg.content);
                                       addToast(t('toast.copiedToClipboard'));
                                   }}
                                   className="absolute top-2 right-2 p-1.5 bg-gray-800/80 rounded-md text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity border border-gray-600"
                               >
                                   <CopyIcon className="h-3 w-3" />
                               </ActionButton>
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
                
                {/* Resize Handle */}
                <div 
                    className="absolute top-[-4px] left-0 right-0 h-2 cursor-ns-resize z-10 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    onMouseDown={handleResizeMouseDown}
                    title="Drag to resize input"
                >
                    <div className="w-12 h-1 bg-gray-500 rounded-full"></div>
                </div>

                {/* Attachment Preview Overlay */}
                {attachment && (
                    // Attachment overlay themed
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
                    value={currentInput}
                    onChange={(e) => onValueChange(node.id, JSON.stringify({ ...chatValue, currentInput: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder={t('node.content.chatPlaceholder')}
                    onWheel={e => e.stopPropagation()}
                    onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}
                    className="w-full p-2 pr-20 bg-transparent border-none rounded-md resize-none focus:outline-none text-sm text-white placeholder-gray-400 hide-scrollbar"
                    style={{ height: `${inputHeight}px` }}
                />
                
                <div className="absolute bottom-2 right-2 flex gap-1">
                     <button 
                        onClick={handlePasteClipboard} 
                        className="p-1.5 rounded-md transition-colors duration-200 bg-gray-600 hover:bg-gray-500 text-gray-300 hover:text-white"
                        title="Paste from Clipboard"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </button>
                    
                    <button 
                        onClick={handleFileClick} 
                        className={`p-1.5 rounded-md transition-colors duration-200 ${attachment ? 'bg-accent/20 text-accent-text border border-accent/50' : 'bg-gray-600 hover:bg-gray-500 text-gray-300 hover:text-white'}`}
                        title="Attach File"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                             <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                    </button>
                    
                    <button 
                        onClick={handleSend} 
                        disabled={isChatting || (!currentInput.trim() && !attachment)} 
                        // Themed Send Button
                        className="p-1.5 bg-accent hover:bg-accent-hover rounded-md text-white disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                        title="Send"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};
