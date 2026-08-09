
import React, { useRef, useEffect, useState } from 'react';
import { MarkdownContent } from './MarkdownRenderer';
import { ActionButton } from '../../ActionButton';
import { CopyIcon } from '../../icons/AppIcons';
import { ChatMessage } from './types';
import { handleDownloadTxt, handleDownloadDoc } from './utils';

interface ChatMessageListProps {
    messages: ChatMessage[];
    isChatting: boolean;
    activeLabel: string;
    model: string;
    t: (key: string) => string;
    addToast: (msg: string, type?: any) => void;
    onImagePreview: (src: string) => void;
    onSelectionChange: (sel: Selection | null) => void;
}

// Floating Copy Button within the list scope to handle internal selection
const FloatingCopyButton: React.FC<{ 
    selection: Selection; 
    onCopy: () => void; 
    containerRef: React.RefObject<HTMLDivElement>;
    scale: number;
}> = ({ selection, onCopy, containerRef, scale }) => {
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

    useEffect(() => {
        if (!selection || selection.rangeCount === 0 || selection.toString().length === 0) {
            setPosition(null);
            return;
        }
        
        // Ensure selection is within our container
        if (containerRef.current && !containerRef.current.contains(selection.anchorNode)) {
            setPosition(null);
            return;
        }

        const range = selection.getRangeAt(0);
        const rangeRect = range.getBoundingClientRect();
        
        if (!containerRef.current) return;
        const rootRect = containerRef.current.getBoundingClientRect();

        const top = (rangeRect.top - rootRect.top) / scale - 40; 
        const left = (rangeRect.left - rootRect.left) / scale + (rangeRect.width / scale / 2);

        setPosition({ top, left });
    }, [selection, containerRef, scale]);

    if (!position) return null;

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

export const ChatMessageList: React.FC<ChatMessageListProps> = ({ 
    messages, 
    isChatting, 
    activeLabel, 
    model, 
    t, 
    addToast, 
    onImagePreview,
    onSelectionChange
}) => {
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const isUserAtBottomRef = useRef(true);
    const [selection, setSelection] = useState<Selection | null>(null);

    // Handle Scroll to track user position
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        e.stopPropagation();
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
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
    }, [messages, isChatting]); 

    // Handle Selection
    useEffect(() => {
        const handleGlobalSelection = () => {
            const sel = window.getSelection();
            if (sel && sel.toString().length > 0) {
                if (chatContainerRef.current && chatContainerRef.current.contains(sel.anchorNode)) {
                    setSelection(sel);
                    onSelectionChange(sel);
                    return;
                }
            }
            setSelection(null);
            onSelectionChange(null);
        };

        document.addEventListener('selectionchange', handleGlobalSelection);
        return () => document.removeEventListener('selectionchange', handleGlobalSelection);
    }, [onSelectionChange]);

    const handleFloatingCopy = () => {
        if (selection) {
            navigator.clipboard.writeText(selection.toString());
            addToast(t('toast.copiedToClipboard'));
            selection.removeAllRanges();
            setSelection(null);
            onSelectionChange(null);
        }
    };

    const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

    return (
        <div className="relative flex-grow min-h-0 flex flex-col mb-1">
             {selection && <FloatingCopyButton selection={selection} onCopy={handleFloatingCopy} containerRef={chatContainerRef} scale={1} />}
             
             <div 
                ref={chatContainerRef} 
                onWheel={e => e.stopPropagation()}
                onScroll={handleScroll} 
                className="flex-grow p-2 bg-gray-900/50 rounded-md overflow-y-auto overflow-x-hidden space-y-4 custom-scrollbar select-text cursor-text"
                onMouseDown={stopPropagation}
                onMouseMove={stopPropagation}
                onMouseUp={stopPropagation}
                onClick={stopPropagation}
            >
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2 opacity-50 select-none pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        <span className="text-xs font-medium">{activeLabel}</span>
                        <span className="text-[10px] text-gray-600">{model === 'gemini-3.1-pro-preview' || model === 'gemini-3-pro-preview' ? 'Pro 3.1' : 'Flash 3.6'}</span>
                    </div>
                )}
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`relative group max-w-[90%] p-3 rounded-lg select-text flex gap-2 flex-col ${msg.role === 'user' ? 'bg-accent text-white shadow-md' : 'bg-gray-800 border border-gray-700'}`}>
                           
                           {/* Attachments */}
                           {msg.images && msg.images.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                     {msg.images.map((imgSrc, imgIdx) => (
                                         <div key={imgIdx} className="w-24 h-24 rounded overflow-hidden border border-white/20 bg-black/50 cursor-pointer" onClick={(e) => { e.stopPropagation(); onImagePreview(imgSrc); }}>
                                             <img src={imgSrc} alt="attachment" className="w-full h-full object-cover" />
                                         </div>
                                     ))}
                                </div>
                           )}

                           <div className="flex gap-2 w-full">
                               <div className="min-w-0 flex-grow">
                                   {msg.role === 'model' ? (
                                       <MarkdownContent content={msg.content} /> 
                                   ) : (
                                       <p className={`text-sm whitespace-pre-wrap break-words select-text ${msg.role === 'user' ? 'text-white' : 'text-gray-200'}`}>
                                           {msg.content}
                                       </p>
                                   )}
                                   
                                   {/* Grounding Sources */}
                                   {msg.groundingMetadata?.groundingChunks?.length > 0 && (
                                       <div className="mt-3 pt-2 border-t border-gray-700/50">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Sources</span>
                                            <div className="flex flex-wrap gap-2">
                                                {msg.groundingMetadata.groundingChunks.map((chunk: any, i: number) => {
                                                    if (chunk.web) {
                                                        return (
                                                            <a 
                                                                key={i} 
                                                                href={chunk.web.uri} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="text-[10px] bg-gray-900/50 hover:bg-gray-700 text-cyan-400 px-2 py-1 rounded border border-gray-700 hover:border-cyan-500/50 transition-colors truncate max-w-[150px]"
                                                                title={chunk.web.title}
                                                            >
                                                                {chunk.web.title || chunk.web.uri}
                                                            </a>
                                                        );
                                                    }
                                                    return null;
                                                })}
                                            </div>
                                       </div>
                                   )}
                               </div>
                               
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
        </div>
    );
};
