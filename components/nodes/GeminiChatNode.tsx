
import React, { useMemo, useRef } from 'react';
import type { NodeContentProps } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { CHAT_STYLES } from './gemini-chat/constants';
import { ChatHeader } from './gemini-chat/ChatHeader';
import { ChatMessageList } from './gemini-chat/ChatMessageList';
import { ChatInput } from './gemini-chat/ChatInput';
import { ChatNodeState } from './gemini-chat/types';

export const GeminiChatNodeComponent: React.FC<NodeContentProps> = ({ node, onValueChange, onSendMessage, isChatting, t, onSelectNode, addToast, setImageViewer }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const chatValue = useMemo<ChatNodeState>(() => {
        try {
            const val = JSON.parse(node.value || '{}');
            // Ensure attachments array exists if migration from old single attachment
            if (val.attachment && !val.attachments) {
                val.attachments = [val.attachment];
                delete val.attachment;
            }
            let model = val.model || 'gemini-3.6-flash';
            if (model === 'gemini-3-flash-preview') model = 'gemini-3.6-flash';
            if (model === 'gemini-3-pro-preview') model = 'gemini-3.1-pro-preview';
            return {
                messages: val.messages || [],
                currentInput: val.currentInput || '',
                style: val.style || 'general',
                attachments: val.attachments || [],
                model,
                useSearch: val.useSearch || false
            };
        } catch {
            return { messages: [], currentInput: '', style: 'general', attachments: [], model: 'gemini-3.6-flash', useSearch: false };
        }
    }, [node.value]);

    const { messages, currentInput, style, attachments, model, useSearch } = chatValue;

    const handleValueUpdate = (updates: Partial<ChatNodeState>) => {
        onValueChange(node.id, JSON.stringify({ ...chatValue, ...updates }));
    };

    const handleSend = () => {
        if (!isChatting) {
            onSendMessage(node.id);
        }
    };

    const handleStyleChange = (newStyle: string) => {
        handleValueUpdate({ style: newStyle });
    };

    const handleModelChange = (newModel: string) => {
        handleValueUpdate({ model: newModel });
    };

    const handleToggleSearch = () => {
        handleValueUpdate({ useSearch: !useSearch });
    };
    
    const handleFileClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newAttachments = [...attachments];

        for (const file of Array.from(files) as File[]) {
             const reader = new FileReader();
             await new Promise<void>((resolve) => {
                 reader.onload = (ev) => {
                     const dataUrl = ev.target?.result as string;
                     newAttachments.push({
                         name: file.name,
                         type: file.type,
                         data: dataUrl
                     });
                     resolve();
                 };
                 reader.readAsDataURL(file);
             });
        }
        
        handleValueUpdate({ attachments: newAttachments });
        if (addToast) addToast(`${files.length} file(s) attached`, "success");
        e.target.value = ''; // Reset
    };

    const handlePasteClipboard = async () => {
        try {
            const items = await navigator.clipboard.read() as any; 
            let hasImage = false;
            const newAttachments = [...attachments];

            for (const item of items) {
                const imageType = item.types.find((t: any) => t.startsWith('image/'));
                if (imageType) {
                    const blob = (await item.getType(imageType)) as Blob;
                    const file: File = new File([blob], "pasted_image.png", { type: blob.type });
                    
                    const reader = new FileReader();
                    await new Promise<void>((resolve) => {
                        reader.onload = (ev) => {
                            const dataUrl = ev.target?.result as string;
                            newAttachments.push({ name: file.name, type: file.type, data: dataUrl });
                            hasImage = true;
                            resolve();
                        };
                        reader.readAsDataURL(file);
                    });
                }
            }
            
            if (hasImage) {
                handleValueUpdate({ attachments: newAttachments });
                if (addToast) addToast(t('toast.pastedFromClipboard'), "success");
                return;
            }
            
            // Fallback to text
            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                     handleValueUpdate({ currentInput: currentInput + text });
                     if (addToast) addToast(t('toast.pastedFromClipboard'), "success");
                }
            } catch (err) {}

        } catch (e) {
            // Fallback for Firefox
            try {
                const text = await navigator.clipboard.readText();
                 if (text) {
                     handleValueUpdate({ currentInput: currentInput + text });
                 }
            } catch (err) {
                if (addToast) addToast(t('toast.pasteFailed'), "error");
            }
        }
    };
    
    const activeLabel = CHAT_STYLES(t).find(s => s.id === style)?.label || style;

    return (
        <div className="flex flex-col h-full relative">
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange} 
                accept="image/*,.txt,.pdf,.json" 
                multiple 
            />
            
            <ChatHeader 
                currentStyle={style} 
                currentModel={model} 
                isChatting={isChatting} 
                onStyleChange={handleStyleChange} 
                onModelChange={handleModelChange}
                onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}
            />

            <ChatMessageList 
                messages={messages}
                isChatting={isChatting}
                activeLabel={activeLabel}
                model={model}
                t={t}
                addToast={addToast}
                onImagePreview={(src) => setImageViewer({ sources: [{ src, frameNumber: 0 }], initialIndex: 0 })}
                onSelectionChange={() => {}} // Could be used to lift selection state if needed
            />

            <ChatInput 
                currentInput={currentInput}
                attachments={attachments}
                isChatting={isChatting}
                useSearch={useSearch}
                onInputChange={(val) => handleValueUpdate({ currentInput: val })}
                onSend={handleSend}
                onAttachmentsChange={(atts) => handleValueUpdate({ attachments: atts })}
                onPasteClipboard={handlePasteClipboard}
                onAddFileClick={handleFileClick}
                onToggleSearch={handleToggleSearch}
                t={t}
                onFocus={onSelectNode}
                onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}
            />
        </div>
    );
};

export const GeminiChatNode = React.memo(GeminiChatNodeComponent);
