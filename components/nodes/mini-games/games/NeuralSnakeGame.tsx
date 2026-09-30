import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MiniGameProps } from '../types';
import { GameArrowIcon } from '../GameArrowIcon';

interface Point {
    x: number;
    y: number;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    alpha: number;
    color: string;
}

const GRID_SIZE = 20;

export const NeuralSnakeGame: React.FC<MiniGameProps> = ({
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
    const hasValidSaved = !isNewGameRequested &&
        savedState &&
        Array.isArray(savedState.snake) &&
        savedState.snake.length >= 3 &&
        !savedState.gameOver;

    const [score, setScore] = useState<number>(() => {
        return (hasValidSaved && typeof savedState.score === 'number') ? savedState.score : 0;
    });
    const [gameOver, setGameOver] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [speed, setSpeed] = useState<number>(() => {
        return (hasValidSaved && typeof savedState.speed === 'number') ? savedState.speed : 110;
    });

    const snakeRef = useRef<Point[]>(
        hasValidSaved ? savedState.snake : [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 }
        ]
    );
    const dirRef = useRef<Point>(hasValidSaved && savedState.dir ? savedState.dir : { x: 1, y: 0 });
    const nextDirRef = useRef<Point>(hasValidSaved && savedState.dir ? savedState.dir : { x: 1, y: 0 });
    const foodRef = useRef<{ x: number; y: number; type: 'data' | 'gold' | 'energy' }>(
        hasValidSaved && savedState.food ? savedState.food : { x: 15, y: 10, type: 'data' }
    );
    const particlesRef = useRef<Particle[]>([]);
    const frameIdRef = useRef<number>(0);
    const lastTickRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);

    const persistState = useCallback((currentScore: number, currentSpeed: number) => {
        onSaveState?.({
            snake: snakeRef.current,
            dir: dirRef.current,
            food: foodRef.current,
            score: currentScore,
            speed: currentSpeed,
            gameOver: false,
            savedAt: Date.now()
        });
    }, [onSaveState]);

    const spawnFood = useCallback(() => {
        const typeRand = Math.random();
        const type = typeRand > 0.85 ? 'gold' : typeRand > 0.7 ? 'energy' : 'data';
        let newX = Math.floor(Math.random() * GRID_SIZE);
        let newY = Math.floor(Math.random() * GRID_SIZE);
        while (snakeRef.current.some(s => s.x === newX && s.y === newY)) {
            newX = Math.floor(Math.random() * GRID_SIZE);
            newY = Math.floor(Math.random() * GRID_SIZE);
        }
        foodRef.current = { x: newX, y: newY, type };
    }, []);

    const spawnParticles = (x: number, y: number, color: string, count = 12) => {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 3 + 1;
            particlesRef.current.push({
                x,
                y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                alpha: 1,
                color
            });
        }
    };

    const resetGame = useCallback(() => {
        snakeRef.current = [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 }
        ];
        dirRef.current = { x: 1, y: 0 };
        nextDirRef.current = { x: 1, y: 0 };
        particlesRef.current = [];
        lastTickRef.current = 0;
        lastTimeRef.current = 0;
        setScore(0);
        setSpeed(110);
        setGameOver(false);
        setIsPaused(false);
        spawnFood();
        onClearState?.();
        audio.playClick();
    }, [spawnFood, onClearState, audio]);

    const changeDirection = useCallback((newDir: Point) => {
        if (isPaused) {
            setIsPaused(false);
        }
        if (newDir.x !== 0 && dirRef.current.x === 0) {
            nextDirRef.current = newDir;
        } else if (newDir.y !== 0 && dirRef.current.y === 0) {
            nextDirRef.current = newDir;
        }
    }, [isPaused]);

    // Keyboard listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['ArrowUp', 'KeyW'].includes(e.code)) {
                e.preventDefault();
                changeDirection({ x: 0, y: -1 });
            } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
                e.preventDefault();
                changeDirection({ x: 0, y: 1 });
            } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
                e.preventDefault();
                changeDirection({ x: -1, y: 0 });
            } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
                e.preventDefault();
                changeDirection({ x: 1, y: 0 });
            } else if (e.code === 'Space') {
                e.preventDefault();
                setIsPaused(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [changeDirection]);

    // Game loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let isRunning = true;

        const loop = (timestamp: number) => {
            if (!isRunning) return;

            if (!lastTimeRef.current) {
                lastTimeRef.current = timestamp;
            }
            const elapsedMs = Math.min(Math.max(timestamp - lastTimeRef.current, 0), 100);
            lastTimeRef.current = timestamp;
            const dt = Math.min(Math.max(elapsedMs / (1000 / 60), 0.05), 3.0);

            // Tick game logic
            if (!gameOver && !isPaused) {
                if (!lastTickRef.current || timestamp - lastTickRef.current > speed) {
                    lastTickRef.current = timestamp;

                    dirRef.current = nextDirRef.current;
                    const head = snakeRef.current[0];
                    const newHead: Point = {
                        x: (head.x + dirRef.current.x + GRID_SIZE) % GRID_SIZE,
                        y: (head.y + dirRef.current.y + GRID_SIZE) % GRID_SIZE
                    };

                    // Check collision with self
                    if (snakeRef.current.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
                        setGameOver(true);
                        audio.playGameOver();
                        onClearState?.();
                    } else {
                        const newSnake = [newHead, ...snakeRef.current];

                        // Check food eaten
                        if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
                            const foodType = foodRef.current.type;
                            const pts = foodType === 'gold' ? 30 : foodType === 'energy' ? 20 : 10;
                            const newScore = score + pts;
                            setScore(newScore);
                            if (newScore > (highScores['neural_snake'] || 0)) {
                                onUpdateHighScore('neural_snake', newScore);
                            }

                            const cellWidth = canvas.width / GRID_SIZE;
                            const cellHeight = canvas.height / GRID_SIZE;
                            const px = (newHead.x + 0.5) * cellWidth;
                            const py = (newHead.y + 0.5) * cellHeight;

                            if (foodType === 'gold') {
                                spawnParticles(px, py, '#f59e0b', 16);
                                audio.playPowerup();
                            } else {
                                spawnParticles(px, py, '#10b981', 12);
                                audio.playScore();
                            }

                            // Increase speed slightly
                            const nextSpeed = Math.max(55, speed - 1.5);
                            setSpeed(nextSpeed);
                            spawnFood();
                            persistState(newScore, nextSpeed);
                        } else {
                            newSnake.pop();
                        }

                        snakeRef.current = newSnake;
                    }
                }
            }

            // Draw
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const w = canvas.width;
            const h = canvas.height;
            const cellW = w / GRID_SIZE;
            const cellH = h / GRID_SIZE;

            // Background Grid
            ctx.fillStyle = '#030712';
            ctx.fillRect(0, 0, w, h);

            ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
            ctx.lineWidth = 1;
            for (let i = 0; i <= GRID_SIZE; i++) {
                ctx.beginPath();
                ctx.moveTo(i * cellW, 0);
                ctx.lineTo(i * cellW, h);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(0, i * cellH);
                ctx.lineTo(w, i * cellH);
                ctx.stroke();
            }

            // Draw Food
            const f = foodRef.current;
            const fx = f.x * cellW + cellW / 2;
            const fy = f.y * cellH + cellH / 2;
            const foodRad = (cellW / 2) * 0.75;

            ctx.save();
            ctx.beginPath();
            ctx.arc(fx, fy, foodRad, 0, Math.PI * 2);
            if (f.type === 'gold') {
                ctx.fillStyle = '#fbbf24';
                ctx.shadowColor = '#f59e0b';
                ctx.shadowBlur = 15;
            } else if (f.type === 'energy') {
                ctx.fillStyle = '#38bdf8';
                ctx.shadowColor = '#0284c7';
                ctx.shadowBlur = 12;
            } else {
                ctx.fillStyle = '#34d399';
                ctx.shadowColor = '#10b981';
                ctx.shadowBlur = 10;
            }
            ctx.fill();
            ctx.restore();

            // Draw Snake
            snakeRef.current.forEach((segment, i) => {
                const sx = segment.x * cellW + 1;
                const sy = segment.y * cellH + 1;
                const sw = cellW - 2;
                const sh = cellH - 2;

                ctx.save();
                if (i === 0) {
                    // Head
                    ctx.fillStyle = '#22d3ee';
                    ctx.shadowColor = '#06b6d4';
                    ctx.shadowBlur = 12;
                    ctx.beginPath();
                    ctx.roundRect(sx, sy, sw, sh, 4);
                    ctx.fill();

                    // Eyes
                    ctx.fillStyle = '#0f172a';
                    const eyeRad = sw * 0.15;
                    ctx.beginPath();
                    ctx.arc(sx + sw * 0.3, sy + sh * 0.3, eyeRad, 0, Math.PI * 2);
                    ctx.arc(sx + sw * 0.7, sy + sh * 0.3, eyeRad, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    // Body gradient
                    const ratio = 1 - i / snakeRef.current.length;
                    ctx.fillStyle = `rgba(16, 185, 129, ${0.4 + ratio * 0.6})`;
                    ctx.shadowColor = '#10b981';
                    ctx.shadowBlur = 4;
                    ctx.beginPath();
                    ctx.roundRect(sx, sy, sw, sh, 3);
                    ctx.fill();
                }
                ctx.restore();
            });

            // Draw Particles (with delta-time)
            for (let i = particlesRef.current.length - 1; i >= 0; i--) {
                const p = particlesRef.current[i];
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.alpha -= 0.03 * dt;

                if (p.alpha <= 0) {
                    particlesRef.current.splice(i, 1);
                } else {
                    ctx.save();
                    ctx.globalAlpha = p.alpha;
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            frameIdRef.current = requestAnimationFrame(loop);
        };

        frameIdRef.current = requestAnimationFrame(loop);

        return () => {
            isRunning = false;
            if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
        };
    }, [gameOver, isPaused, speed, score, spawnFood, highScores, onUpdateHighScore, audio, persistState, onClearState]);

    return (
        <div className="relative w-full h-full bg-slate-950 flex flex-col select-none overflow-hidden">
            {/* Top Game Bar */}
            <div className="h-10 bg-slate-900/90 border-b border-emerald-900/50 flex items-center justify-between px-3 shrink-0 z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBackToHub}
                        className="px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1.5 border border-emerald-800/40 cursor-pointer"
                    >
                        <GameArrowIcon direction="left" className="w-3 h-3" />
                        <span>Меню игр</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Neural Snake</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">Neon Arcade</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                    <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                        <span className="text-slate-400">Счет:</span>
                        <span className="font-bold text-emerald-400">{score}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                        <span className="text-slate-400">Рекорд:</span>
                        <span className="font-bold text-amber-400">{highScores['neural_snake'] || 0}</span>
                    </div>
                    <button
                        onClick={() => setIsPaused(p => !p)}
                        className="px-2 py-0.5 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                        {isPaused ? (
                            <>
                                <GameArrowIcon direction="right" className="w-2.5 h-2.5 text-emerald-400" />
                                <span>Продолжить</span>
                            </>
                        ) : (
                            <span>⏸ Пауза</span>
                        )}
                    </button>
                    <button
                        onClick={resetGame}
                        className="px-2 py-0.5 text-[11px] rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 cursor-pointer"
                    >
                        Заново
                    </button>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-grow flex items-center justify-center p-3 relative">
                <div
                    className="relative rounded-xl border border-emerald-800/60 shadow-[0_0_40px_rgba(16,185,129,0.15)] overflow-hidden cursor-pointer"
                    onClick={() => { if (isPaused) setIsPaused(false); }}
                >
                    <canvas
                        ref={canvasRef}
                        width={420}
                        height={420}
                        className="block max-w-full max-h-[380px] sm:max-h-[420px] aspect-square"
                    />

                    {/* Pause Overlay */}
                    {isPaused && !gameOver && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2 pointer-events-auto">
                            <div className="p-4 bg-slate-900/90 rounded-xl border border-emerald-500 shadow-xl flex flex-col items-center gap-2 animate-bounce">
                                <span className="text-2xl">⏸</span>
                                <span className="text-sm font-bold text-emerald-300">Игра на паузе</span>
                                <button
                                    onClick={() => setIsPaused(false)}
                                    className="mt-1 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-md flex items-center gap-1.5 cursor-pointer"
                                >
                                    <GameArrowIcon direction="right" className="w-3 h-3" />
                                    <span>Продолжить</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* D-Pad overlay for mobile / touch / click */}
                    <div className="absolute bottom-2 right-2 flex flex-col items-center gap-1 opacity-75 hover:opacity-100 transition-opacity pointer-events-auto">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                changeDirection({ x: 0, y: -1 });
                            }}
                            className="w-8 h-8 rounded bg-slate-900/90 border border-emerald-700 text-emerald-300 flex items-center justify-center font-bold text-xs shadow-md active:bg-emerald-800/80 transition-colors cursor-pointer"
                            title="Вверх"
                        >
                            <GameArrowIcon direction="up" className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex gap-1">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    changeDirection({ x: -1, y: 0 });
                                }}
                                className="w-8 h-8 rounded bg-slate-900/90 border border-emerald-700 text-emerald-300 flex items-center justify-center font-bold text-xs shadow-md active:bg-emerald-800/80 transition-colors cursor-pointer"
                                title="Влево"
                            >
                                <GameArrowIcon direction="left" className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    changeDirection({ x: 0, y: 1 });
                                }}
                                className="w-8 h-8 rounded bg-slate-900/90 border border-emerald-700 text-emerald-300 flex items-center justify-center font-bold text-xs shadow-md active:bg-emerald-800/80 transition-colors cursor-pointer"
                                title="Вниз"
                            >
                                <GameArrowIcon direction="down" className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    changeDirection({ x: 1, y: 0 });
                                }}
                                className="w-8 h-8 rounded bg-slate-900/90 border border-emerald-700 text-emerald-300 flex items-center justify-center font-bold text-xs shadow-md active:bg-emerald-800/80 transition-colors cursor-pointer"
                                title="Вправо"
                            >
                                <GameArrowIcon direction="right" className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Game Over Modal */}
                {gameOver && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20 animate-fade-in pointer-events-auto">
                        <div className="bg-slate-900 border-2 border-emerald-500 p-6 rounded-2xl max-w-xs w-full text-center shadow-[0_0_50px_rgba(16,185,129,0.4)] flex flex-col items-center gap-3">
                            <div className="text-3xl">💥</div>
                            <h2 className="text-lg font-bold text-emerald-400 uppercase tracking-widest">Коллизия потока!</h2>
                            <div className="text-sm font-mono text-slate-200">
                                Счет: <span className="font-bold text-emerald-400">{score}</span>
                            </div>
                            <div className="flex gap-2 w-full mt-2">
                                <button
                                    onClick={resetGame}
                                    className="flex-1 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-lg shadow-lg cursor-pointer"
                                >
                                    Играть снова
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
                <span>Управление: Стрелки / WASD / Пробел (Пауза)</span>
                <span>Зеленый = +10, Синий = +20, Золотой = +30</span>
            </div>
        </div>
    );
};
