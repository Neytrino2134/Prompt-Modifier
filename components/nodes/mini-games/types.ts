export type MiniGameId = 
    | 'hub'
    | 'data_defender'
    | 'neuro_2048'
    | 'neural_snake'
    | 'quantum_hopper'
    | 'memory_matrix'
    | 'cyber_arkanoid'
    | 'cyber_tetris';

export interface GameInfo {
    id: MiniGameId;
    title: string;
    titleRu: string;
    category: 'strategy' | 'puzzle' | 'arcade' | 'reflex';
    categoryRu: string;
    tag: string;
    description: string;
    descriptionRu: string;
    icon: string;
    difficulty: 'Easy' | 'Medium' | 'Hard' | 'Adaptive';
    difficultyRu: 'Легко' | 'Средне' | 'Сложно' | 'Адаптивно';
    accentColor: string;
}

export interface MiniGameProps {
    onBackToHub: () => void;
    audio: ReturnType<typeof import('./useGameAudio').useGameAudio>;
    upstreamText?: string;
    onOutputText?: (text: string) => void;
    highScores: Record<string, number>;
    onUpdateHighScore: (gameId: string, score: number) => void;
    savedState?: any;
    onSaveState?: (state: any) => void;
    onClearState?: () => void;
    isNewGameRequested?: boolean;
}
