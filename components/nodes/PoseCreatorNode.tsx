
import React, { useRef, useState, useEffect, useMemo } from 'react';
import type { NodeContentProps, Point } from '../../types';
import { INITIAL_JOINTS, BONES, solveIK, Joint } from './pose-creator/RigLogic';
import CustomSelect from '../CustomSelect';
import { ActionButton } from '../ActionButton';
import { CopyIcon } from '../icons/AppIcons';
import { GoogleGenAI, Type } from "@google/genai";

export const PoseCreatorNode: React.FC<NodeContentProps> = ({ 
    node, 
    onValueChange, 
    t, 
    onSelectNode, 
    addToast, 
    onDownloadImageFromUrl, 
    onCopyImageToClipboard 
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Node Value Parsing
    const state = useMemo(() => {
        try {
            const parsed = JSON.parse(node.value || '{}');
            return {
                joints: (parsed.joints && parsed.joints.length > 0) ? parsed.joints : JSON.parse(JSON.stringify(INITIAL_JOINTS)),
                aspectRatio: parsed.aspectRatio || '1:1',
                resolution: parsed.resolution || '1K',
                renderedImage: parsed.renderedImage || null,
                aiPrompt: parsed.aiPrompt || ''
            };
        } catch {
            return { joints: JSON.parse(JSON.stringify(INITIAL_JOINTS)), aspectRatio: '1:1', resolution: '1K', renderedImage: null, aiPrompt: '' };
        }
    }, [node.value]);

    const [joints, setJoints] = useState<Joint[]>(state.joints);
    const [draggingJointId, setDraggingJointId] = useState<number | null>(null);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    // Update local joints if external value changes (e.g. undo/redo or load)
    useEffect(() => {
        setJoints(state.joints);
    }, [state.joints]);

    // Sync local state to persistent node value
    const persist = (updatedJoints: Joint[], rendered?: string, extra?: Partial<typeof state>) => {
        const payload = {
            ...state,
            ...extra,
            joints: updatedJoints,
            renderedImage: rendered !== undefined ? rendered : state.renderedImage
        };
        onValueChange(node.id, JSON.stringify(payload));
    };

    // --- AI Generation Logic ---
    const handleAIGenerate = async () => {
        if (!state.aiPrompt.trim() || isGeneratingAI) return;
        
        setIsGeneratingAI(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Generate a 2D character pose for the following description: "${state.aiPrompt}".
                
                The rig uses 18 joints (0-17): 0:Nose, 1:Neck, 2:RShoulder, 3:RElbow, 4:RWrist, 5:LShoulder, 6:LElbow, 7:LWrist, 8:RHip, 9:RKnee, 10:RAnkle, 11:LHip, 12:LKnee, 13:LAnkle, 14:REye, 15:LEye, 16:REar, 17:LEar.
                
                Coordinates x and y must be between 0.0 (top/left) and 1.0 (bottom/right).
                Make sure the pose is dynamic, anatomically plausible, and fits within the 0-1 range.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            joints: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        id: { type: Type.INTEGER },
                                        name: { type: Type.STRING },
                                        x: { type: Type.NUMBER },
                                        y: { type: Type.NUMBER },
                                        color: { type: Type.STRING }
                                    },
                                    required: ['id', 'x', 'y']
                                }
                            }
                        },
                        required: ['joints']
                    }
                }
            });

            const result = JSON.parse(response.text);
            if (result.joints && Array.isArray(result.joints)) {
                // Merge AI coordinates with original metadata (colors, names) to maintain rig stability
                const newJoints = joints.map(original => {
                    const aiJoint = result.joints.find((j: any) => j.id === original.id);
                    if (aiJoint) {
                        return { ...original, x: aiJoint.x, y: aiJoint.y };
                    }
                    return original;
                });
                setJoints(newJoints);
                persist(newJoints);
                addToast?.("AI Pose Generated", "success");
            }
        } catch (error) {
            console.error("AI Pose Generation failed:", error);
            addToast?.("AI Generation failed", "error");
        } finally {
            setIsGeneratingAI(false);
        }
    };

    // --- Rendering Logic ---
    const drawRig = (ctx: CanvasRenderingContext2D, width: number, height: number, isRendering: boolean = false) => {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);

        BONES.forEach(bone => {
            const from = joints.find(j => j.id === bone.from);
            const to = joints.find(j => j.id === bone.to);
            if (from && to) {
                ctx.beginPath();
                ctx.strokeStyle = bone.color;
                ctx.lineWidth = isRendering ? 6 : 2;
                ctx.moveTo(from.x * width, from.y * height);
                ctx.lineTo(to.x * width, to.y * height);
                ctx.stroke();
            }
        });

        if (!isRendering) {
            joints.forEach(joint => {
                ctx.beginPath();
                ctx.fillStyle = joint.color;
                ctx.arc(joint.x * width, joint.y * height, draggingJointId === joint.id ? 8 : 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 1;
                ctx.stroke();
            });
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const rect = canvas.parentElement?.getBoundingClientRect();
        if (rect) {
            canvas.width = rect.width;
            canvas.height = rect.height;
        }

        drawRig(ctx, canvas.width, canvas.height);
    }, [joints, draggingJointId]);

    // --- Interaction ---
    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onSelectNode) onSelectNode();
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) / canvas.width;
        const my = (e.clientY - rect.top) / canvas.height;

        const threshold = 0.05;
        const hit = joints.find(j => Math.hypot(j.x - mx, j.y - my) < threshold);
        if (hit) {
            setDraggingJointId(hit.id);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggingJointId === null) return;
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) / canvas.width;
        const my = (e.clientY - rect.top) / canvas.height;

        const newJoints = [...joints];
        const joint = newJoints.find(j => j.id === draggingJointId);
        if (!joint) return;

        const isEndEffector = [4, 7, 10, 13].includes(draggingJointId);
        
        if (isEndEffector) {
            let chainIndices: number[] = [];
            if (draggingJointId === 4) chainIndices = [1, 2, 3, 4];
            else if (draggingJointId === 7) chainIndices = [1, 5, 6, 7];
            else if (draggingJointId === 10) chainIndices = [1, 8, 9, 10];
            else if (draggingJointId === 13) chainIndices = [1, 11, 12, 13];
            
            const chain = chainIndices.map(idx => newJoints.find(j => j.id === idx)!);
            solveIK(chain, { x: mx, y: my });
        } else {
            joint.x = mx;
            joint.y = my;
        }

        setJoints(newJoints);
    };

    const handleMouseUp = () => {
        if (draggingJointId !== null) {
            setDraggingJointId(null);
            persist(joints);
        }
    };

    const handleRender = () => {
        const renderCanvas = document.createElement('canvas');
        const sizeMap: Record<string, number> = { '720p': 1280, '1080p': 1920, '1K': 1024, '2K': 2048, '4K': 4096 };
        const baseSize = sizeMap[state.resolution] || 1024;
        
        const [wRatio, hRatio] = state.aspectRatio.split(':').map(Number);
        const ratio = wRatio / hRatio;

        let rw = baseSize, rh = baseSize;
        if (ratio > 1) {
            rh = baseSize / ratio;
        } else {
            rw = baseSize * ratio;
        }
        
        renderCanvas.width = rw;
        renderCanvas.height = rh;
        const ctx = renderCanvas.getContext('2d');
        if (ctx) {
            drawRig(ctx, rw, rh, true);
            const dataUrl = renderCanvas.toDataURL('image/png');
            persist(joints, dataUrl);
            if (addToast) addToast("Pose Rendered", 'success');
        }
    };

    const handleReset = () => {
        const resetJoints = JSON.parse(JSON.stringify(INITIAL_JOINTS));
        setJoints(resetJoints);
        persist(resetJoints, null as any);
    };

    const handleLoadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const parsed = JSON.parse(text);
                if (parsed.joints && Array.isArray(parsed.joints)) {
                    setJoints(parsed.joints);
                    onValueChange(node.id, JSON.stringify({ ...state, ...parsed }));
                    if (addToast) addToast("Pose Loaded", 'success');
                } else {
                    throw new Error("Invalid pose format");
                }
            } catch (err) {
                if (addToast) addToast("Failed to load pose: Invalid JSON", 'error');
            }
        };
        reader.readAsText(file);
        if (e.target) e.target.value = '';
    };

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (state.renderedImage && onDownloadImageFromUrl) {
            onDownloadImageFromUrl(state.renderedImage, 0, "Pose Reference");
        }
    };

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (state.renderedImage && onCopyImageToClipboard) {
            onCopyImageToClipboard(state.renderedImage);
        }
    };

    const aspectRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"];
    const resolutions = ["720p", "1080p", "1K", "2K", "4K"];

    return (
        <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden" onWheel={e => e.stopPropagation()}>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
            
            {/* AI Generation Bar */}
            <div className="p-2 bg-gray-800 border-b border-gray-700 flex gap-2 shrink-0">
                <input 
                    type="text"
                    value={state.aiPrompt}
                    onChange={(e) => persist(joints, undefined, { aiPrompt: e.target.value })}
                    onKeyDown={(e) => { if(e.key === 'Enter') handleAIGenerate(); }}
                    placeholder="Describe pose (e.g. 'Hero landing', 'Sitting on a bench')..."
                    className="flex-grow bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:border-cyan-500 outline-none"
                    onMouseDown={e => e.stopPropagation()}
                />
                <button 
                    onClick={handleAIGenerate}
                    disabled={isGeneratingAI || !state.aiPrompt.trim()}
                    className="px-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 rounded text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                >
                    {isGeneratingAI ? (
                         <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : '✨ AI'}
                </button>
            </div>

            {/* Control Bar */}
            <div className="p-2 border-b border-gray-700 flex justify-between items-center bg-gray-800 gap-2 shrink-0">
                <div className="flex gap-2">
                    <div className="w-24">
                        <CustomSelect 
                            value={state.aspectRatio} 
                            onChange={(v) => onValueChange(node.id, JSON.stringify({...state, aspectRatio: v}))}
                            options={aspectRatios.map(r => ({ value: r, label: r }))}
                        />
                    </div>
                    <div className="w-24">
                        <CustomSelect 
                            value={state.resolution} 
                            onChange={(v) => onValueChange(node.id, JSON.stringify({...state, resolution: v}))}
                            options={resolutions.map(r => ({ value: r, label: r }))}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {state.renderedImage && (
                        <>
                            <ActionButton title={t('node.action.copy')} onClick={handleCopy}>
                                <CopyIcon className="h-4 w-4" />
                            </ActionButton>
                            <ActionButton title={t('node.action.download')} onClick={handleDownload}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </ActionButton>
                            <div className="w-px h-4 bg-gray-700 mx-1"></div>
                        </>
                    )}
                    <button onClick={handleLoadClick} className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300">Load</button>
                    <button onClick={handleReset} className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300">Reset</button>
                    <button onClick={handleRender} className="p-2 bg-cyan-600 hover:bg-cyan-700 rounded text-xs font-bold text-white uppercase tracking-wider">Render</button>
                </div>
            </div>

            {/* Interactive Area */}
            <div ref={containerRef} className="flex-grow relative bg-black min-h-0">
                <canvas 
                    ref={canvasRef}
                    className="w-full h-full cursor-crosshair block"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                />
                
                {state.renderedImage && (
                    <div className="absolute bottom-2 left-2 w-24 h-24 border border-gray-600 rounded overflow-hidden shadow-lg bg-black pointer-events-none group-hover:w-48 group-hover:h-48 transition-all duration-300">
                         <img src={state.renderedImage} alt="Rendered" className="w-full h-full object-contain" />
                    </div>
                )}
            </div>

            <div className="p-1.5 bg-gray-800 border-t border-gray-700 flex items-center justify-center gap-4 shrink-0">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Inverse Kinematics: Draggable Wrists & Ankles</span>
            </div>
        </div>
    );
};
