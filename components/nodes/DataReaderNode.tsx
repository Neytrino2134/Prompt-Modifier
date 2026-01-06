
import React, { useMemo, useState, useEffect } from 'react';
import type { NodeContentProps } from '../../types';

export const DataReaderNode: React.FC<NodeContentProps> = ({ node, onReadData, t, onSelectNode, getUpstreamNodeValues }) => {
    const { text, image, mediaUrl, mediaType } = useMemo(() => {
        try {
            const parsed = JSON.parse(node.value || '{}');
            return { 
                text: parsed.text || '', 
                image: parsed.image || null,
                mediaUrl: parsed.mediaUrl || null,
                mediaType: parsed.mediaType || 'video' // Default fallback
            };
        } catch {
            return { text: '', image: null, mediaUrl: null, mediaType: 'video' };
        }
    }, [node.value]);

    const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

    // Reset dimensions if image source changes
    useEffect(() => {
        setImageDimensions(null);
    }, [image]);

    // Automatic update trigger
    // We compute a simple hash of upstream values to detect changes without infinite loops
    // getUpstreamNodeValues uses useMemo internally so its reference is stable unless dependencies change,
    // but the *content* it returns changes.
    const upstreamData = useMemo(() => {
        return getUpstreamNodeValues(node.id);
    }, [getUpstreamNodeValues, node.id]);

    const upstreamSignature = JSON.stringify(upstreamData);

    useEffect(() => {
        // Trigger read when upstream data changes
        onReadData(node.id);
    }, [upstreamSignature, onReadData, node.id]);

    return (
        <div className="flex flex-col h-full space-y-2">
            <div className="flex-grow min-h-0 flex flex-col space-y-2">
                {/* Media Display (Video/Audio) */}
                {mediaUrl && (
                    <div className="flex-1 min-h-[150px] bg-black rounded-md overflow-hidden relative group border border-gray-700" onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}>
                        {mediaType === 'video' ? (
                            <video 
                                src={mediaUrl} 
                                controls 
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gray-900">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                </svg>
                                <audio src={mediaUrl} controls className="w-full max-w-[90%]" />
                            </div>
                        )}
                        <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none uppercase backdrop-blur-sm border border-white/10">
                            {mediaType}
                        </div>
                    </div>
                )}

                {/* Image Display */}
                {image && (
                    <div className="flex-1 min-h-[150px] bg-gray-900/50 rounded-md p-1 relative group" onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}>
                        <img 
                            src={image} 
                            alt="Read data" 
                            className="object-contain w-full h-full" 
                            onLoad={(e) => setImageDimensions({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
                        />
                        {imageDimensions && (
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none backdrop-blur-sm">
                                {imageDimensions.width} x {imageDimensions.height} px
                            </div>
                        )}
                    </div>
                )}
                
                {/* Text Display */}
                <div className="flex-grow min-h-0 relative">
                    <textarea
                        readOnly
                        value={text}
                        placeholder={!image && !text && !mediaUrl ? '' : t('node.content.textDataHere')}
                        className="w-full h-full p-2 bg-slate-800 border-none rounded-md resize-none focus:outline-none text-gray-300"
                        onWheel={e => e.stopPropagation()}
                        onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}
                    />
                     {!image && !text && !mediaUrl && (
                        <div className="absolute inset-0 flex items-center justify-center text-center text-gray-500 pointer-events-none p-4">
                            <span>{t('node.content.noDataRead')}</span>
                        </div>
                    )}
                </div>
            </div>
            <button
                onClick={() => onReadData(node.id)}
                className="w-full px-4 py-2 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 flex-shrink-0"
            >
                {t('node.content.readData')}
            </button>
        </div>
    );
};
