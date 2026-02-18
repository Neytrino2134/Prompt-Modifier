
import React, { useRef, useLayoutEffect } from 'react';
import { Tooltip } from '../../Tooltip';
import { ChatAttachment } from './types';
import { GoogleSearchIcon } from '../../../components/icons/AppIcons';

interface ChatInputProps {
    currentInput: string;
    attachments: ChatAttachment[];
    isChatting: boolean;
    useSearch: boolean;
    onInputChange: (val: string) => void;
    onSend: () => void;
    onAttachmentsChange: (atts: ChatAttachment[]) => void;
    onPasteClipboard: () => void;
    onAddFileClick: () => void;
    onToggleSearch: () => void;
    t: (key: string) => string;
    onFocus: () => void;
    onMouseDown: (e: React.MouseEvent) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
    currentInput,
    attachments,
    isChatting,
    useSearch,
    onInputChange,
    onSend,
    onAttachmentsChange,
    onPasteClipboard,
    onAddFileClick,
    onToggleSearch,
    t,
    onFocus,
    onMouseDown
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    // Handle pasting directly into the textarea (Ctrl+V)
    const handleInputPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData.items;
        let hasImage = false;
        const newAttachments = [...attachments];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/')) {
                // Prevent the image data (or file name) from being pasted as text
                e.preventDefault();
                
                const file = item.getAsFile();
                if (file) {
                     const reader = new FileReader();
                     await new Promise<void>((resolve) => {
                         reader.onload = (ev) => {
                             const dataUrl = ev.target?.result as string;
                             const fileName = file.name || "pasted_image.png";
                             const fileType = file.type || "image/png";
                             newAttachments.push({ name: fileName, type: fileType, data: dataUrl });
                             hasImage = true;
                             resolve();
                         };
                         reader.readAsDataURL(file);
                     });
                }
            }
        }

        if (hasImage) {
             onAttachmentsChange(newAttachments);
        }
        // If no image, default text paste behavior proceeds automatically by browser
    };

    const handleRemoveAttachment = (index: number) => {
        const newAttachments = [...attachments];
        newAttachments.splice(index, 1);
        onAttachmentsChange(newAttachments);
    };

    const stopPropagation = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <div className="relative w-full group flex-shrink-0 bg-gray-700 rounded-md border-none focus-within:ring-1 focus-within:ring-node-selected transition-shadow">
            
            {/* Attachment Preview Overlay (Stack) */}
            {attachments && attachments.length > 0 && (
                <div className="absolute -top-16 left-2 flex gap-2 max-w-full overflow-x-auto p-1 custom-scrollbar z-20">
                     {attachments.map((att, idx) => (
                         <div key={idx} className="relative group/att w-12 h-12 bg-gray-800 rounded border border-gray-600 flex-shrink-0">
                             <img src={att.data} alt="thumb" className="w-full h-full object-cover rounded opacity-80 group-hover/att:opacity-100" />
                             <button 
                                 onClick={(e) => { e.stopPropagation(); handleRemoveAttachment(idx); }}
                                 className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] hover:bg-red-600 shadow-sm"
                             >
                                 &times;
                             </button>
                         </div>
                     ))}
                </div>
            )}

            <textarea
                ref={textareaRef}
                value={currentInput}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={(e) => { 
                     e.stopPropagation(); // Stop hotkeys
                     if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } 
                }}
                onKeyUp={e => e.stopPropagation()}
                onPaste={handleInputPaste} 
                placeholder={t('node.content.chatPlaceholder')}
                onWheel={e => e.stopPropagation()}
                onMouseDown={onMouseDown}
                onMouseMove={stopPropagation}
                onMouseUp={stopPropagation}
                onFocus={onFocus}
                // Styles for auto-grow behavior (min-h: 120px, max-h: 200px)
                className="w-full p-2 pr-12 bg-transparent border-none rounded-md resize-none focus:outline-none text-sm text-white placeholder-gray-400"
                style={{ minHeight: '120px', maxHeight: '200px', overflowY: 'hidden' }}
            />
            
            {/* Actions (Vertical Column) */}
            <div className="absolute bottom-2 right-2 flex flex-col gap-2 items-center">
                 <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Tooltip content="Вставить из буфера" position="left">
                         <button 
                            onClick={onPasteClipboard} 
                            className="p-1.5 rounded-md transition-colors duration-200 bg-gray-600 hover:bg-gray-500 text-gray-300 hover:text-white"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 14l2 2 4-4" />
                            </svg>
                        </button>
                    </Tooltip>
                    
                    <Tooltip content="Прикрепить файл" position="left">
                        <button 
                            onClick={onAddFileClick} 
                            className={`p-1.5 rounded-md transition-colors duration-200 ${attachments.length > 0 ? 'bg-accent/20 text-accent-text border border-accent/50' : 'bg-gray-600 hover:bg-gray-500 text-gray-300 hover:text-white'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                 <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                        </button>
                    </Tooltip>

                    <Tooltip content={useSearch ? "Google Search ON" : "Google Search OFF"} position="left">
                        <button 
                            onClick={onToggleSearch} 
                            className={`p-1.5 rounded-md transition-colors duration-200 ${useSearch ? 'bg-blue-600 text-white' : 'bg-gray-600 hover:bg-gray-500 text-gray-400 hover:text-white'}`}
                        >
                            <GoogleSearchIcon className="h-5 w-5" />
                        </button>
                    </Tooltip>
                 </div>
                
                <Tooltip content="Отправить" position="left">
                    <button 
                        onClick={onSend} 
                        disabled={isChatting || (!currentInput.trim() && attachments.length === 0)} 
                        className="p-1.5 bg-accent hover:bg-accent-hover rounded-md text-white disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-200 shadow-md"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    </button>
                </Tooltip>
            </div>
        </div>
    );
};
