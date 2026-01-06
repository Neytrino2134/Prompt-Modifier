
import React, { useState, useCallback, useRef } from 'react';
import type { Node, Tab } from '../types';
import { GoogleGenAI, Chat } from "@google/genai";

interface UseGeminiConversationProps {
    nodes: Node[];
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    setError: (error: string | null) => void;
    t: (key: string) => string;
    getUpstreamNodeValues: (nodeId: string, handleId?: string, currentNodes?: Node[], optimizedForUI?: boolean) => (string | { base64ImageData: string, mimeType: string })[];
    activeTabId: string;
    setTabs: React.Dispatch<React.SetStateAction<Tab[]>>;
}

const PERSONAS: Record<string, string> = {
    general: `You are Gemini, a versatile and helpful AI assistant integrated into the "Prompt Modifier" application.
    
**Context:**
You are operating within a node-based visual editor used for creating and refining workflows for Generative AI.

**Goal:**
Assist the user with general questions, brainstorming, coding, or any other topic they raise. Be concise, professional, and helpful.`,

    prompt: `You are an **Expert Image Prompt Engineer**. Your sole purpose is to help the user create the perfect text-to-image prompts (for Midjourney, Stable Diffusion, Imagen, etc.).

**Behaviors:**
1.  **Analyze:** When given a vague idea, analyze it for artistic style, lighting, composition, and medium.
2.  **Enhance:** Rewrite simple prompts into rich, descriptive, and evocative prompts. Use keywords effectively.
3.  **Format:** ALWAYS wrap your final suggested prompt inside a markdown code block labeled 'prompt'.
    Example:
    \`\`\`prompt
    A futuristic city with neon lights, cinematic lighting, hyper-realistic, 8k
    \`\`\`
`,

    script: `You are a **Professional Screenwriter and Story Consultant**. You excel at structuring narratives, developing characters, and writing screenplay format.

**Behaviors:**
1.  **Ideation:** Help generate loglines, plot twists, and character arcs.
2.  **Formatting:** When asked to write a scene, use standard screenplay format elements (Sluglines, Action, Character, Dialogue).
3.  **Advice:** Offer constructive feedback on pacing, dialogue, and "show, don't tell".
`,

    youtube: `You are a **YouTube Growth Strategist and Analytics Expert**. You specialize in channel growth, video retention, and click-through rates (CTR).

**Behaviors:**
1.  **Titles & Thumbs:** Suggest viral-worthy titles and thumbnail concepts that trigger curiosity or emotion.
2.  **Retention:** Analyze script ideas for hooks, pacing, and retention spikes.
3.  **Strategy:** Provide advice on SEO, tags, trends, and audience engagement.
4.  **Tone:** Be analytical, data-driven, and direct.
`
};

export const useGeminiConversation = ({ nodes, setNodes, setError, t, getUpstreamNodeValues, activeTabId, setTabs }: UseGeminiConversationProps) => {
    const [isChatting, setIsChatting] = useState<string | null>(null);
    // Store both the chat instance and the style it was created with
    const chatSessions = useRef<Map<string, { chat: Chat; style: string }>>(new Map());

    const activeTabIdRef = useRef(activeTabId);
    React.useEffect(() => {
        activeTabIdRef.current = activeTabId;
    }, [activeTabId]);

    const updateNodeInStorage = useCallback((targetTabId: string, nodeId: string, valueUpdater: (prevVal: any) => any) => {
        const safeParse = (val: string) => {
            try { return JSON.parse(val || '{}'); } catch { return val; } 
        };

        if (activeTabIdRef.current === targetTabId) {
            setNodes(nds => nds.map(n => {
                if (n.id === nodeId) {
                    const currentVal = safeParse(n.value);
                    const newVal = valueUpdater(currentVal);
                    const finalValue = JSON.stringify(newVal);
                    return { ...n, value: finalValue };
                }
                return n;
            }));
        } else {
            setTabs(prevTabs => prevTabs.map(tab => {
                if (tab.id === targetTabId) {
                    const newNodes = tab.state.nodes.map(n => {
                        if (n.id === nodeId) {
                            const currentVal = safeParse(n.value);
                            const newVal = valueUpdater(currentVal);
                            const finalValue = JSON.stringify(newVal);
                            return { ...n, value: finalValue };
                        }
                        return n;
                    });
                    return { ...tab, state: { ...tab.state, nodes: newNodes }};
                }
                return tab;
            }));
        }
    }, [setNodes, setTabs]);

    const handleSendMessage = useCallback(async (nodeId: string) => {
        const currentTabId = activeTabIdRef.current;
        const node = nodes.find(n => n.id === nodeId);
        if (!node || node.type !== 'GEMINI_CHAT') return;
    
        const initialParsed = JSON.parse(node.value || '{}');
        let { messages = [], currentInput, style = 'general' } = initialParsed;

        if (!currentInput || !currentInput.trim()) {
            const upstreamTexts = getUpstreamNodeValues(nodeId).filter(v => typeof v === 'string') as string[];
            if (upstreamTexts.length > 0) {
                currentInput = upstreamTexts.join('\n');
            }
        }
        
        if (!currentInput || !currentInput.trim()) return;
    
        setIsChatting(nodeId);
        setError(null);
    
        const newMessages = [...messages, { role: 'user', content: currentInput }];
        
        // Update state to show user message immediately
        updateNodeInStorage(currentTabId, nodeId, (prev) => ({ ...prev, messages: newMessages, currentInput: '' }));
    
        try {
            // Check if session exists AND if the style matches
            const existingSession = chatSessions.current.get(nodeId);
            
            if (!existingSession || existingSession.style !== style) {
                // Initialize new session with specific persona
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const systemInstruction = PERSONAS[style] || PERSONAS['general'];
                
                const chat = ai.chats.create({ 
                    model: 'gemini-3-flash-preview',
                    config: {
                        systemInstruction: systemInstruction,
                    },
                });
                
                // If switching styles, we might want to provide context from previous messages manually,
                // but usually switching personas implies a context switch. 
                // For now, we start fresh context-wise for the model, but keep history in UI.
                
                chatSessions.current.set(nodeId, { chat, style });
            }

            const session = chatSessions.current.get(nodeId)!;
            
            const response = await session.chat.sendMessage({ message: currentInput });
            const modelResponse = response.text || "";

            const promptMatch = modelResponse.match(/```prompt\n([\s\S]*?)\n```/);
            const extractedPrompt = promptMatch ? promptMatch[1].trim() : '';
    
            const finalMessages = [...newMessages, { role: 'model', content: modelResponse }];
            
            updateNodeInStorage(currentTabId, nodeId, (prev) => ({ 
                ...prev, 
                messages: finalMessages, 
                currentInput: '', 
                lastPrompt: extractedPrompt || prev.lastPrompt 
            }));
    
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsChatting(null);
        }
    }, [nodes, setError, t, getUpstreamNodeValues, updateNodeInStorage]);

    const handleRefreshChat = useCallback((nodeId: string) => {
        if (chatSessions.current.has(nodeId)) {
            chatSessions.current.delete(nodeId);
        }
        updateNodeInStorage(activeTabIdRef.current, nodeId, (prev) => ({ messages: [], currentInput: '', lastPrompt: '', style: prev.style || 'general' }));
    }, [updateNodeInStorage]);

    return {
        isChatting,
        handleSendMessage,
        handleRefreshChat,
    };
};
