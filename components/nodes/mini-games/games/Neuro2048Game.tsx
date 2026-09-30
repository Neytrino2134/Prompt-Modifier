import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MiniGameProps } from '../types';
import { GameArrowIcon } from '../GameArrowIcon';

type Grid = number[][];

const TILE_INFO: Record<number, { name: string; bg: string; text: string; border: string }> = {
    2: { name: 'Byte', bg: 'bg-slate-800', text: 'text-slate-200', border: 'border-slate-700' },
    4: { name: 'Bit', bg: 'bg-cyan-950', text: 'text-cyan-300', border: 'border-cyan-800' },
    8: { name: 'Node', bg: 'bg-teal-900', text: 'text-teal-200', border: 'border-teal-700' },
    16: { name: 'Vector', bg: 'bg-emerald-900', text: 'text-emerald-200', border: 'border-emerald-600' },
    32: { name: 'Tensor', bg: 'bg-amber-950', text: 'text-amber-300', border: 'border-amber-700' },
    64: { name: 'Token', bg: 'bg-orange-900', text: 'text-orange-200', border: 'border-orange-600' },
    128: { name: 'Prompt', bg: 'bg-rose-900', text: 'text-rose-200', border: 'border-rose-600 shadow-rose-900/50 shadow-lg' },
    256: { name: 'Model', bg: 'bg-purple-900', text: 'text-purple-200', border: 'border-purple-600 shadow-purple-900/50 shadow-lg' },
    512: { name: 'Neuron', bg: 'bg-indigo-900', text: 'text-indigo-200', border: 'border-indigo-500 shadow-indigo-900/50 shadow-lg' },
    1024: { name: 'Transformer', bg: 'bg-blue-900', text: 'text-blue-100', border: 'border-cyan-400 shadow-cyan-900/60 shadow-xl' },
    2048: { name: 'Singularity', bg: 'bg-gradient-to-br from-amber-500 to-rose-600', text: 'text-white font-extrabold', border: 'border-yellow-300 shadow-yellow-500/50 shadow-2xl animate-pulse' },
    4096: { name: 'AGI', bg: 'bg-gradient-to-br from-cyan-400 to-fuchsia-600', text: 'text-white font-black', border: 'border-white shadow-fuchsia-500/60 shadow-2xl' },
    8192: { name: 'Omniscience', bg: 'bg-gradient-to-r from-emerald-400 via-cyan-500 to-indigo-600', text: 'text-white font-black', border: 'border-emerald-300 shadow-2xl' },
};

