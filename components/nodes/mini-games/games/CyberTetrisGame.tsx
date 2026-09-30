import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MiniGameProps } from '../types';
import { GameArrowIcon } from '../GameArrowIcon';

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 18; // Logical pixel size for canvas blocks

type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

interface TetrominoDef {
    shape: number[][];
    color: string;
    glow: string;
    border: string;
}

const TETROMINOES: Record<TetrominoType, TetrominoDef> = {
    I: {
        shape: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        color: '#06b6d4',
        glow: 'rgba(6, 182, 212, 0.7)',
        border: '#22d3ee'
    },
    J: {
        shape: [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#3b82f6',
        glow: 'rgba(59, 130, 246, 0.7)',
        border: '#60a5fa'
    },
    L: {
        shape: [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#f97316',
        glow: 'rgba(249, 115, 22, 0.7)',
        border: '#fb923c'
    },
    O: {
        shape: [
            [1, 1],
            [1, 1]
        ],
        color: '#eab308',
        glow: 'rgba(234, 179, 8, 0.7)',
        border: '#fde047'
    },
    S: {
        shape: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        color: '#10b981',
        glow: 'rgba(16, 185, 129, 0.7)',
        border: '#34d399'
    },
    T: {
        shape: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#a855f7',
        glow: 'rgba(168, 85, 247, 0.7)',
        border: '#c084fc'
    },
    Z: {
        shape: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ],
        color: '#f43f5e',
        glow: 'rgba(244, 63, 94, 0.7)',
        border: '#fb7185'
    }
};

const TETROMINO_KEYS: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    alpha: number;
    color: string;
    size: number;
}

interface Piece {
    type: TetrominoType;
    shape: number[][];
    x: number;
    y: number;
}

// 7-bag randomizer
const createBag = (): TetrominoType[] => {
    const bag = [...TETROMINO_KEYS];
    for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    return bag;
};

// Pure factory to create piece geometry
const createPiece = (type: TetrominoType): Piece => {
    const shape = TETROMINOES[type].shape.map(r => [...r]);
    const startX = Math.floor((COLS - shape[0].length) / 2);
    const startY = type === 'I' ? -1 : 0;
    return {
        type,
        shape,
        x: startX,
        y: startY
    };
};

