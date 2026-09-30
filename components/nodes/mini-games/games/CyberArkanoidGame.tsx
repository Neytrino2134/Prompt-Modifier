import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MiniGameProps } from '../types';
import { GameArrowIcon } from '../GameArrowIcon';

interface Brick {
    x: number;
    y: number;
    w: number;
    h: number;
    hp: number;
    color: string;
    points: number;
}

interface Ball {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
}

interface PowerUp {
    x: number;
    y: number;
    vy: number;
    type: 'wide' | 'laser' | 'slow' | 'life';
}

const BALL_INITIAL_SPEED_X = 3.2;
const BALL_INITIAL_SPEED_Y = -3.8;
const POWERUP_FALL_SPEED = 2.0;

export const CyberArkanoidGame: React.FC<MiniGameProps> = ({
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
    const hasValidSaved = !isNewGameRequested && savedState && Array.isArray(savedState.bricks) && savedState.bricks.length > 0 && !savedState.gameOver && !savedState.isWon;

    const [score, setScore] = useState<number>(() => {
        return (hasValidSaved && typeof savedState.score === 'number') ? savedState.score : 0;
    });
    const [lives, setLives] = useState<number>(() => {
        return (hasValidSaved && typeof savedState.lives === 'number') ? savedState.lives : 3;
    });
    const [gameOver, setGameOver] = useState(false);
    const [isWon, setIsWon] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    const paddleRef = useRef<{ x: number; y: number; w: number; h: number }>(
        hasValidSaved && savedState.paddle ? savedState.paddle : { x: 190, y: 360, w: 80, h: 10 }
    );
    const ballsRef = useRef<Ball[]>([{ x: 230, y: 345, vx: BALL_INITIAL_SPEED_X, vy: BALL_INITIAL_SPEED_Y, radius: 6 }]);
    const bricksRef = useRef<Brick[]>(hasValidSaved ? savedState.bricks : []);
    const powerUpsRef = useRef<PowerUp[]>([]);
    const frameIdRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);

    const persistState = useCallback((curScore: number, curLives: number) => {
        if (bricksRef.current.length === 0) return;
        onSaveState?.({
            score: curScore,
            lives: curLives,
            bricks: bricksRef.current,
            paddle: paddleRef.current,
            gameOver: false,
            isWon: false,
            savedAt: Date.now()
        });
    }, [onSaveState]);

    const setupBricks = () => {
        const rows = 5;
        const cols = 8;
        const brickW = 46;
        const brickH = 16;
        const startX = 26;
        const startY = 30;
        const gap = 6;

        const colors = ['#f43f5e', '#fb923c', '#facc15', '#4ade80', '#38bdf8'];
        const newBricks: Brick[] = [];

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                newBricks.push({
                    x: startX + c * (brickW + gap),
                    y: startY + r * (brickH + gap),
                    w: brickW,
                    h: brickH,
                    hp: r === 0 ? 2 : 1,
                    color: colors[r % colors.length],
                    points: (rows - r) * 10
                });
            }
        }
        bricksRef.current = newBricks;
    };

    const resetGame = () => {
        paddleRef.current = { x: 190, y: 360, w: 80, h: 10 };
        ballsRef.current = [{ x: 230, y: 345, vx: BALL_INITIAL_SPEED_X, vy: BALL_INITIAL_SPEED_Y, radius: 6 }];
        powerUpsRef.current = [];
        lastTimeRef.current = 0;
        setupBricks();
        setScore(0);
        setLives(3);
        setGameOver(false);
        setIsWon(false);
        setIsPlaying(false);
        onClearState?.();
        audio.playClick();
    };

    useEffect(() => {
        if (!hasValidSaved) {
            setupBricks();
        }
    }, [hasValidSaved]);

    // Mouse / Touch paddle listener
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const scaleX = canvas.width / rect.width;
        const actualX = mouseX * scaleX;
        paddleRef.current.x = Math.max(0, Math.min(canvas.width - paddleRef.current.w, actualX - paddleRef.current.w / 2));
    };

    const handleClickCanvas = () => {
        if (!isPlaying && !gameOver && !isWon) {
            setIsPlaying(true);
            lastTimeRef.current = 0;
            audio.playLaser();
        }
    };

    // Keyboard listener for arrows
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                paddleRef.current.x = Math.max(0, paddleRef.current.x - 25);
            } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                const max = (canvasRef.current?.width || 460) - paddleRef.current.w;
                paddleRef.current.x = Math.min(max, paddleRef.current.x + 25);
            } else if (e.code === 'Space') {
                if (!isPlaying && !gameOver && !isWon) {
                    setIsPlaying(true);
                    lastTimeRef.current = 0;
                    audio.playLaser();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, gameOver, isWon, audio]);

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

            if (isPlaying && !gameOver && !isWon) {
                const paddle = paddleRef.current;

                // Move balls with delta-time
                for (let bIdx = ballsRef.current.length - 1; bIdx >= 0; bIdx--) {
                    const ball = ballsRef.current[bIdx];
                    ball.x += ball.vx * dt;
                    ball.y += ball.vy * dt;

                    // Wall bounce
                    if (ball.x - ball.radius <= 0) {
                        ball.x = ball.radius;
                        ball.vx = Math.abs(ball.vx);
                        audio.playLaser();
                    } else if (ball.x + ball.radius >= w) {
                        ball.x = w - ball.radius;
                        ball.vx = -Math.abs(ball.vx);
                        audio.playLaser();
                    }

                    if (ball.y - ball.radius <= 0) {
                        ball.y = ball.radius;
                        ball.vy = Math.abs(ball.vy);
                        audio.playLaser();
                    }

                    // Paddle bounce
                    if (
                        ball.y + ball.radius >= paddle.y &&
                        ball.y - ball.radius <= paddle.y + paddle.h &&
                        ball.x >= paddle.x &&
                        ball.x <= paddle.x + paddle.w
                    ) {
                        ball.y = paddle.y - ball.radius;
                        // Calculate bounce angle based on where it hits paddle
                        const hitOffset = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
                        const speed = Math.hypot(ball.vx, ball.vy);
                        const angle = hitOffset * (Math.PI / 3); // max 60 deg
                        ball.vx = speed * Math.sin(angle);
                        ball.vy = -Math.abs(speed * Math.cos(angle));
                        audio.playJump();
                    }

                    // Bottom out
                    if (ball.y - ball.radius > h) {
                        ballsRef.current.splice(bIdx, 1);
                    }

                    // Brick collision
                    for (let i = bricksRef.current.length - 1; i >= 0; i--) {
                        const brick = bricksRef.current[i];
                        if (
                            ball.x + ball.radius > brick.x &&
                            ball.x - ball.radius < brick.x + brick.w &&
                            ball.y + ball.radius > brick.y &&
                            ball.y - ball.radius < brick.y + brick.h
                        ) {
                            ball.vy = -ball.vy;
                            brick.hp -= 1;

                            if (brick.hp <= 0) {
                                const newScore = score + brick.points;
                                setScore(newScore);
                                if (newScore > (highScores['cyber_arkanoid'] || 0)) {
                                    onUpdateHighScore('cyber_arkanoid', newScore);
                                }
                                audio.playExplosion();

                                // Random PowerUp spawn
                                if (Math.random() < 0.25) {
                                    const types: PowerUp['type'][] = ['wide', 'laser', 'slow', 'life'];
                                    powerUpsRef.current.push({
                                        x: brick.x + brick.w / 2,
                                        y: brick.y + brick.h,
                                        vy: POWERUP_FALL_SPEED,
                                        type: types[Math.floor(Math.random() * types.length)]
                                    });
                                }

                                bricksRef.current.splice(i, 1);

                                // Check Victory
                                if (bricksRef.current.length === 0) {
                                    setIsWon(true);
                                    audio.playScore();
                                    onClearState?.();
                                } else {
                                    persistState(newScore, lives);
                                }
                            } else {
                                audio.playLaser();
                                persistState(score, lives);
                            }
                            break;
                        }
                    }
                }

                // Check ball loss
                if (ballsRef.current.length === 0) {
                    const nextLives = lives - 1;
                    setLives(nextLives);
                    if (nextLives <= 0) {
                        setGameOver(true);
                        audio.playGameOver();
                        onClearState?.();
                    } else {
                        // Respawn ball on paddle
                        setIsPlaying(false);
                        lastTimeRef.current = 0;
                        ballsRef.current = [{
                            x: paddle.x + paddle.w / 2,
                            y: paddle.y - 12,
                            vx: BALL_INITIAL_SPEED_X,
                            vy: BALL_INITIAL_SPEED_Y,
                            radius: 6
                        }];
                        audio.playLaser();
                        persistState(score, nextLives);
                    }
                }

                // PowerUps falling & collection with delta-time
                for (let i = powerUpsRef.current.length - 1; i >= 0; i--) {
                    const pu = powerUpsRef.current[i];
                    pu.y += pu.vy * dt;

                    if (
                        pu.y >= paddle.y &&
                        pu.y <= paddle.y + paddle.h + 10 &&
                        pu.x >= paddle.x &&
                        pu.x <= paddle.x + paddle.w
                    ) {
                        // Apply powerup
                        if (pu.type === 'wide') {
                            paddle.w = Math.min(140, paddle.w + 25);
                        } else if (pu.type === 'life') {
                            setLives(l => l + 1);
                        } else if (pu.type === 'laser') {
                            setScore(s => s + 50);
                        } else if (pu.type === 'slow') {
                            ballsRef.current.forEach(b => {
                                b.vx *= 0.82;
                                b.vy *= 0.82;
                            });
                        }
                        audio.playPowerup();
                        powerUpsRef.current.splice(i, 1);
                    } else if (pu.y > h) {
                        powerUpsRef.current.splice(i, 1);
                    }
                }
            }

            // Render
            ctx.clearRect(0, 0, w, h);

            // Cyber Background
            ctx.fillStyle = '#030712';
            ctx.fillRect(0, 0, w, h);

            // Draw Bricks
            bricksRef.current.forEach(b => {
                ctx.save();
                ctx.fillStyle = b.color;
                ctx.shadowColor = b.color;
                ctx.shadowBlur = b.hp > 1 ? 12 : 4;
                ctx.beginPath();
                ctx.roundRect(b.x, b.y, b.w, b.h, 3);
                ctx.fill();

                if (b.hp > 1) {
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }
                ctx.restore();
            });

            // Draw PowerUps
            powerUpsRef.current.forEach(pu => {
                ctx.save();
                ctx.fillStyle = pu.type === 'life' ? '#ec4899' : pu.type === 'wide' ? '#38bdf8' : '#eab308';
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(pu.x, pu.y, 7, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            // Draw Paddle
            const pad = paddleRef.current;
            ctx.save();
            const padGrad = ctx.createLinearGradient(pad.x, pad.y, pad.x + pad.w, pad.y);
            padGrad.addColorStop(0, '#06b6d4');
            padGrad.addColorStop(0.5, '#67e8f9');
            padGrad.addColorStop(1, '#0284c7');
            ctx.fillStyle = padGrad;
            ctx.shadowColor = '#06b6d4';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.roundRect(pad.x, pad.y, pad.w, pad.h, 4);
            ctx.fill();
            ctx.restore();

            // Draw Balls
            ballsRef.current.forEach(ball => {
                ctx.save();
                ctx.fillStyle = '#f8fafc';
                ctx.shadowColor = '#38bdf8';
                ctx.shadowBlur = 14;
                ctx.beginPath();
                ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            frameIdRef.current = requestAnimationFrame(loop);
        };

        frameIdRef.current = requestAnimationFrame(loop);

        return () => {
            isRunning = false;
            if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
        };
    }, [isPlaying, gameOver, isWon, score, lives, highScores, onUpdateHighScore, audio, persistState, onClearState]);

    return (
        <div className="relative w-full h-full bg-slate-950 flex flex-col select-none overflow-hidden">
            {/* Top Game Bar */}
            <div className="h-10 bg-slate-900/90 border-b border-rose-900/50 flex items-center justify-between px-3 shrink-0 z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBackToHub}
                        className="px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1.5 border border-rose-800/40 cursor-pointer"
                    >
                        <GameArrowIcon direction="left" className="w-3 h-3" />
                        <span>Меню игр</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-rose-300">Cyber Arkanoid</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">Brick Breaker</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                    <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                        <span className="text-slate-400">Счет:</span>
                        <span className="font-bold text-rose-400">{score}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                        <span className="text-slate-400">Жизни:</span>
                        <span className="font-bold text-pink-400">{'❤️'.repeat(Math.max(0, lives))}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                        <span className="text-slate-400">Рекорд:</span>
                        <span className="font-bold text-amber-400">{highScores['cyber_arkanoid'] || 0}</span>
                    </div>
                    <button
                        onClick={resetGame}
                        className="px-2 py-0.5 text-[11px] rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 cursor-pointer"
                    >
                        Заново
                    </button>
                </div>
            </div>

            {/* Canvas Area */}
            <div
                className="flex-grow flex items-center justify-center p-3 relative cursor-crosshair"
                onClick={handleClickCanvas}
            >
                <div className="relative rounded-xl border border-rose-800/60 shadow-[0_0_40px_rgba(244,63,94,0.15)] overflow-hidden">
                    <canvas
                        ref={canvasRef}
                        width={460}
                        height={380}
                        onMouseMove={handleMouseMove}
                        className="block max-w-full max-h-[380px]"
                    />

                    {/* On-screen paddle buttons for touch/click */}
                    <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-70 hover:opacity-100 transition-opacity pointer-events-auto">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                paddleRef.current.x = Math.max(0, paddleRef.current.x - 30);
                            }}
                            className="w-8 h-8 rounded bg-slate-900/90 border border-rose-700 text-rose-300 flex items-center justify-center font-bold text-xs shadow-md active:bg-rose-800/80 transition-colors cursor-pointer"
                            title="Влево"
                        >
                            <GameArrowIcon direction="left" className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const max = (canvasRef.current?.width || 460) - paddleRef.current.w;
                                paddleRef.current.x = Math.min(max, paddleRef.current.x + 30);
                            }}
                            className="w-8 h-8 rounded bg-slate-900/90 border border-rose-700 text-rose-300 flex items-center justify-center font-bold text-xs shadow-md active:bg-rose-800/80 transition-colors cursor-pointer"
                            title="Вправо"
                        >
                            <GameArrowIcon direction="right" className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Start Prompt */}
                    {!isPlaying && !gameOver && !isWon && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs pointer-events-none">
                            <div className="p-4 bg-slate-900/90 rounded-xl border border-rose-500 shadow-xl flex flex-col items-center gap-2 animate-bounce">
                                <span className="text-2xl">⚡</span>
                                <span className="text-sm font-bold text-rose-300">Кликните или Пробел</span>
                                <span className="text-[11px] text-slate-400">для запуска плазменного шара</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Game Over Modal */}
                {gameOver && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20 animate-fade-in pointer-events-auto">
                        <div className="bg-slate-900 border-2 border-rose-500 p-6 rounded-2xl max-w-xs w-full text-center shadow-[0_0_50px_rgba(244,63,94,0.4)] flex flex-col items-center gap-3">
                            <div className="text-3xl">💥</div>
                            <h2 className="text-lg font-bold text-rose-400 uppercase tracking-widest">Платформа уничтожена!</h2>
                            <div className="text-sm font-mono text-slate-200">
                                Счет: <span className="font-bold text-rose-400">{score}</span>
                            </div>
                            <div className="flex gap-2 w-full mt-2">
                                <button
                                    onClick={resetGame}
                                    className="flex-1 py-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs rounded-lg shadow-lg cursor-pointer"
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

                {/* Won Modal */}
                {isWon && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20 animate-fade-in pointer-events-auto">
                        <div className="bg-slate-900 border-2 border-emerald-500 p-6 rounded-2xl max-w-xs w-full text-center shadow-[0_0_50px_rgba(16,185,129,0.4)] flex flex-col items-center gap-3">
                            <div className="text-4xl animate-bounce">🏆</div>
                            <h2 className="text-lg font-bold text-emerald-400 uppercase tracking-widest">Матрица очищена!</h2>
                            <p className="text-xs text-slate-300">Все поврежденные блоки данных уничтожены.</p>
                            <div className="text-sm font-mono text-slate-200">
                                Итоговый счет: <span className="font-bold text-emerald-400">{score}</span>
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
                <span>Управление: Мышь / Стрелки Влево-Вправо / A-D</span>
                <span>FPS-независимая физика (60-240Hz)</span>
            </div>
        </div>
    );
};
