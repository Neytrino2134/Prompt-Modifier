import React, { useMemo, useState } from 'react';
import { useGameEngine } from '../../data-protection/useGameEngine';
import { GameCanvas } from '../../data-protection/GameCanvas';
import { GameUI } from '../../data-protection/GameUI';
import { MiniGameProps } from '../types';
import { GameArrowIcon } from '../GameArrowIcon';

export const DataDefenderGame: React.FC<MiniGameProps> = ({
    onBackToHub,
    audio,
    upstreamText = '',
    onOutputText,
    highScores,
    onUpdateHighScore,
    savedState,
    onSaveState,
    onClearState,
    isNewGameRequested
}) => {
    const { gameStateRef, uiState, startGame, pauseGame, buildTower, getFinalText } = useGameEngine(upstreamText);
    const [selectedTowerType, setSelectedTowerType] = useState<'laser' | 'emp' | 'blaster'>('laser');

    const hasValidSaved = !isNewGameRequested && savedState && (savedState.score > 0 || (Array.isArray(savedState.towers) && savedState.towers.length > 0)) && !savedState.isLevelComplete;

    // Restore saved state on mount
    React.useEffect(() => {
        if (hasValidSaved && gameStateRef.current) {
            if (typeof savedState.score === 'number') {
                gameStateRef.current.score = savedState.score;
            }
            if (typeof savedState.bits === 'number') {
                gameStateRef.current.bits = savedState.bits;
            }
            if (Array.isArray(savedState.towers) && savedState.towers.length > 0) {
                gameStateRef.current.towers = savedState.towers;
                savedState.towers.forEach((t: any) => {
                    if (gameStateRef.current.grid[t.y]?.[t.x]) {
                        gameStateRef.current.grid[t.y][t.x].isOccupied = true;
                    }
                });
            }
        }
    }, [hasValidSaved, savedState]);

    const persistState = React.useCallback(() => {
        if (!gameStateRef.current) return;
        const s = gameStateRef.current;
        if (s.score === 0 && s.towers.length === 0) return;
        onSaveState?.({
            score: s.score,
            bits: s.bits,
            towers: s.towers,
            isLevelComplete: false,
            savedAt: Date.now()
        });
    }, [onSaveState]);

    const handleBuild = (x: number, y: number) => {
        buildTower(x, y);
        audio.playClick();
        setTimeout(persistState, 50);
    };

    const handleTogglePlay = () => {
        if (uiState.isPaused) {
            startGame();
            audio.playClick();
        } else {
            pauseGame();
            audio.playClick();
        }
    };

    const handleGenerate = () => {
        const finalText = getFinalText();
        audio.playScore();
        if (onOutputText) {
            onOutputText(finalText);
        }
    };

    // Update high score
    React.useEffect(() => {
        if (uiState.score > (highScores['data_defender'] || 0)) {
            onUpdateHighScore('data_defender', uiState.score);
        }
    }, [uiState.score, highScores, onUpdateHighScore]);

    return (
        <div className="relative w-full h-full bg-slate-950 flex flex-col select-none overflow-hidden">
            {/* Top Game Bar */}
            <div className="h-10 bg-slate-900/90 border-b border-cyan-900/50 flex items-center justify-between px-3 shrink-0 z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBackToHub}
                        className="px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5 border border-cyan-800/40"
                    >
                        <GameArrowIcon direction="left" className="w-3 h-3" />
                        <span>Меню игр</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">Data Defender</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">Tower Defense</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                        <span className="text-slate-400">Score:</span>
                        <span className="font-bold text-cyan-400">{uiState.score}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                        <span className="text-slate-400">Bits:</span>
                        <span className="font-bold text-amber-400">{uiState.bits}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                        Best: <span className="text-amber-300">{highScores['data_defender'] || 0}</span>
                    </div>
                </div>
            </div>

            {/* Canvas & Controls Container */}
            <div className="flex-grow relative group">
                <GameCanvas gameStateRef={gameStateRef} onCellClick={handleBuild} />

                {/* Floating Game Control Overlay */}
                <div className="absolute top-3 left-3 flex flex-col gap-2 pointer-events-none z-10">
                    <div className="bg-slate-900/90 backdrop-blur-md rounded-lg p-2.5 border border-cyan-800/50 shadow-xl pointer-events-auto flex items-center gap-3">
                        <button
                            onClick={handleTogglePlay}
                            className={`px-3 py-1.5 rounded text-xs font-bold text-white transition-all shadow-md active:scale-95 flex items-center gap-1.5 ${
                                uiState.isPaused
                                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40'
                                    : 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/40'
                            }`}
                        >
                            {uiState.isPaused ? (
                                <>
                                    <GameArrowIcon direction="right" className="w-2.5 h-2.5" />
                                    <span>СТАРТ / ПАУЗА</span>
                                </>
                            ) : (
                                <span>⏸ ПАУЗА</span>
                            )}
                        </button>

                        <span className="text-[11px] text-slate-400 border-l border-slate-700 pl-3">
                            Клик на свободную клетку = Построить турель (50 Bits)
                        </span>
                    </div>
                </div>

                {/* End Game / Transmission Complete Modal */}
                {uiState.isLevelComplete && (
                    <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-auto bg-black/70 backdrop-blur-sm animate-fade-in">
                        <div className="relative flex flex-col items-center gap-4 p-6 bg-slate-900 rounded-2xl border-2 border-cyan-500 shadow-[0_0_60px_rgba(6,182,212,0.35)] max-w-sm w-full mx-4">
                            <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 text-2xl">
                                🛡️
                            </div>
                            <h2 className="text-xl font-bold text-white uppercase tracking-widest text-center">
                                Передача завершена!
                            </h2>
                            <div className="flex justify-around w-full py-2 bg-slate-800/80 rounded-lg border border-slate-700 text-xs">
                                <div className="flex flex-col items-center">
                                    <span className="text-slate-400">Счет</span>
                                    <span className="font-bold text-cyan-400 text-base">{uiState.score}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-slate-400">Остаток Bits</span>
                                    <span className="font-bold text-amber-400 text-base">{uiState.bits}</span>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 w-full mt-2">
                                <button
                                    onClick={handleGenerate}
                                    className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg text-xs shadow-lg transition-all text-center"
                                >
                                    Выгрузить в промпт
                                </button>
                                <button
                                    onClick={onBackToHub}
                                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-600"
                                >
                                    В лобби
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Status Bar */}
            <div className="h-6 bg-slate-950 border-t border-slate-800/80 flex items-center px-3 text-[10px] text-slate-400 justify-between shrink-0 font-mono">
                <span className="truncate max-w-[250px]">
                    Входные данные: {upstreamText.length > 0 ? `${upstreamText.length} симв.` : 'Автогенерация пакетов'}
                </span>
                <span>Статус: {uiState.isLevelComplete ? 'Успех' : (uiState.isPaused ? 'Пауза' : 'В бою')}</span>
            </div>
        </div>
    );
};
