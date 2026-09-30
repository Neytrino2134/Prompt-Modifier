import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { NodeContentProps } from '../../../types';
import { useGameAudio } from './useGameAudio';
import { MiniGameId } from './types';
import { BatchApiBanner } from './BatchApiBanner';
import { MiniGamesHub, GAMES_CATALOG, getGameProgressSummary } from './MiniGamesHub';
import { DataDefenderGame } from './games/DataDefenderGame';
import { Neuro2048Game } from './games/Neuro2048Game';
import { NeuralSnakeGame } from './games/NeuralSnakeGame';
import { QuantumHopperGame } from './games/QuantumHopperGame';
import { MemoryMatrixGame } from './games/MemoryMatrixGame';
import { CyberArkanoidGame } from './games/CyberArkanoidGame';
import { CyberTetrisGame } from './games/CyberTetrisGame';

const STORAGE_KEY_HIGH_SCORES = 'aistudio_minigames_highscores';
const STORAGE_KEY_GAMES_PROGRESS = 'aistudio_minigames_progress';

export const MiniGamesNode: React.FC<NodeContentProps> = ({
    node,
    onValueChange,
    t,
    getUpstreamNodeValues
}) => {
    // Upstream text support (can be used by defender or games)
    const upstreamText = useMemo(() => {
        const values = getUpstreamNodeValues(node.id);
        const texts = values.filter(v => typeof v === 'string') as string[];
        return texts.join(' ');
    }, [getUpstreamNodeValues, node.id]);

    // Parse initial selected game, high scores, and games progress
    const parsedInitial = useMemo(() => {
        try {
            return JSON.parse(node.value || '{}');
        } catch {
            return {};
        }
    }, [node.value]);

    const [activeGameId, setActiveGameId] = useState<MiniGameId>(() => {
        if (parsedInitial.activeGameId) return parsedInitial.activeGameId;
        return 'hub';
    });

    const [newGameRequestMap, setNewGameRequestMap] = useState<Record<string, boolean>>({});

    const [gamesProgress, setGamesProgress] = useState<Record<string, any>>(() => {
        if (parsedInitial.gamesProgress && typeof parsedInitial.gamesProgress === 'object') {
            return parsedInitial.gamesProgress;
        }
        try {
            const local = localStorage.getItem(STORAGE_KEY_GAMES_PROGRESS);
            if (local) return JSON.parse(local);
        } catch {}
        return {};
    });

    const [highScores, setHighScores] = useState<Record<string, number>>(() => {
        try {
            const local = localStorage.getItem(STORAGE_KEY_HIGH_SCORES);
            if (local) return JSON.parse(local);
        } catch {}
        return {};
    });

    const audio = useGameAudio(false);

    // Save high score
    const updateHighScore = useCallback((gameId: string, score: number) => {
        setHighScores(prev => {
            const updated = { ...prev, [gameId]: Math.max(prev[gameId] || 0, score) };
            try {
                localStorage.setItem(STORAGE_KEY_HIGH_SCORES, JSON.stringify(updated));
            } catch {}
            return updated;
        });
    }, []);

    // Save game progress
    const handleSaveGameProgress = useCallback((gameId: string, state: any) => {
        setGamesProgress(prev => {
            const updated = { ...prev, [gameId]: state };
            try {
                localStorage.setItem(STORAGE_KEY_GAMES_PROGRESS, JSON.stringify(updated));
            } catch {}
            try {
                const current = JSON.parse(node.value || '{}');
                onValueChange(node.id, JSON.stringify({ ...current, gamesProgress: updated }));
            } catch {
                onValueChange(node.id, JSON.stringify({ activeGameId, gamesProgress: updated }));
            }
            return updated;
        });
    }, [node.id, node.value, activeGameId, onValueChange]);

    // Clear game progress
    const handleClearGameProgress = useCallback((gameId: string) => {
        setGamesProgress(prev => {
            const updated = { ...prev };
            delete updated[gameId];
            try {
                localStorage.setItem(STORAGE_KEY_GAMES_PROGRESS, JSON.stringify(updated));
            } catch {}
            try {
                const current = JSON.parse(node.value || '{}');
                onValueChange(node.id, JSON.stringify({ ...current, gamesProgress: updated }));
            } catch {
                onValueChange(node.id, JSON.stringify({ activeGameId, gamesProgress: updated }));
            }
            return updated;
        });
    }, [node.id, node.value, activeGameId, onValueChange]);

    // Handle game switch with mode ('continue' | 'new')
    const handleSelectGame = useCallback((gameId: MiniGameId, mode: 'continue' | 'new' = 'continue') => {
        if (mode === 'new' && gameId !== 'hub') {
            setNewGameRequestMap(prev => ({ ...prev, [gameId]: true }));
            handleClearGameProgress(gameId);
        } else {
            setNewGameRequestMap(prev => ({ ...prev, [gameId]: false }));
        }

        setActiveGameId(gameId);
        try {
            const current = JSON.parse(node.value || '{}');
            onValueChange(node.id, JSON.stringify({ ...current, activeGameId: gameId }));
        } catch {
            onValueChange(node.id, JSON.stringify({ activeGameId: gameId, gamesProgress }));
        }
    }, [node.id, node.value, gamesProgress, onValueChange, handleClearGameProgress]);

    const handleRestartActiveGame = useCallback(() => {
        if (activeGameId === 'hub') return;
        audio.playClick();
        setNewGameRequestMap(prev => ({ ...prev, [activeGameId]: true }));
        handleClearGameProgress(activeGameId);
    }, [activeGameId, audio, handleClearGameProgress]);

    const handleOutputText = useCallback((text: string) => {
        try {
            const current = JSON.parse(node.value || '{}');
            onValueChange(node.id, JSON.stringify({ ...current, outputText: text }));
        } catch {
            onValueChange(node.id, JSON.stringify({ outputText: text }));
        }
    }, [node.id, node.value, onValueChange]);

    const activeGameProgressSummary = useMemo(() => {
        if (activeGameId === 'hub') return null;
        return getGameProgressSummary(activeGameId, gamesProgress[activeGameId]);
    }, [activeGameId, gamesProgress]);

    const currentGameInfo = useMemo(() => {
        return GAMES_CATALOG.find(g => g.id === activeGameId);
    }, [activeGameId]);

    return (
        <div className="relative w-full h-full bg-slate-950 rounded-md overflow-hidden flex flex-col font-sans">
            {/* Top Navigation & Controls Bar */}
            <div className="h-9 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-2 shrink-0 z-20 select-none">
                {/* Left: Quick Selector Dropdown */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { audio.playClick(); handleSelectGame('hub'); }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all border ${
                            activeGameId === 'hub'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm'
                                : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
                        }`}
                        title="Каталог всех мини-игр"
                    >
                        <span>🎮</span>
                        <span>Лобби игр</span>
                    </button>

                    <div className="relative">
                        <select
                            value={activeGameId}
                            onChange={(e) => { audio.playClick(); handleSelectGame(e.target.value as MiniGameId); }}
                            className="bg-slate-800/90 text-slate-200 text-xs rounded px-2 py-1 border border-slate-700 hover:border-slate-600 focus:outline-none focus:border-amber-500 cursor-pointer font-medium"
                        >
                            <option value="hub">🕹️ Меню выбора игры...</option>
                            <option value="data_defender">🛡️ Защита Данных {gamesProgress.data_defender ? '💾' : ''}</option>
                            <option value="neuro_2048">⚡ Нейро-2048 {gamesProgress.neuro_2048 ? '💾' : ''}</option>
                            <option value="neural_snake">🐍 Кибер-Змейка {gamesProgress.neural_snake ? '💾' : ''}</option>
                            <option value="quantum_hopper">🚀 Квантовый Прыжок {gamesProgress.quantum_hopper ? '💾' : ''}</option>
                            <option value="memory_matrix">🧠 Матрица Памяти {gamesProgress.memory_matrix ? '💾' : ''}</option>
                            <option value="cyber_arkanoid">🧱 Кибер-Арканоид {gamesProgress.cyber_arkanoid ? '💾' : ''}</option>
                            <option value="cyber_tetris">🧩 Кибер-Тетрис {gamesProgress.cyber_tetris ? '💾' : ''}</option>
                        </select>
                    </div>
                </div>

                {/* Right: Game In-Session Controls & Sound */}
                <div className="flex items-center gap-2">
                    {activeGameId !== 'hub' && (
                        <>
                            {activeGameProgressSummary && (
                                <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 font-mono">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    <span>{activeGameProgressSummary}</span>
                                </div>
                            )}

                            <button
                                onClick={handleRestartActiveGame}
                                className="px-2 py-1 rounded text-xs bg-slate-800 hover:bg-rose-950/80 hover:text-rose-300 text-slate-300 border border-slate-700 hover:border-rose-700 transition-colors flex items-center gap-1 font-medium"
                                title="Сбросить прогресс и начать заново"
                            >
                                <span>🔄</span>
                                <span className="hidden sm:inline">Новая игра</span>
                            </button>
                        </>
                    )}

                    {/* Sound Mute Toggle */}
                    <button
                        onClick={audio.toggleMute}
                        className={`p-1.5 rounded text-xs transition-colors border ${
                            audio.isMuted
                                ? 'bg-slate-800 text-slate-500 border-slate-700'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        }`}
                        title={audio.isMuted ? 'Включить звук 8-bit' : 'Выключить звук'}
                    >
                        {audio.isMuted ? '🔇' : '🔊'}
                    </button>
                </div>
            </div>

            {/* Batch API Realtime Monitor Banner */}
            <BatchApiBanner />

            {/* Main Active Game Viewport */}
            <div className="flex-grow relative overflow-hidden">
                {activeGameId === 'hub' && (
                    <MiniGamesHub
                        onSelectGame={handleSelectGame}
                        audio={audio}
                        highScores={highScores}
                        gamesProgress={gamesProgress}
                    />
                )}

                {activeGameId === 'data_defender' && (
                    <DataDefenderGame
                        key={newGameRequestMap['data_defender'] ? 'fresh' : 'saved'}
                        onBackToHub={() => handleSelectGame('hub')}
                        audio={audio}
                        upstreamText={upstreamText}
                        onOutputText={handleOutputText}
                        highScores={highScores}
                        onUpdateHighScore={updateHighScore}
                        savedState={gamesProgress['data_defender']}
                        onSaveState={(s) => handleSaveGameProgress('data_defender', s)}
                        onClearState={() => handleClearGameProgress('data_defender')}
                        isNewGameRequested={Boolean(newGameRequestMap['data_defender'])}
                    />
                )}

                {activeGameId === 'neuro_2048' && (
                    <Neuro2048Game
                        key={newGameRequestMap['neuro_2048'] ? 'fresh' : 'saved'}
                        onBackToHub={() => handleSelectGame('hub')}
                        audio={audio}
                        highScores={highScores}
                        onUpdateHighScore={updateHighScore}
                        savedState={gamesProgress['neuro_2048']}
                        onSaveState={(s) => handleSaveGameProgress('neuro_2048', s)}
                        onClearState={() => handleClearGameProgress('neuro_2048')}
                        isNewGameRequested={Boolean(newGameRequestMap['neuro_2048'])}
                    />
                )}

                {activeGameId === 'neural_snake' && (
                    <NeuralSnakeGame
                        key={newGameRequestMap['neural_snake'] ? 'fresh' : 'saved'}
                        onBackToHub={() => handleSelectGame('hub')}
                        audio={audio}
                        highScores={highScores}
                        onUpdateHighScore={updateHighScore}
                        savedState={gamesProgress['neural_snake']}
                        onSaveState={(s) => handleSaveGameProgress('neural_snake', s)}
                        onClearState={() => handleClearGameProgress('neural_snake')}
                        isNewGameRequested={Boolean(newGameRequestMap['neural_snake'])}
                    />
                )}

                {activeGameId === 'quantum_hopper' && (
                    <QuantumHopperGame
                        key={newGameRequestMap['quantum_hopper'] ? 'fresh' : 'saved'}
                        onBackToHub={() => handleSelectGame('hub')}
                        audio={audio}
                        highScores={highScores}
                        onUpdateHighScore={updateHighScore}
                        savedState={gamesProgress['quantum_hopper']}
                        onSaveState={(s) => handleSaveGameProgress('quantum_hopper', s)}
                        onClearState={() => handleClearGameProgress('quantum_hopper')}
                        isNewGameRequested={Boolean(newGameRequestMap['quantum_hopper'])}
                    />
                )}

                {activeGameId === 'memory_matrix' && (
                    <MemoryMatrixGame
                        key={newGameRequestMap['memory_matrix'] ? 'fresh' : 'saved'}
                        onBackToHub={() => handleSelectGame('hub')}
                        audio={audio}
                        highScores={highScores}
                        onUpdateHighScore={updateHighScore}
                        savedState={gamesProgress['memory_matrix']}
                        onSaveState={(s) => handleSaveGameProgress('memory_matrix', s)}
                        onClearState={() => handleClearGameProgress('memory_matrix')}
                        isNewGameRequested={Boolean(newGameRequestMap['memory_matrix'])}
                    />
                )}

                {activeGameId === 'cyber_arkanoid' && (
                    <CyberArkanoidGame
                        key={newGameRequestMap['cyber_arkanoid'] ? 'fresh' : 'saved'}
                        onBackToHub={() => handleSelectGame('hub')}
                        audio={audio}
                        highScores={highScores}
                        onUpdateHighScore={updateHighScore}
                        savedState={gamesProgress['cyber_arkanoid']}
                        onSaveState={(s) => handleSaveGameProgress('cyber_arkanoid', s)}
                        onClearState={() => handleClearGameProgress('cyber_arkanoid')}
                        isNewGameRequested={Boolean(newGameRequestMap['cyber_arkanoid'])}
                    />
                )}

                {activeGameId === 'cyber_tetris' && (
                    <CyberTetrisGame
                        key={newGameRequestMap['cyber_tetris'] ? 'fresh' : 'saved'}
                        onBackToHub={() => handleSelectGame('hub')}
                        audio={audio}
                        highScores={highScores}
                        onUpdateHighScore={updateHighScore}
                        savedState={gamesProgress['cyber_tetris']}
                        onSaveState={(s) => handleSaveGameProgress('cyber_tetris', s)}
                        onClearState={() => handleClearGameProgress('cyber_tetris')}
                        isNewGameRequested={Boolean(newGameRequestMap['cyber_tetris'])}
                    />
                )}
            </div>
        </div>
    );
};
