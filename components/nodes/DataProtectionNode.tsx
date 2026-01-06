
import React, { useMemo } from 'react';
import type { NodeContentProps } from '../../types';
import { useGameEngine } from './data-protection/useGameEngine';
import { GameCanvas } from './data-protection/GameCanvas';
import { GameUI } from './data-protection/GameUI';

export const DataProtectionNode: React.FC<NodeContentProps> = ({ node, onValueChange, t, getUpstreamNodeValues }) => {
    
    // Get Input Text
    const upstreamText = useMemo(() => {
        const values = getUpstreamNodeValues(node.id);
        const texts = values.filter(v => typeof v === 'string') as string[];
        return texts.join(' ');
    }, [getUpstreamNodeValues, node.id]);

    const { gameStateRef, uiState, startGame, pauseGame, buildTower, getFinalText } = useGameEngine(upstreamText);
    
    const handleGenerate = () => {
        const finalText = getFinalText();
        // Update node output
        try {
            const current = JSON.parse(node.value || '{}');
            onValueChange(node.id, JSON.stringify({ ...current, outputText: finalText }));
        } catch {
             onValueChange(node.id, JSON.stringify({ outputText: finalText }));
        }
    };

    return (
        <div className="relative w-full h-full bg-gray-900 rounded-md overflow-hidden flex flex-col">
             <div className="flex-grow relative group">
                 <GameCanvas gameStateRef={gameStateRef} onCellClick={buildTower} />
                 
                 <GameUI 
                    score={uiState.score} 
                    bits={uiState.bits} 
                    isPaused={uiState.isPaused} 
                    onTogglePause={() => uiState.isPaused ? startGame() : pauseGame()}
                    t={t}
                 />

                 {/* Generate Button Overlay */}
                 {uiState.isLevelComplete && (
                     <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-auto">
                         <div className="bg-black/60 absolute inset-0 backdrop-blur-sm"></div>
                         <div className="relative flex flex-col items-center gap-4 p-6 bg-gray-800 rounded-xl border-2 border-cyan-500 shadow-[0_0_50px_rgba(6,182,212,0.4)] animate-fade-in-up">
                             <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Transmission Complete</h2>
                             <div className="text-gray-300 text-sm">
                                 Integrity: <span className="text-cyan-400 font-mono">{Math.floor((uiState.score / (gameStateRef.current.totalWordsInitial * 20)) * 100)}%</span>
                             </div>
                             <button 
                                onClick={handleGenerate}
                                className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg shadow-lg transform hover:scale-105 transition-all"
                             >
                                 GENERATE OUTPUT
                             </button>
                         </div>
                     </div>
                 )}
             </div>
             
             {/* Status Bar */}
             <div className="h-6 bg-gray-800 border-t border-gray-700 flex items-center px-2 text-[10px] text-gray-400 justify-between shrink-0">
                 <span>Input: {upstreamText.length > 20 ? upstreamText.substring(0, 20) + '...' : (upstreamText ? `${upstreamText.length} chars` : 'No Data')}</span>
                 <span>Status: {uiState.isLevelComplete ? 'Complete' : (uiState.isPaused ? 'Paused' : 'Active')}</span>
             </div>
        </div>
    );
};
