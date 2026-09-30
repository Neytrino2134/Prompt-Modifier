import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MiniGameProps } from '../types';
import { GameArrowIcon } from '../GameArrowIcon';

interface Pipe {
    x: number;
    topHeight: number;
    bottomHeight: number;
    passed: boolean;
}

// Fixed baseline constants for 60 FPS physics
const GRAVITY = 0.22;
const JUMP_IMPULSE = -5.6;
const PIPE_SPEED = 1.9;
const SPAWN_INTERVAL_MS = 1750;
const GATE_GAP = 120;

export const QuantumHopperGame: React.FC<MiniGameProps> = ({
    onBackToHub,
    audio,
    highScores,
    onUpdateHighScore,
    savedState,
    onSaveState,
    onClearState,
    isNewGameRequested
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const hasValidSaved = !isNewGameRequested && savedState && typeof savedState.score === 'number' && savedState.score > 0 && !savedState.gameOver;

    const [score, setScore] = useState<number>(() => {
        return hasValidSaved ? savedState.score : 0;
    });
    const [gameOver, setGameOver] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    const birdRef = useRef<{ y: number; vy: number; radius: number }>({ y: 150, vy: 0, radius: 12 });
    const pipesRef = useRef<Pipe[]>([]);
    const frameIdRef = useRef<number>(0);
    const lastSpawnRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);

    const persistState = useCallback((curScore: number) => {
        if (curScore <= 0) return;
        onSaveState?.({
            score: curScore,
            gameOver: false,
            savedAt: Date.now()
        });
    }, [onSaveState]);

    const jump = useCallback(() => {
        if (gameOver) return;
        if (!isPlaying) {
            setIsPlaying(true);
            lastTimeRef.current = 0;
            lastSpawnRef.current = performance.now();
        }
        birdRef.current.vy = JUMP_IMPULSE;
        audio.playJump();
    }, [gameOver, isPlaying, audio]);

    const resetGame = useCallback(() => {
        birdRef.current = { y: 150, vy: 0, radius: 12 };
        pipesRef.current = [];
        lastTimeRef.current = 0;
        lastSpawnRef.current = 0;
        setScore(0);
        setGameOver(false);
        setIsPlaying(false);
        onClearState?.();
        audio.playClick();
    }, [onClearState, audio]);

    // Keyboard and mouse listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                e.preventDefault();
                jump();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [jump]);

    // Game loop with delta-time (FPS-independent physics)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let isRunning = true;

        const loop = (timestamp: number) => {
            if (!isRunning) return;

            // Calculate delta-time normalized to 60 FPS
            if (!lastTimeRef.current) {
                lastTimeRef.current = timestamp;
            }
            const elapsedMs = Math.min(Math.max(timestamp - lastTimeRef.current, 0), 100);
            lastTimeRef.current = timestamp;
            const dt = Math.min(Math.max(elapsedMs / (1000 / 60), 0.05), 3.0);

            const w = canvas.width;
            const h = canvas.height;

            if (isPlaying && !gameOver) {
                // Gravity & physics with delta-time
                birdRef.current.vy += GRAVITY * dt;
                birdRef.current.y += birdRef.current.vy * dt;

                // Ground & Ceiling collision
                if (birdRef.current.y + birdRef.current.radius >= h - 10 || birdRef.current.y - birdRef.current.radius <= 0) {
                    setGameOver(true);
                    audio.playGameOver();
                    onClearState?.();
                }

                // Spawn laser gates with time-based interval
                if (timestamp - lastSpawnRef.current > SPAWN_INTERVAL_MS) {
                    lastSpawnRef.current = timestamp;
                    const minHeight = 40;
                    const topHeight = minHeight + Math.random() * (h - GATE_GAP - minHeight * 2);
                    const bottomHeight = h - topHeight - GATE_GAP;
                    pipesRef.current.push({
                        x: w,
                        topHeight,
                        bottomHeight,
                        passed: false
                    });
                }

                // Move gates & collision with delta-time
                const birdX = 70;
                const birdY = birdRef.current.y;
                const birdR = birdRef.current.radius;
                const pipeWidth = 36;

                for (let i = pipesRef.current.length - 1; i >= 0; i--) {
                    const pipe = pipesRef.current[i];
                    pipe.x -= PIPE_SPEED * dt;

                    // Check pass for score
                    if (!pipe.passed && pipe.x + pipeWidth < birdX) {
                        pipe.passed = true;
                        const newScore = score + 1;
                        setScore(newScore);
                        if (newScore > (highScores['quantum_hopper'] || 0)) {
                            onUpdateHighScore('quantum_hopper', newScore);
                        }
                        audio.playScore();
                        persistState(newScore);
                    }

                    // Check collision
                    if (
                        birdX + birdR > pipe.x &&
                        birdX - birdR < pipe.x + pipeWidth &&
                        (birdY - birdR < pipe.topHeight || birdY + birdR > h - pipe.bottomHeight)
                    ) {
                        setGameOver(true);
                        audio.playGameOver();
                        onClearState?.();
                    }

                    // Remove offscreen
                    if (pipe.x + pipeWidth < -20) {
                        pipesRef.current.splice(i, 1);
                    }
                }
            }

            // Render
            ctx.clearRect(0, 0, w, h);

            // Cyber Background
            ctx.fillStyle = '#050816';
            ctx.fillRect(0, 0, w, h);

            // Horizontal Cyber Grid
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
            ctx.lineWidth = 1;
            for (let y = 0; y < h; y += 30) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }

            // Draw Laser Pipes
            pipesRef.current.forEach(p => {
                const pipeW = 36;

                // Top Gate
                ctx.save();
                const topGrad = ctx.createLinearGradient(p.x, 0, p.x + pipeW, 0);
                topGrad.addColorStop(0, '#f43f5e');
                topGrad.addColorStop(0.5, '#fda4af');
                topGrad.addColorStop(1, '#e11d48');
                ctx.fillStyle = topGrad;
                ctx.shadowColor = '#f43f5e';
                ctx.shadowBlur = 10;
                ctx.fillRect(p.x, 0, pipeW, p.topHeight);

                // Laser gate emitter head
                ctx.fillStyle = '#ffe4e6';
                ctx.fillRect(p.x - 2, p.topHeight - 8, pipeW + 4, 8);

                // Bottom Gate
                const bottomY = h - p.bottomHeight;
                ctx.fillRect(p.x, bottomY, pipeW, p.bottomHeight);
                ctx.fillRect(p.x - 2, bottomY, pipeW + 4, 8);
                ctx.restore();
            });

            // Draw Ground Barrier
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, h - 10, w, 10);
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, h - 10);
            ctx.lineTo(w, h - 10);
            ctx.stroke();

            // Draw Cyber Drone / Bird
            const bx = 70;
            const by = birdRef.current.y;
            const br = birdRef.current.radius;

            ctx.save();
            ctx.shadowColor = '#06b6d4';
            ctx.shadowBlur = 16;

            // Drone body
            const bodyGrad = ctx.createRadialGradient(bx, by, 2, bx, by, br);
            bodyGrad.addColorStop(0, '#e0f2fe');
            bodyGrad.addColorStop(0.6, '#38bdf8');
            bodyGrad.addColorStop(1, '#0284c7');
            ctx.fillStyle = bodyGrad;
            ctx.beginPath();
            ctx.arc(bx, by, br, 0, Math.PI * 2);
            ctx.fill();

            // Drone Core / Eye
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(bx + 4, by - 2, 4, 0, Math.PI * 2);
            ctx.fill();

            // Thruster fire
            if (isPlaying && !gameOver) {
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.moveTo(bx - br, by);
                ctx.lineTo(bx - br - 10, by - 4);
                ctx.lineTo(bx - br - 6, by);
                ctx.lineTo(bx - br - 10, by + 4);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();

            frameIdRef.current = requestAnimationFrame(loop);
        };

        frameIdRef.current = requestAnimationFrame(loop);

        return () => {
            isRunning = false;
            if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
        };
    }, [isPlaying, gameOver, score, highScores, onUpdateHighScore, audio, persistState, onClearState]);

    return (
        <div className="relative w-full h-full bg-slate-950 flex flex-col select-none overflow-hidden">
            {/* Top Game Bar */}
            <div className="h-10 bg-slate-900/90 border-b border-cyan-900/50 flex items-center justify-between px-3 shrink-0 z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBackToHub}
                        className="px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5 border border-cyan-800/40 cursor-pointer"
                    >
                        <GameArrowIcon direction="left" className="w-3 h-3" />
                        <span>Меню игр</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">Quantum Hopper</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">Reflex Arcade</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                    <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                        <span className="text-slate-400">Счет:</span>
                        <span className="font-bold text-cyan-400">{score}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                        <span className="text-slate-400">Рекорд:</span>
                        <span className="font-bold text-amber-400">{highScores['quantum_hopper'] || 0}</span>
                    </div>
                    <button
                        onClick={resetGame}
                        className="px-2 py-0.5 text-[11px] rounded bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 cursor-pointer"
                    >
                        Заново
                    </button>
                </div>
            </div>

            {/* Canvas Area */}
            <div
                className="flex-grow flex items-center justify-center p-3 relative cursor-pointer"
                onClick={jump}
            >
                <div className="relative rounded-xl border border-cyan-800/60 shadow-[0_0_40px_rgba(6,182,212,0.2)] overflow-hidden">
                    <canvas
                        ref={canvasRef}
                        width={480}
                        height={340}
                        className="block max-w-full max-h-[340px]"
                    />

                    {/* On-screen Jump Button for touch / mobile */}
                    <div className="absolute bottom-2 right-2 opacity-75 hover:opacity-100 transition-opacity pointer-events-auto">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                jump();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-cyan-700 text-cyan-300 flex items-center justify-center gap-1.5 font-bold text-xs shadow-md active:bg-cyan-800/80 transition-colors cursor-pointer"
                            title="Квантовый прыжок"
                        >
                            <GameArrowIcon direction="up" className="w-3.5 h-3.5" />
                            <span>Jump</span>
                        </button>
                    </div>

                    {/* Click / Tap to start prompt */}
                    {!isPlaying && !gameOver && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs pointer-events-none">
                            <div className="p-4 bg-slate-900/90 rounded-xl border border-cyan-500 shadow-xl flex flex-col items-center gap-2 animate-bounce">
                                <span className="text-2xl">🚀</span>
                                <span className="text-sm font-bold text-cyan-300">Нажмите Пробел или Клик</span>
                                <span className="text-[11px] text-slate-400">для квантового прыжка</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Game Over Modal */}
                {gameOver && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20 animate-fade-in pointer-events-auto">
                        <div className="bg-slate-900 border-2 border-rose-500 p-6 rounded-2xl max-w-xs w-full text-center shadow-[0_0_50px_rgba(244,63,94,0.4)] flex flex-col items-center gap-3">
                            <div className="text-3xl">💥</div>
                            <h2 className="text-lg font-bold text-rose-400 uppercase tracking-widest">Дрон поврежден!</h2>
                            <div className="text-sm font-mono text-slate-200">
                                Пройдено врат: <span className="font-bold text-cyan-400">{score}</span>
                            </div>
                            <div className="flex gap-2 w-full mt-2">
                                <button
                                    onClick={resetGame}
                                    className="flex-1 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-lg shadow-lg cursor-pointer"
                                >
                                    Попробовать снова
                                </button>
                                <button
                                    onClick={onBackToHub}
                                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 cursor-pointer"
                                >
                                    В меню
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Status Bar */}
            <div className="h-6 bg-slate-950 border-t border-slate-800/80 flex items-center px-3 text-[10px] text-slate-400 justify-between shrink-0 font-mono">
                <span>Управление: Пробел / Стрелка Вверх / Клик мыши</span>
                <span>FPS-независимая физика (60-240Hz)</span>
            </div>
        </div>
    );
};