export const Neuro2048Game: React.FC<MiniGameProps> = ({
    onBackToHub,
    audio,
    highScores,
    onUpdateHighScore,
    savedState,
    onSaveState,
    onClearState,
    isNewGameRequested
}) => {
    const createEmptyGrid = (): Grid => [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ];

    const addRandomTile = (grid: Grid): Grid => {
        const emptyCells: { r: number; c: number }[] = [];
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (grid[r][c] === 0) emptyCells.push({ r, c });
            }
        }
        if (emptyCells.length === 0) return grid;
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const newGrid = grid.map(row => [...row]);
        newGrid[randomCell.r][randomCell.c] = Math.random() < 0.9 ? 2 : 4;
        return newGrid;
    };

    const findMaxTile = (g: Grid): number => {
        let max = 0;
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (g[r][c] > max) max = g[r][c];
            }
        }
        return max;
    };

    // Restore from saved state if valid and new game not explicitly forced
    const hasValidSaved = !isNewGameRequested && savedState && Array.isArray(savedState.grid) && savedState.grid.length === 4 && !savedState.gameOver;

    const [grid, setGrid] = useState<Grid>(() => {
        if (hasValidSaved) return savedState.grid;
        let initial = createEmptyGrid();
        initial = addRandomTile(initial);
        return addRandomTile(initial);
    });

    const [history, setHistory] = useState<{ grid: Grid; score: number }[]>(() => {
        return (hasValidSaved && Array.isArray(savedState.history)) ? savedState.history : [];
    });
    const [score, setScore] = useState<number>(() => {
        return (hasValidSaved && typeof savedState.score === 'number') ? savedState.score : 0;
    });
    const [gameOver, setGameOver] = useState(false);
    const [won, setWon] = useState<boolean>(() => {
        return (hasValidSaved && typeof savedState.won === 'boolean') ? savedState.won : false;
    });
    const [hasContinuedAfterWin, setHasContinuedAfterWin] = useState<boolean>(() => {
        return (hasValidSaved && typeof savedState.hasContinuedAfterWin === 'boolean') ? savedState.hasContinuedAfterWin : false;
    });

    // Save best score
    useEffect(() => {
        if (score > (highScores['neuro_2048'] || 0)) {
            onUpdateHighScore('neuro_2048', score);
        }
    }, [score, highScores, onUpdateHighScore]);

    // Save game state callback
    const persistState = useCallback((newGrid: Grid, newScore: number, newHistory: { grid: Grid; score: number }[], newWon: boolean, newHasContinued: boolean, isOver: boolean) => {
        if (isOver) {
            onClearState?.();
            return;
        }
        onSaveState?.({
            grid: newGrid,
            score: newScore,
            history: newHistory.slice(-5), // keep last 5 undos to save space
            won: newWon,
            hasContinuedAfterWin: newHasContinued,
            gameOver: false,
            maxTile: findMaxTile(newGrid),
            savedAt: Date.now()
        });
    }, [onClearState, onSaveState]);

    const resetGame = () => {
        let newGrid = createEmptyGrid();
        newGrid = addRandomTile(newGrid);
        newGrid = addRandomTile(newGrid);
        setGrid(newGrid);
        setScore(0);
        setHistory([]);
        setGameOver(false);
        setWon(false);
        setHasContinuedAfterWin(false);
        onClearState?.();
        audio.playClick();
    };

    const undoMove = () => {
        if (history.length === 0) return;
        const last = history[history.length - 1];
        const newHistory = history.slice(0, -1);
        setGrid(last.grid);
        setScore(last.score);
        setHistory(newHistory);
        setGameOver(false);
        persistState(last.grid, last.score, newHistory, won, hasContinuedAfterWin, false);
        audio.playClick();
    };

    const checkGameOver = (g: Grid): boolean => {
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (g[r][c] === 0) return false;
                if (c < 3 && g[r][c] === g[r][c + 1]) return false;
                if (r < 3 && g[r][c] === g[r + 1][c]) return false;
            }
        }
        return true;
    };

    const move = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
        if (gameOver) return;

        let moved = false;
        let gainedScore = 0;
        let mergedSound = false;

        const newGrid = grid.map(row => [...row]);

        const slide = (row: number[]): number[] => {
            const filtered = row.filter(val => val !== 0);
            const result: number[] = [];
            for (let i = 0; i < filtered.length; i++) {
                if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
                    const mergedVal = filtered[i] * 2;
                    result.push(mergedVal);
                    gainedScore += mergedVal;
                    if (mergedVal >= 2048 && !won && !hasContinuedAfterWin) {
                        setWon(true);
                    }
                    mergedSound = true;
                    i++; // skip merged
                } else {
                    result.push(filtered[i]);
                }
            }
            while (result.length < 4) {
                result.push(0);
            }
            return result;
        };

        if (direction === 'left') {
            for (let r = 0; r < 4; r++) {
                const row = newGrid[r];
                const newRow = slide(row);
                if (row.some((val, i) => val !== newRow[i])) moved = true;
                newGrid[r] = newRow;
            }
        } else if (direction === 'right') {
            for (let r = 0; r < 4; r++) {
                const row = [...newGrid[r]].reverse();
                const newRow = slide(row).reverse();
                if (newGrid[r].some((val, i) => val !== newRow[i])) moved = true;
                newGrid[r] = newRow;
            }
        } else if (direction === 'up') {
            for (let c = 0; c < 4; c++) {
                const col = [newGrid[0][c], newGrid[1][c], newGrid[2][c], newGrid[3][c]];
                const newCol = slide(col);
                if (col.some((val, i) => val !== newCol[i])) moved = true;
                for (let r = 0; r < 4; r++) {
                    newGrid[r][c] = newCol[r];
                }
            }
        } else if (direction === 'down') {
            for (let c = 0; c < 4; c++) {
                const col = [newGrid[3][c], newGrid[2][c], newGrid[1][c], newGrid[0][c]];
                const newCol = slide(col).reverse();
                const originalCol = [newGrid[0][c], newGrid[1][c], newGrid[2][c], newGrid[3][c]];
                if (originalCol.some((val, i) => val !== newCol[i])) moved = true;
                for (let r = 0; r < 4; r++) {
                    newGrid[r][c] = newCol[r];
                }
            }
        }

        if (moved) {
            const nextHistory = [...history.slice(-5), { grid, score }];
            setHistory(nextHistory);
            const finalGrid = addRandomTile(newGrid);
            setGrid(finalGrid);
            const finalScore = score + gainedScore;
            setScore(finalScore);

            if (mergedSound) {
                audio.playMerge();
            } else {
                audio.playClick();
            }

            const isOver = checkGameOver(finalGrid);
            if (isOver) {
                setGameOver(true);
                audio.playGameOver();
                onClearState?.();
            } else {
                persistState(finalGrid, finalScore, nextHistory, won, hasContinuedAfterWin, false);
            }
        }
    }, [grid, score, history, gameOver, won, hasContinuedAfterWin, audio, persistState, onClearState]);

    // Keyboard listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['ArrowUp', 'KeyW'].includes(e.code)) {
                e.preventDefault();
                move('up');
            } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
                e.preventDefault();
                move('down');
            } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
                e.preventDefault();
                move('left');
            } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
                e.preventDefault();
                move('right');
            } else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                undoMove();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [move]);

    return (
        <div className="relative w-full h-full bg-slate-950 flex flex-col select-none overflow-hidden">
            {/* Top Game Bar */}
            <div className="h-10 bg-slate-900/90 border-b border-purple-900/50 flex items-center justify-between px-3 shrink-0 z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBackToHub}
                        className="px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1.5 border border-purple-800/40"
                    >
                        <GameArrowIcon direction="left" className="w-3 h-3" />
                        <span>Меню игр</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Neuro-2048</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800">Cyber Logic</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                    <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                        <span className="text-slate-400">Счет:</span>
                        <span className="font-bold text-purple-400">{score}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                        <span className="text-slate-400">Рекорд:</span>
                        <span className="font-bold text-amber-400">{highScores['neuro_2048'] || 0}</span>
                    </div>
                    <button
                        onClick={undoMove}
                        disabled={history.length === 0}
                        className="px-2 py-0.5 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700"
                        title="Отменить ход (Ctrl+Z)"
                    >
                        ↩ Ход назад
                    </button>
                    <button
                        onClick={resetGame}
                        className="px-2 py-0.5 text-[11px] rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800"
                    >
                        Новая игра
                    </button>
                </div>
            </div>

            {/* Main Game Arena */}
            <div className="flex-grow flex flex-col items-center justify-center p-4 relative">
                {/* 2048 Grid Card */}
                <div className="bg-slate-900/90 p-3 rounded-2xl border border-purple-800/50 shadow-[0_0_40px_rgba(147,51,234,0.15)] flex flex-col items-center gap-2">
                    <div className="grid grid-cols-4 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 w-[290px] h-[290px] sm:w-[340px] sm:h-[340px]">
                        {grid.map((row, r) =>
                            row.map((val, c) => {
                                const info = TILE_INFO[val] || {
                                    name: `${val}`,
                                    bg: 'bg-fuchsia-950',
                                    text: 'text-white font-bold',
                                    border: 'border-fuchsia-500'
                                };
                                return (
                                    <div
                                        key={`${r}-${c}`}
                                        className={`rounded-lg flex flex-col items-center justify-center transition-all duration-150 relative overflow-hidden ${
                                            val === 0
                                                ? 'bg-slate-900/40 border border-slate-800/60'
                                                : `${info.bg} ${info.text} border ${info.border} transform scale-100 hover:scale-[1.02]`
                                        }`}
                                    >
                                        {val !== 0 && (
                                            <>
                                                <span className="text-base sm:text-lg font-black tracking-tight">{val}</span>
                                                <span className="text-[9px] sm:text-[10px] uppercase font-mono tracking-wider opacity-85">{info.name}</span>
                                            </>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* D-Pad On-Screen Controls */}
                    <div className="flex flex-col items-center gap-1 pt-1">
                        <button
                            onClick={() => move('up')}
                            className="w-10 h-8 rounded bg-slate-800 hover:bg-slate-700 active:bg-purple-600 text-slate-300 hover:text-purple-300 font-bold border border-slate-700 flex items-center justify-center transition-all shadow-sm"
                            title="Вверх"
                        >
                            <GameArrowIcon direction="up" className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex gap-2">
                            <button
                                onClick={() => move('left')}
                                className="w-10 h-8 rounded bg-slate-800 hover:bg-slate-700 active:bg-purple-600 text-slate-300 hover:text-purple-300 font-bold border border-slate-700 flex items-center justify-center transition-all shadow-sm"
                                title="Влево"
                            >
                                <GameArrowIcon direction="left" className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => move('down')}
                                className="w-10 h-8 rounded bg-slate-800 hover:bg-slate-700 active:bg-purple-600 text-slate-300 hover:text-purple-300 font-bold border border-slate-700 flex items-center justify-center transition-all shadow-sm"
                                title="Вниз"
                            >
                                <GameArrowIcon direction="down" className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => move('right')}
                                className="w-10 h-8 rounded bg-slate-800 hover:bg-slate-700 active:bg-purple-600 text-slate-300 hover:text-purple-300 font-bold border border-slate-700 flex items-center justify-center transition-all shadow-sm"
                                title="Вправо"
                            >
                                <GameArrowIcon direction="right" className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Win Modal */}
                {won && !hasContinuedAfterWin && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20 animate-fade-in">
                        <div className="bg-slate-900 border-2 border-yellow-400 p-6 rounded-2xl max-w-xs w-full text-center shadow-[0_0_50px_rgba(234,179,8,0.4)] flex flex-col items-center gap-3">
                            <div className="text-4xl animate-bounce">⚡</div>
                            <h2 className="text-xl font-extrabold text-yellow-300 tracking-wider uppercase">Singularity 2048!</h2>
                            <p className="text-xs text-slate-300">
                                Вы достигли технологической сингулярности! Хотите продолжить до 4096 / 8192?
                            </p>
                            <div className="flex gap-2 w-full mt-2">
                                <button
                                    onClick={() => setHasContinuedAfterWin(true)}
                                    className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg"
                                >
                                    Продолжить
                                </button>
                                <button
                                    onClick={resetGame}
                                    className="px-3 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700"
                                >
                                    Заново
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Game Over Modal */}
                {gameOver && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20 animate-fade-in">
                        <div className="bg-slate-900 border-2 border-rose-500 p-6 rounded-2xl max-w-xs w-full text-center shadow-[0_0_50px_rgba(244,63,94,0.4)] flex flex-col items-center gap-3">
                            <div className="text-3xl">🛑</div>
                            <h2 className="text-lg font-bold text-rose-400 uppercase tracking-widest">Память переполнена</h2>
                            <p className="text-xs text-slate-400">Нет доступных ходов для объединения нейронов.</p>
                            <div className="text-sm font-mono text-slate-200">
                                Итоговый счет: <span className="font-bold text-purple-400">{score}</span>
                            </div>
                            <div className="flex gap-2 w-full mt-2">
                                <button
                                    onClick={resetGame}
                                    className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-bold text-xs rounded-lg shadow-lg"
                                >
                                    Попробовать снова
                                </button>
                                <button
                                    onClick={undoMove}
                                    disabled={history.length === 0}
                                    className="px-3 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700 disabled:opacity-40"
                                >
                                    ↩ Ход назад
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Status Bar */}
            <div className="h-6 bg-slate-950 border-t border-slate-800/80 flex items-center px-3 text-[10px] text-slate-400 justify-between shrink-0 font-mono">
                <span>Управление: Стрелки / WASD / Экранный D-Pad</span>
                <span>Цель: Создать Сингулярность (2048)</span>
            </div>
        </div>
    );
};
