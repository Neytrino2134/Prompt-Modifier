import React, { useState, useCallback, useRef } from 'react';
import type { Node, Tab } from '../types';
import { GoogleGenAI, Chat } from "@google/genai";
import { getApiKey } from '../services/geminiService'; // Import the key getter

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
`,

    developer: `You are an **Expert Software Developer and Solutions Architect**. You specialize in writing clean, efficient, and well-documented code.

**Behaviors:**
1.  **Code First:** Prioritize providing code solutions. When code is requested, ensure it is complete and functional.
2.  **Best Practices:** Follow standard conventions, design patterns, and security best practices.
3.  **Explain:** Briefly explain the logic, algorithms, and libraries used.
4.  **Debug:** If analyzing an error, explain the root cause and provide a specific fix.
5.  **Format:** Always use markdown code blocks for code outputs.
`,

    friend: `You are a **Close Friend and Confidant**. You are NOT a formal AI assistant. Your goal is to provide emotional support, companionship, and a safe space for the user.

**Persona & Tone:**
- **Human-like:** Speak naturally, casually, and warmly. Use colloquialisms, emojis (sparingly but effectively), and a conversational rhythm. Avoid robotic phrases like "As an AI..." or "I understand".
- **Sincere & Interested:** Always ask follow-up questions. "How are you really feeling?", "What happened next?", "That sounds tough, want to talk about it?".
- **Supportive:** Be on the user's side. Validate their feelings.

**Hidden Role (Psychological First Aid):**
- Act as a subtle, non-clinical psychologist.
- If the user is in a crisis, anxious, or down, use techniques like active listening and validation.
- Help them reframe negative thoughts gently, not by lecturing, but by asking perspective-shifting questions.
- If they are overwhelmed, help them break down problems into small steps.
- **Crisis:** If the user expresses self-harm or severe danger, prioritize their safety gently but firmly, suggesting professional help, but remain their friend.

**Example Interaction:**
User: "I messed up everything today."
You: "Oh no, what happened? 😔 I'm here for you. Tell me everything, maybe we can figure it out together or just vent."
`
};

export const useGeminiConversation = ({ nodes, setNodes, setError, t, getUpstreamNodeValues, activeTabId, setTabs }: UseGeminiConversationProps) => {
    const [isChatting, setIsChatting] = useState<string | null>(null);
    // Store both the chat instance, the style, and the model it was created with
    const chatSessions = useRef<Map<string, { chat: Chat; style: string; model: string }>>(new Map());

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
        let { messages = [], currentInput, style = 'general', model = 'gemini-3-flash-preview' } = initialParsed;
        
        // Handle Attachments: Ensure array structure
        const attachments = initialParsed.attachments || (initialParsed.attachment ? [initialParsed.attachment] : []);

        if (!currentInput || !currentInput.trim()) {
            const upstreamTexts = getUpstreamNodeValues(nodeId).filter(v => typeof v === 'string') as string[];
            if (upstreamTexts.length > 0) {
                currentInput = upstreamTexts.join('\n');
            }
        }
        
        // Must have either text OR attachments to send
        if ((!currentInput || !currentInput.trim()) && attachments.length === 0) return;
    
        setIsChatting(nodeId);
        setError(null);
    
        // Add User Message to history (including images for display)
        const newMessages = [...messages, { 
            role: 'user', 
            content: currentInput,
            images: attachments.map((a: any) => a.data) // Store base64 data for history display
        }];
        
        // Update state to show user message immediately
        updateNodeInStorage(currentTabId, nodeId, (prev) => ({ 
            ...prev, 
            messages: newMessages, 
            currentInput: '',
            attachments: [] // Clear attachments after sending
        }));
    
        try {
            // Check if session exists AND if the style/model matches
            const existingSession = chatSessions.current.get(nodeId);
            
            if (!existingSession || existingSession.style !== style || existingSession.model !== model) {
                // Initialize new session with specific persona and model
                const apiKey = getApiKey();
                if (!apiKey) throw new Error("API Key is missing.");

                const ai = new GoogleGenAI({ apiKey });
                const systemInstruction = PERSONAS[style] || PERSONAS['general'];
                
                const chat = ai.chats.create({ 
                    model: model,
                    config: {
                        systemInstruction: systemInstruction,
                    },
                });
                
                chatSessions.current.set(nodeId, { chat, style, model });
            }

            const session = chatSessions.current.get(nodeId)!;
            
            // Construct Payload with Text + Images
            const parts: any[] = [];
            if (currentInput) {
                parts.push({ text: currentInput });
            }
            
            attachments.forEach((att: any) => {
                 if (att.data && att.data.startsWith('data:')) {
                     const base64 = att.data.split(',')[1];
                     parts.push({ inlineData: { mimeType: att.type, data: base64 } });
                 }
            });
            
            // Send Message using structured parts
            const response = await session.chat.sendMessage({ message: parts });
            
            const modelResponse = response.text || "";

            const promptMatch = modelResponse.match(/```prompt\n([\s\S]*?)\n```/);
            const extractedPrompt = promptMatch ? promptMatch[1].trim() : '';
    
            const finalMessages = [...newMessages, { role: 'model', content: modelResponse }];
            
            updateNodeInStorage(currentTabId, nodeId, (prev) => ({ 
                ...prev, 
                messages: finalMessages, 
                currentInput: '', 
                attachments: [], // Ensure cleared in final state
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
        updateNodeInStorage(activeTabIdRef.current, nodeId, (prev) => ({ 
            messages: [], 
            currentInput: '', 
            lastPrompt: '', 
            attachments: [],
            style: prev.style || 'general',
            model: prev.model || 'gemini-3-flash-preview' // Preserve model
        }));
    }, [updateNodeInStorage]);

    return {
        isChatting,
        handleSendMessage,
        handleRefreshChat,
    };
};