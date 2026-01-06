
export interface Point {
    x: number;
    y: number;
}

export interface GridCell {
    x: number;
    y: number;
    isOccupied: boolean; // By tower
}

export interface DataUnit {
    id: string;
    word: string;
    pathIndex: number; // Which path it's on (0 for data)
    progress: number; // 0 to path length
    hp: number;
    maxHp: number;
    speed: number;
    isDead: boolean;
    reachedBase: boolean;
    color: string;
}

export interface EnemyUnit {
    id: string;
    pathIndex: number; // 1, 2, or 3
    progress: number;
    hp: number;
    maxHp: number;
    speed: number;
    isDead: boolean;
    reachedBase: boolean; // Reached portal to corrupt data
    damage: number; // Damage to Data Units if they collide (optional feature, focus on portal)
    color: string;
}

export interface Tower {
    id: string;
    x: number; // Grid coords
    y: number;
    range: number; // Grid units
    damage: number;
    cooldown: number;
    lastShotTime: number;
    color: string;
}

export interface Projectile {
    id: string;
    x: number;
    y: number;
    targetId: string;
    targetType: 'enemy'; // Towers only shoot enemies
    speed: number;
    damage: number;
    color: string;
}

export interface GameState {
    grid: GridCell[][];
    paths: Point[][]; // Array of paths. Index 0 = Data, 1-3 = Enemies
    dataUnits: DataUnit[];
    enemies: EnemyUnit[];
    towers: Tower[];
    projectiles: Projectile[];
    score: number;
    bits: number;
    wordsQueue: string[]; // Incoming words
    storedData: string[]; // Words successfully reached portal (or corrupted slots)
    totalWordsInitial: number; // To track progress
    isLevelComplete: boolean;
    isPaused: boolean;
    centerPoint: Point;
}

export const CELL_SIZE = 30;
export const GRID_W = 30;
export const GRID_H = 20;
