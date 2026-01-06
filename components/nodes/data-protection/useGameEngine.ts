import { useState, useEffect, useRef } from 'react';
import { GameState, GRID_W, GRID_H, Point, DataUnit, EnemyUnit, Tower, Projectile } from './types';
import { generateGamePaths } from './utils';

const SPAWN_INTERVAL_DATA = 1500;
const SPAWN_INTERVAL_ENEMY = 2000;
const CORRUPTION_CHARS = "&@/\"'*?! :;*,....%$#";

export const useGameEngine = (inputText: string) => {
    const centerPoint = { x: Math.floor(GRID_W / 2), y: Math.floor(GRID_H / 2) };

    const initialState: GameState = {
        grid: [],
        paths: [],
        dataUnits: [],
        enemies: [],
        towers: [],
        projectiles: [],
        score: 0,
        bits: 150, // Higher starting bits
        wordsQueue: [],
        storedData: [],
        totalWordsInitial: 0,
        isLevelComplete: false,
        isPaused: true,
        centerPoint
    };

    const gameStateRef = useRef<GameState>(initialState);
    const [uiState, setUiState] = useState<{ score: number; bits: number; isPaused: boolean; isLevelComplete: boolean }>({ 
        score: 0, bits: 150, isPaused: true, isLevelComplete: false 
    });
    
    const lastTimeRef = useRef<number>(0);
    const lastSpawnDataRef = useRef<number>(0);
    const lastSpawnEnemyRef = useRef<number>(0);
    const frameIdRef = useRef<number>(0);

    // Initialize
    useEffect(() => {
        const paths = generateGamePaths();
        const grid = Array.from({ length: GRID_H }, (_, y) => 
            Array.from({ length: GRID_W }, (_, x) => ({
                x, y, 
                isOccupied: false
            }))
        );
        
        gameStateRef.current = {
            ...gameStateRef.current,
            grid,
            paths
        };
    }, []);

    // Load Data
    useEffect(() => {
        const words = inputText.split(/\s+/).filter(w => w.length > 0);
        gameStateRef.current.wordsQueue = words;
        gameStateRef.current.totalWordsInitial = words.length;
        // Reset if new data comes in
        if (words.length > 0) {
            gameStateRef.current.isLevelComplete = false;
            gameStateRef.current.storedData = [];
            setUiState(prev => ({ ...prev, isLevelComplete: false }));
        }
    }, [inputText]);

    const startGame = () => {
        gameStateRef.current.isPaused = false;
        setUiState(prev => ({ ...prev, isPaused: false }));
        lastTimeRef.current = performance.now();
        loop();
    };

    const pauseGame = () => {
        gameStateRef.current.isPaused = true;
        setUiState(prev => ({ ...prev, isPaused: true }));
        if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
    };

    const buildTower = (x: number, y: number) => {
        const state = gameStateRef.current;
        // Check collision with any path
        const onPath = state.paths.some(path => path.some(p => p.x === x && p.y === y));
        
        // Prevent building on portal center area (3x3)
        const dx = Math.abs(x - state.centerPoint.x);
        const dy = Math.abs(y - state.centerPoint.y);
        const inCenter = dx <= 1 && dy <= 1;

        if (state.bits >= 50 && !state.grid[y][x].isOccupied && !onPath && !inCenter) {
            state.bits -= 50;
            state.grid[y][x].isOccupied = true;
            state.towers.push({
                id: `tower-${Date.now()}`,
                x, y,
                range: 6,
                damage: 3,
                cooldown: 400,
                lastShotTime: 0,
                color: '#22d3ee'
            });
            setUiState(prev => ({ ...prev, bits: state.bits }));
        }
    };

    const getCorruptedString = (original: string) => {
        if (!original) return "ERR";
        const len = original.length;
        let res = "";
        for (let i=0; i<len; i++) {
            res += CORRUPTION_CHARS.charAt(Math.floor(Math.random() * CORRUPTION_CHARS.length));
        }
        return res;
    };

    const loop = () => {
        if (gameStateRef.current.isPaused) return;
        const now = performance.now();
        const dt = now - lastTimeRef.current;
        lastTimeRef.current = now;

        update(dt, now);
        frameIdRef.current = requestAnimationFrame(loop);
    };

    const update = (dt: number, now: number) => {
        const state = gameStateRef.current;
        
        // Check Victory
        if (state.wordsQueue.length === 0 && state.dataUnits.length === 0 && !state.isLevelComplete && state.totalWordsInitial > 0) {
            state.isLevelComplete = true;
            state.isPaused = true;
            setUiState(prev => ({ ...prev, isLevelComplete: true, isPaused: true }));
            return;
        }

        // 1. Spawn Data (Path 0)
        if (state.wordsQueue.length > 0 && now - lastSpawnDataRef.current > SPAWN_INTERVAL_DATA) {
            const word = state.wordsQueue.shift();
            if (word) {
                state.dataUnits.push({
                    id: `data-${Date.now()}`,
                    word,
                    pathIndex: 0,
                    progress: 0,
                    hp: 20,
                    maxHp: 20,
                    speed: 2,
                    isDead: false,
                    reachedBase: false,
                    color: '#06b6d4'
                });
                lastSpawnDataRef.current = now;
            }
        }

        // 2. Spawn Enemies (Paths 1, 2, 3)
        // Spawn more if data is on field
        if ((state.dataUnits.length > 0 || state.wordsQueue.length > 0) && now - lastSpawnEnemyRef.current > SPAWN_INTERVAL_ENEMY) {
            const pathIndex = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
            state.enemies.push({
                id: `enemy-${Date.now()}`,
                pathIndex: pathIndex,
                progress: 0,
                hp: 8,
                maxHp: 8,
                speed: 2.5,
                reachedBase: false,
                isDead: false,
                damage: 0, 
                color: '#ef4444'
            });
            lastSpawnEnemyRef.current = now;
        }

        // 3. Move Data
        state.dataUnits.forEach(unit => {
            if (unit.isDead || unit.reachedBase) return;
            const path = state.paths[unit.pathIndex];
            
            unit.progress += (unit.speed * dt / 1000);
            
            if (unit.progress >= path.length - 1) {
                unit.reachedBase = true;
                state.score += 20;
                state.bits += 15;
                state.storedData.push(unit.word);
                setUiState(prev => ({ ...prev, score: state.score, bits: state.bits }));
            }
        });

        // 4. Move Enemies & Handle Portal Corruption
        state.enemies.forEach(enemy => {
            if (enemy.isDead || enemy.reachedBase) return;
            const path = state.paths[enemy.pathIndex];
            
            enemy.progress += (enemy.speed * dt / 1000);

            if (enemy.progress >= path.length - 1) {
                enemy.reachedBase = true;
                // CORRUPTION EVENT
                if (state.storedData.length > 0) {
                     const victimIdx = Math.floor(Math.random() * state.storedData.length);
                     const original = state.storedData[victimIdx];
                     state.storedData[victimIdx] = getCorruptedString(original);
                }
                // Visual feedback?
            }
        });

        // 5. Towers Shoot (Target Enemies Only)
        state.towers.forEach(tower => {
            if (now - tower.lastShotTime > tower.cooldown) {
                // Find enemy in range
                let target: EnemyUnit | undefined;
                let minDst = Infinity;

                state.enemies.forEach(e => {
                    if (e.isDead || e.reachedBase) return;
                    const path = state.paths[e.pathIndex];
                    const idx = Math.floor(e.progress);
                    const pos = path[idx] || path[path.length-1];
                    const dst = Math.hypot(pos.x - tower.x, pos.y - tower.y);
                    
                    if (dst <= tower.range && dst < minDst) {
                        minDst = dst;
                        target = e;
                    }
                });

                if (target) {
                    state.projectiles.push({
                        id: `proj-${Date.now()}-${Math.random()}`,
                        x: tower.x,
                        y: tower.y,
                        targetId: target.id,
                        targetType: 'enemy',
                        speed: 15,
                        damage: tower.damage,
                        color: '#fef08a'
                    });
                    tower.lastShotTime = now;
                }
            }
        });

        // 6. Projectiles Move
        state.projectiles.forEach(proj => {
            const target = state.enemies.find(e => e.id === proj.targetId);
            if (!target || target.isDead || target.reachedBase) {
                 proj.damage = 0; // remove
                 return;
            }
            
            const path = state.paths[target.pathIndex];
            const idx = Math.floor(target.progress);
            const tPos = path[idx] || path[path.length-1];

            const dx = tPos.x - proj.x;
            const dy = tPos.y - proj.y;
            const dist = Math.hypot(dx, dy);
            const moveDist = proj.speed * dt / 1000;
            
            if (dist <= moveDist) {
                target.hp -= proj.damage;
                if (target.hp <= 0) {
                    target.isDead = true;
                    state.bits += 5;
                    state.score += 5;
                    setUiState(prev => ({ ...prev, bits: state.bits, score: state.score }));
                }
                proj.damage = 0;
            } else {
                proj.x += (dx / dist) * moveDist;
                proj.y += (dy / dist) * moveDist;
            }
        });

        // 7. Cleanup
        state.dataUnits = state.dataUnits.filter(u => !u.isDead && !u.reachedBase);
        state.enemies = state.enemies.filter(e => !e.isDead && !e.reachedBase);
        state.projectiles = state.projectiles.filter(p => p.damage > 0);
    };

    const getFinalText = () => gameStateRef.current.storedData.join(' ');

    return {
        gameStateRef,
        uiState,
        startGame,
        pauseGame,
        buildTower,
        getFinalText
    };
};