export const CyberTetrisGame: React.FC<MiniGameProps> = ({
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
    const nextCanvasRef = useRef<HTMLCanvasElement>(null);
    const holdCanvasRef = useRef<HTMLCanvasElement>(null);

    const hasValidSaved = !isNewGameRequested &&
        savedState &&
        Array.isArray(savedState.grid) &&
        savedState.grid.length === ROWS &&
        !savedState.gameOver;

    const [score, setScore] = useState<number>(() => {
        return (hasValidSaved && typeof savedState.score === 'number') ? savedState.score : 0;
    });
    const [lines, setLines] = useState<number>(() => {
        return (hasValidSaved && typeof savedState.lines === 'number') ? savedState.lines : 0;
    });
    const [level, setLevel] = useState<number>(() => {
        return (hasValidSaved && typeof savedState.level === 'number') ? savedState.level : 1;
    });
    const [gameOver, setGameOver] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    const scoreRef = useRef<number>(score);
    const linesRef = useRef<number>(lines);
    const levelRef = useRef<number>(level);
    scoreRef.current = score;
    linesRef.current = lines;
    levelRef.current = level;

    // Tetris bag and piece state refs
    const bagRef = useRef<TetrominoType[]>([]);

    const getNextPieceType = useCallback((): TetrominoType => {
        if (bagRef.current.length === 0) {
            bagRef.current = createBag();
        }
        return bagRef.current.pop() || 'I';
    }, []);

    const nextPieceRef = useRef<TetrominoType>('I');
    const holdPieceRef = useRef<TetrominoType | null>(null);
    const canHoldRef = useRef<boolean>(true);
    const gridRef = useRef<(string | null)[][]>([]);
    const currentPieceRef = useRef<Piece>(createPiece('T'));
    const isInitializedRef = useRef(false);

    if (!isInitializedRef.current) {
        isInitializedRef.current = true;
        if (hasValidSaved) {
            gridRef.current = savedState.grid;
            currentPieceRef.current = savedState.currentPiece || createPiece('T');
            nextPieceRef.current = savedState.nextType || 'I';
            holdPieceRef.current = savedState.holdType || null;
            bagRef.current = Array.isArray(savedState.bag) && savedState.bag.length > 0 ? savedState.bag : createBag();
        } else {
            gridRef.current = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
            const newBag = createBag();
            const firstType = newBag.pop() || 'T';
            const secondType = newBag.pop() || 'I';
            bagRef.current = newBag;
            nextPieceRef.current = secondType;
            currentPieceRef.current = createPiece(firstType);
            holdPieceRef.current = null;
        }
    }

    const particlesRef = useRef<Particle[]>([]);
    const frameIdRef = useRef<number>(0);
    const lastTickRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);
    const lockDelayStartRef = useRef<number | null>(null);

    const persistState = useCallback((curScore: number, curLines: number, curLevel: number) => {
        onSaveState?.({
            grid: gridRef.current,
            currentPiece: currentPieceRef.current,
            nextType: nextPieceRef.current,
            holdType: holdPieceRef.current,
            bag: bagRef.current,
            score: curScore,
            lines: curLines,
            level: curLevel,
            gameOver: false,
            savedAt: Date.now()
        });
    }, [onSaveState]);

    const spawnParticles = (x: number, y: number, color: string, count = 10) => {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 3 + 1;
            particlesRef.current.push({
                x,
                y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd - 1,
                alpha: 1,
                color,
                size: Math.random() * 3 + 2
            });
        }
    };

    // Collision check
    const checkCollision = (piece: Piece, offsetX = 0, offsetY = 0, customShape?: number[][]): boolean => {
        const shape = customShape || piece.shape;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] !== 0) {
                    const newX = piece.x + c + offsetX;
                    const newY = piece.y + r + offsetY;

                    if (newX < 0 || newX >= COLS || newY >= ROWS) {
                        return true;
                    }
                    if (newY >= 0 && gridRef.current[newY][newX] !== null) {
                        return true;
                    }
                }
            }
        }
        return false;
    };

    // Rotate matrix clockwise
    const rotateMatrix = (matrix: number[][]): number[][] => {
        const N = matrix.length;
        const result = Array.from({ length: N }, () => Array(N).fill(0));
        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                result[c][N - 1 - r] = matrix[r][c];
            }
        }
        return result;
    };

    // Lock piece and clear completed lines
    const lockPiece = useCallback(() => {
        const piece = currentPieceRef.current;
        const def = TETROMINOES[piece.type];

        for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
                if (piece.shape[r][c] !== 0) {
                    const gx = piece.x + c;
                    const gy = piece.y + r;
                    if (gy < 0) {
                        // Spawn block out of bounds -> Game Over
                        setGameOver(true);
                        audio.playGameOver();
                        onClearState?.();
                        return;
                    }
                    gridRef.current[gy][gx] = def.color;
                }
            }
        }

        // Check line clears
        let clearedLines = 0;
        const newGrid: (string | null)[][] = [];

        for (let r = 0; r < ROWS; r++) {
            const isFull = gridRef.current[r].every(cell => cell !== null);
            if (isFull) {
                clearedLines++;
                // Spawn particles across the line
                for (let c = 0; c < COLS; c++) {
                    const cellColor = gridRef.current[r][c] || '#06b6d4';
                    spawnParticles((c + 0.5) * BLOCK_SIZE, (r + 0.5) * BLOCK_SIZE, cellColor, 6);
                }
            } else {
                newGrid.push(gridRef.current[r]);
            }
        }

        while (newGrid.length < ROWS) {
            newGrid.unshift(Array(COLS).fill(null));
        }
        gridRef.current = newGrid;

        const curLvl = levelRef.current;
        const curScore = scoreRef.current;
        const curLines = linesRef.current;

        if (clearedLines > 0) {
            const pointsTable = [0, 100, 300, 500, 800];
            const gainedScore = (pointsTable[clearedLines] || 100) * curLvl;
            const newScore = curScore + gainedScore;
            const newLines = curLines + clearedLines;
            const newLevel = Math.floor(newLines / 10) + 1;

            scoreRef.current = newScore;
            linesRef.current = newLines;
            levelRef.current = newLevel;

            setScore(newScore);
            setLines(newLines);
            setLevel(newLevel);

            if (newScore > (highScores['cyber_tetris'] || 0)) {
                onUpdateHighScore('cyber_tetris', newScore);
            }

            if (clearedLines === 4) {
                audio.playPowerup();
            } else {
                audio.playScore();
            }

            persistState(newScore, newLines, newLevel);
        } else {
            audio.playClick();
            persistState(curScore, curLines, curLvl);
        }

        // Advance to next piece
        const nextType = nextPieceRef.current;
        nextPieceRef.current = getNextPieceType();
        const nextP = createPiece(nextType);
        currentPieceRef.current = nextP;
        canHoldRef.current = true;
        lockDelayStartRef.current = null;

        // Check if new piece immediately collides -> Game Over
        if (checkCollision(nextP)) {
            setGameOver(true);
            audio.playGameOver();
            onClearState?.();
        }
    }, [highScores, onUpdateHighScore, audio, onClearState, persistState, getNextPieceType]);

    // Move piece left
    const moveLeft = useCallback(() => {
        if (gameOver || isPaused) return;
        if (!checkCollision(currentPieceRef.current, -1, 0)) {
            currentPieceRef.current.x -= 1;
            audio.playClick();
        }
    }, [gameOver, isPaused, audio]);

    // Move piece right
    const moveRight = useCallback(() => {
        if (gameOver || isPaused) return;
        if (!checkCollision(currentPieceRef.current, 1, 0)) {
            currentPieceRef.current.x += 1;
            audio.playClick();
        }
    }, [gameOver, isPaused, audio]);

    // Soft drop (down arrow / S)
    const softDrop = useCallback(() => {
        if (gameOver || isPaused) return;
        if (!checkCollision(currentPieceRef.current, 0, 1)) {
            currentPieceRef.current.y += 1;
            setScore(s => {
                const updated = s + 1;
                scoreRef.current = updated;
                return updated;
            });
            audio.playClick();
        }
    }, [gameOver, isPaused, audio]);

    // Hard drop (space)
    const hardDrop = useCallback(() => {
        if (gameOver || isPaused) return;
        let dropDistance = 0;
        while (!checkCollision(currentPieceRef.current, 0, dropDistance + 1)) {
            dropDistance++;
        }
        currentPieceRef.current.y += dropDistance;
        if (dropDistance > 0) {
            setScore(s => {
                const updated = s + dropDistance * 2;
                scoreRef.current = updated;
                return updated;
            });
        }
        audio.playLaser();
        lockPiece();
    }, [gameOver, isPaused, audio, lockPiece]);

    // Rotate piece (up arrow / W)
    const rotatePiece = useCallback(() => {
        if (gameOver || isPaused) return;
        const current = currentPieceRef.current;
        const rotated = rotateMatrix(current.shape);

        // Standard wall kick attempts
        const kicks = [0, 1, -1, 2, -2];
        for (const kick of kicks) {
            if (!checkCollision(current, kick, 0, rotated)) {
                current.shape = rotated;
                current.x += kick;
                audio.playJump();
                return;
            }
        }
    }, [gameOver, isPaused, audio]);

    // Hold piece (C / Shift)
    const holdPiece = useCallback(() => {
        if (gameOver || isPaused || !canHoldRef.current) return;
        canHoldRef.current = false;
        const curType = currentPieceRef.current.type;

        if (holdPieceRef.current === null) {
            holdPieceRef.current = curType;
            const nextType = nextPieceRef.current;
            nextPieceRef.current = getNextPieceType();
            currentPieceRef.current = createPiece(nextType);
        } else {
            const toSpawn = holdPieceRef.current;
            holdPieceRef.current = curType;
            currentPieceRef.current = createPiece(toSpawn);
        }
        lockDelayStartRef.current = null;
        audio.playMerge();
    }, [gameOver, isPaused, getNextPieceType, audio]);

    // Reset game
    const resetGame = useCallback(() => {
        gridRef.current = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
        const bag = createBag();
        const firstType = bag.pop() || 'T';
        const secondType = bag.pop() || 'I';
        bagRef.current = bag;
        nextPieceRef.current = secondType;
        holdPieceRef.current = null;
        canHoldRef.current = true;
        currentPieceRef.current = createPiece(firstType);
        particlesRef.current = [];
        lastTickRef.current = 0;
        lastTimeRef.current = 0;
        lockDelayStartRef.current = null;
        scoreRef.current = 0;
        linesRef.current = 0;
        levelRef.current = 1;
        setScore(0);
        setLines(0);
        setLevel(1);
        setGameOver(false);
        setIsPaused(false);
        onClearState?.();
        audio.playClick();
    }, [onClearState, audio]);

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['ArrowLeft', 'KeyA'].includes(e.code)) {
                e.preventDefault();
                moveLeft();
            } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
                e.preventDefault();
                moveRight();
            } else if (['ArrowUp', 'KeyW'].includes(e.code)) {
                e.preventDefault();
                rotatePiece();
            } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
                e.preventDefault();
                softDrop();
            } else if (e.code === 'Space') {
                e.preventDefault();
                hardDrop();
            } else if (['KeyC', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
                e.preventDefault();
                holdPiece();
            } else if (e.code === 'KeyP') {
                e.preventDefault();
                setIsPaused(p => !p);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [moveLeft, moveRight, rotatePiece, softDrop, hardDrop, holdPiece]);

    // Helper to calculate ghost piece position
    const getGhostY = (): number => {
        const piece = currentPieceRef.current;
        let ghostY = piece.y;
        while (!checkCollision(piece, 0, ghostY - piece.y + 1)) {
            ghostY++;
        }
        return ghostY;
    };

    // Draw preview mini canvases (Next / Hold)
    const drawMiniCanvas = (canvas: HTMLCanvasElement | null, type: TetrominoType | null) => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (!type) return;

        const def = TETROMINOES[type];
        const shape = def.shape;
        const miniSize = 14;
        const offsetX = (canvas.width - shape[0].length * miniSize) / 2;
        const offsetY = (canvas.height - shape.length * miniSize) / 2;

        ctx.save();
        ctx.shadowColor = def.glow;
        ctx.shadowBlur = 8;
        ctx.fillStyle = def.color;
        ctx.strokeStyle = def.border;
        ctx.lineWidth = 1;

        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] !== 0) {
                    const bx = offsetX + c * miniSize;
                    const by = offsetY + r * miniSize;
                    ctx.beginPath();
                    ctx.roundRect(bx, by, miniSize - 2, miniSize - 2, 2);
                    ctx.fill();
                    ctx.stroke();
                }
            }
        }
        ctx.restore();
    };

    // Game loop with delta-time & lock delay
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
                const curLvl = levelRef.current;
                const fallSpeedMs = Math.max(70, 800 - (curLvl - 1) * 70);

                if (!lastTickRef.current) {
                    lastTickRef.current = timestamp;
                }

                const isTouchingGround = checkCollision(currentPieceRef.current, 0, 1);

                if (isTouchingGround) {
                    if (lockDelayStartRef.current === null) {
                        lockDelayStartRef.current = timestamp;
                    } else if (timestamp - lockDelayStartRef.current > 450) {
                        lockPiece();
                        lockDelayStartRef.current = null;
                        lastTickRef.current = timestamp;
                    }
                } else {
                    lockDelayStartRef.current = null;
                    if (timestamp - lastTickRef.current > fallSpeedMs) {
                        lastTickRef.current = timestamp;
                        currentPieceRef.current.y += 1;
                    }
                }
            }

            // Draw Board
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const w = canvas.width;
            const h = canvas.height;

            // Cyber Background
            ctx.fillStyle = '#030712';
            ctx.fillRect(0, 0, w, h);

            // Grid Lines
            ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
            ctx.lineWidth = 1;
            for (let c = 0; c <= COLS; c++) {
                ctx.beginPath();
                ctx.moveTo(c * BLOCK_SIZE, 0);
                ctx.lineTo(c * BLOCK_SIZE, h);
                ctx.stroke();
            }
            for (let r = 0; r <= ROWS; r++) {
                ctx.beginPath();
                ctx.moveTo(0, r * BLOCK_SIZE);
                ctx.lineTo(w, r * BLOCK_SIZE);
                ctx.stroke();
            }

            // Draw Locked Grid Blocks
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const color = gridRef.current[r][c];
                    if (color !== null) {
                        ctx.save();
                        ctx.fillStyle = color;
                        ctx.shadowColor = color;
                        ctx.shadowBlur = 6;
                        ctx.beginPath();
                        ctx.roundRect(c * BLOCK_SIZE + 1, r * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2, 2.5);
                        ctx.fill();

                        // Block inner highlight
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
                        ctx.fillRect(c * BLOCK_SIZE + 2, r * BLOCK_SIZE + 2, BLOCK_SIZE - 4, 2);
                        ctx.restore();
                    }
                }
            }

            // Draw Ghost Piece Projection
            if (!gameOver && !isPaused) {
                const piece = currentPieceRef.current;
                const ghostY = getGhostY();
                const def = TETROMINOES[piece.type];

                ctx.save();
                ctx.strokeStyle = def.border;
                ctx.lineWidth = 1.2;
                ctx.setLineDash([2, 2]);

                for (let r = 0; r < piece.shape.length; r++) {
                    for (let c = 0; c < piece.shape[r].length; c++) {
                        if (piece.shape[r][c] !== 0) {
                            const gx = piece.x + c;
                            const gy = ghostY + r;
                            if (gy >= 0) {
                                ctx.strokeRect(gx * BLOCK_SIZE + 1.5, gy * BLOCK_SIZE + 1.5, BLOCK_SIZE - 3, BLOCK_SIZE - 3);
                            }
                        }
                    }
                }
                ctx.restore();
            }

            // Draw Active Piece
            if (!gameOver) {
                const piece = currentPieceRef.current;
                const def = TETROMINOES[piece.type];

                ctx.save();
                ctx.fillStyle = def.color;
                ctx.shadowColor = def.glow;
                ctx.shadowBlur = 10;
                ctx.strokeStyle = def.border;
                ctx.lineWidth = 1;

                for (let r = 0; r < piece.shape.length; r++) {
                    for (let c = 0; c < piece.shape[r].length; c++) {
                        if (piece.shape[r][c] !== 0) {
                            const px = (piece.x + c) * BLOCK_SIZE + 1;
                            const py = (piece.y + r) * BLOCK_SIZE + 1;
                            if (piece.y + r >= 0) {
                                ctx.beginPath();
                                ctx.roundRect(px, py, BLOCK_SIZE - 2, BLOCK_SIZE - 2, 3);
                                ctx.fill();
                                ctx.stroke();

                                // Gloss shine
                                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                                ctx.fillRect(px + 1, py + 1, BLOCK_SIZE - 4, 2);
                                ctx.fillStyle = def.color;
                            }
                        }
                    }
                }
                ctx.restore();
            }

            // Draw Particles (with delta-time)
            for (let i = particlesRef.current.length - 1; i >= 0; i--) {
                const p = particlesRef.current[i];
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.alpha -= 0.035 * dt;

                if (p.alpha <= 0) {
                    particlesRef.current.splice(i, 1);
                } else {
                    ctx.save();
                    ctx.globalAlpha = p.alpha;
                    ctx.fillStyle = p.color;
                    ctx.shadowColor = p.color;
                    ctx.shadowBlur = 6;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            // Update mini canvases (Next / Hold)
            drawMiniCanvas(nextCanvasRef.current, nextPieceRef.current);
            drawMiniCanvas(holdCanvasRef.current, holdPieceRef.current);

            frameIdRef.current = requestAnimationFrame(loop);
        };

        frameIdRef.current = requestAnimationFrame(loop);

        return () => {
            isRunning = false;
            if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
        };
    }, [gameOver, isPaused, lockPiece]);

    return (
        <div className="relative w-full h-full bg-slate-950 flex flex-col select-none overflow-hidden font-sans">
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
                        <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">Cyber Tetris</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">Row Matrix</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                    <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                        <span className="text-slate-400">Счет:</span>
                        <span className="font-bold text-cyan-400">{score}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                        <span className="text-slate-400">Линии:</span>
                        <span className="font-bold text-purple-400">{lines}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                        <span className="text-slate-400">Уровень:</span>
                        <span className="font-bold text-amber-400">{level}</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                        <span className="text-slate-400">Рекорд:</span>
                        <span className="font-bold text-yellow-400">{highScores['cyber_tetris'] || 0}</span>
                    </div>
                    <button
                        onClick={() => setIsPaused(p => !p)}
                        className="px-2 py-0.5 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                        {isPaused ? (
                            <>
                                <GameArrowIcon direction="right" className="w-2.5 h-2.5 text-cyan-400" />
                                <span>Продолжить</span>
                            </>
                        ) : (
                            <span>⏸ Пауза</span>
                        )}
                    </button>
                    <button
                        onClick={resetGame}
                        className="px-2 py-0.5 text-[11px] rounded bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 cursor-pointer"
                    >
                        Заново
                    </button>
                </div>
            </div>

            {/* Game Arena Layout */}
            <div className="flex-grow flex items-center justify-center p-3 relative gap-4 overflow-y-auto">
                {/* Left Side: Hold Box */}
                <div className="hidden sm:flex flex-col items-center gap-2">
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex flex-col items-center gap-1.5 shadow-lg">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">Хранилище</span>
                        <canvas
                            ref={holdCanvasRef}
                            width={64}
                            height={64}
                            className="rounded-lg border border-slate-800/80 bg-slate-950"
                        />
                        <button
                            onClick={holdPiece}
                            disabled={!canHoldRef.current || isPaused || gameOver}
                            className="w-full mt-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-[10px] text-slate-300 font-mono border border-slate-700 cursor-pointer transition-colors"
                        >
                            Смена (C)
                        </button>
                    </div>

                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-[10px] text-slate-400 font-mono flex flex-col gap-1 w-24 text-center">
                        <span className="text-slate-500">Управление:</span>
                        <span>WASD / Стрелки</span>
                        <span>Пробел: Сброс</span>
                    </div>
                </div>

                {/* Central Tetris Board */}
                <div className="relative rounded-xl border-2 border-cyan-500/50 shadow-[0_0_40px_rgba(6,182,212,0.2)] overflow-hidden bg-slate-950">
                    <canvas
                        ref={canvasRef}
                        width={COLS * BLOCK_SIZE}
                        height={ROWS * BLOCK_SIZE}
                        className="block max-h-[380px] sm:max-h-[420px] aspect-[10/20]"
                    />

                    {/* Pause Overlay */}
                    {isPaused && !gameOver && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center gap-3 pointer-events-auto animate-fade-in">
                            <span className="text-3xl">⏸</span>
                            <span className="text-sm font-bold text-cyan-300 uppercase tracking-widest">Пауза</span>
                            <button
                                onClick={() => setIsPaused(false)}
                                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg shadow-md flex items-center gap-1.5 cursor-pointer"
                            >
                                <GameArrowIcon direction="right" className="w-3 h-3" />
                                <span>Продолжить</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Side: Next Piece Box & Controls */}
                <div className="flex flex-col items-center gap-2">
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex flex-col items-center gap-1.5 shadow-lg">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">Следующая</span>
                        <canvas
                            ref={nextCanvasRef}
                            width={64}
                            height={64}
                            className="rounded-lg border border-slate-800/80 bg-slate-950"
                        />
                    </div>

                    {/* On-screen D-Pad Controls for mobile / mouse */}
                    <div className="flex flex-col items-center gap-1 pt-1">
                        <button
                            onClick={rotatePiece}
                            className="w-9 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 text-cyan-300 font-bold border border-slate-700 flex items-center justify-center transition-all shadow-md cursor-pointer"
                            title="Повернуть (W / Вверх)"
                        >
                            <GameArrowIcon direction="up" className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex gap-1">
                            <button
                                onClick={moveLeft}
                                className="w-9 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 text-cyan-300 font-bold border border-slate-700 flex items-center justify-center transition-all shadow-md cursor-pointer"
                                title="Влево (A / Влево)"
                            >
                                <GameArrowIcon direction="left" className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={softDrop}
                                className="w-9 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 text-cyan-300 font-bold border border-slate-700 flex items-center justify-center transition-all shadow-md cursor-pointer"
                                title="Ускорить падение (S / Вниз)"
                            >
                                <GameArrowIcon direction="down" className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={moveRight}
                                className="w-9 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 text-cyan-300 font-bold border border-slate-700 flex items-center justify-center transition-all shadow-md cursor-pointer"
                                title="Вправо (D / Вправо)"
                            >
                                <GameArrowIcon direction="right" className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="flex gap-1 w-full pt-1">
                            <button
                                onClick={hardDrop}
                                className="flex-1 py-1 px-1 rounded-lg bg-cyan-950/90 hover:bg-cyan-900 active:bg-cyan-600 text-cyan-300 border border-cyan-700 text-[10px] font-mono font-bold transition-all shadow-md cursor-pointer"
                                title="Мгновенный сброс (Пробел)"
                            >
                                ⚡ Сброс
                            </button>
                            <button
                                onClick={holdPiece}
                                disabled={!canHoldRef.current}
                                className="sm:hidden py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 border border-slate-700 text-[10px] font-mono cursor-pointer"
                                title="Сменить фигуру (C)"
                            >
                                🔄 Смена
                            </button>
                        </div>
                    </div>
                </div>

                {/* Game Over Modal */}
                {gameOver && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20 animate-fade-in pointer-events-auto">
                        <div className="bg-slate-900 border-2 border-cyan-500 p-6 rounded-2xl max-w-xs w-full text-center shadow-[0_0_50px_rgba(6,182,212,0.4)] flex flex-col items-center gap-3">
                            <div className="text-3xl">🛑</div>
                            <h2 className="text-lg font-bold text-cyan-400 uppercase tracking-widest">Матрица заполнена!</h2>
                            <div className="flex justify-around w-full py-2 bg-slate-800/80 rounded-lg border border-slate-700 text-xs font-mono">
                                <div>
                                    <span className="text-slate-400 block">Счет</span>
                                    <span className="font-bold text-cyan-400 text-sm">{score}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Линий</span>
                                    <span className="font-bold text-purple-400 text-sm">{lines}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Уровень</span>
                                    <span className="font-bold text-amber-400 text-sm">{level}</span>
                                </div>
                            </div>
                            <div className="flex gap-2 w-full mt-2">
                                <button
                                    onClick={resetGame}
                                    className="flex-1 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-lg shadow-lg cursor-pointer"
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
                <span>Управление: Стрелки / WASD | Пробел = Сброс | C = Замена</span>
                <span>Заполняйте горизонтальные ряды для очистки</span>
            </div>
        </div>
    );
};
