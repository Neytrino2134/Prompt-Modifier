
import React from 'react';

interface GameUIProps {
    score: number;
    bits: number;
    isPaused: boolean;
    onTogglePause: () => void;
    t: (key: string) => string;
}

export const GameUI: React.FC<GameUIProps> = ({ score, bits, isPaused, onTogglePause, t }) => {
    return (
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start pointer-events-none">
            <div className="bg-gray-800/80 backdrop-blur rounded p-2 border border-gray-600 shadow-lg pointer-events-auto flex flex-col gap-1">
                <div className="text-cyan-400 font-bold text-lg">Score: {score}</div>
                <div className="text-yellow-400 font-mono text-sm">Bits: {bits}</div>
            </div>
            
            <div className="pointer-events-auto">
                 <button 
                    onClick={onTogglePause}
                    className={`px-4 py-2 rounded font-bold text-white shadow-lg transition-colors ${isPaused ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                    {isPaused ? "START / RESUME" : "PAUSE"}
                </button>
            </div>
            
            <div className="bg-gray-800/80 backdrop-blur rounded p-2 border border-gray-600 shadow-lg text-xs text-gray-300 max-w-[150px]">
                <p>Click on empty cells to build towers (50 Bits).</p>
                <p>Protect the blue circles!</p>
            </div>
        </div>
    );
};
