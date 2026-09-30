import React, { useState } from 'react';
import { GameInfo, MiniGameId } from './types';
import { GameArrowIcon } from './GameArrowIcon';

export const GAMES_CATALOG: GameInfo[] = [
    {
        id: 'data_defender',
        title: 'Data Defender',
        titleRu: 'Защита Данных',
        category: 'strategy',
        categoryRu: 'Стратегия',
        tag: 'Tower Defense',
        description: 'Defend incoming neural data streams from corrupt malware packets with laser turrets.',
        descriptionRu: 'Защищайте входящие потоки данных от вредоносных пакетов с помощью защитных турелей.',
        icon: '🛡️',
        difficulty: 'Medium',
        difficultyRu: 'Средне',
        accentColor: 'border-cyan-500/50 hover:border-cyan-400 group-hover:shadow-[0_0_25px_rgba(6,182,212,0.3)] bg-gradient-to-b from-cyan-950/40 to-slate-900/90'
    },
    {
        id: 'neuro_2048',
        title: 'Neuro-2048',
        titleRu: 'Нейро-2048',
        category: 'puzzle',
        categoryRu: 'Головоломка',
        tag: 'Logic & AI Merge',
        description: 'Merge Bytes, Tokens and Neurons on the grid to reach the 2048 Singularity.',
        descriptionRu: 'Объединяйте Байты, Токены и Нейроны на сетке, чтобы создать Технологическую Сингулярность.',
        icon: '⚡',
        difficulty: 'Adaptive',
        difficultyRu: 'Адаптивно',
        accentColor: 'border-purple-500/50 hover:border-purple-400 group-hover:shadow-[0_0_25px_rgba(168,85,247,0.3)] bg-gradient-to-b from-purple-950/40 to-slate-900/90'
    },
    {
        id: 'neural_snake',
        title: 'Neural Snake',
        titleRu: 'Кибер-Змейка',
        category: 'arcade',
        categoryRu: 'Аркада',
        tag: 'Speed & Reflex',
        description: 'Guide the cybernetic data serpent, devour energy tokens, and avoid matrix collisions.',
        descriptionRu: 'Управляйте кибернетическим змеем, собирайте энерго-пакеты и избегайте столкновений.',
        icon: '🐍',
        difficulty: 'Medium',
        difficultyRu: 'Средне',
        accentColor: 'border-emerald-500/50 hover:border-emerald-400 group-hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] bg-gradient-to-b from-emerald-950/40 to-slate-900/90'
    },
    {
        id: 'quantum_hopper',
        title: 'Quantum Hopper',
        titleRu: 'Квантовый Прыжок',
        category: 'reflex',
        categoryRu: 'Реакция',
        tag: 'Cyber Drone',
        description: 'Boost your quantum drone through dangerous firewall laser gates with precise timing.',
        descriptionRu: 'Управляйте квантовым дроном, маневрируя сквозь лазерные ворота фаервола.',
        icon: '🚀',
        difficulty: 'Hard',
        difficultyRu: 'Сложно',
        accentColor: 'border-sky-500/50 hover:border-sky-400 group-hover:shadow-[0_0_25px_rgba(14,165,233,0.3)] bg-gradient-to-b from-sky-950/40 to-slate-900/90'
    },
    {
        id: 'memory_matrix',
        title: 'Memory Matrix',
        titleRu: 'Матрица Памяти',
        category: 'puzzle',
        categoryRu: 'Память',
        tag: 'Match 2 Cards',
        description: 'Train your brain by uncovering matching pairs of AI model architecture tokens.',
        descriptionRu: 'Тренируйте зрительную память, находя парные символы архитектуры искусственного интеллекта.',
        icon: '🧠',
        difficulty: 'Easy',
        difficultyRu: 'Легко',
        accentColor: 'border-indigo-500/50 hover:border-indigo-400 group-hover:shadow-[0_0_25px_rgba(99,102,241,0.3)] bg-gradient-to-b from-indigo-950/40 to-slate-900/90'
    },
    {
        id: 'cyber_arkanoid',
        title: 'Cyber Arkanoid',
        titleRu: 'Кибер-Арканоид',
        category: 'arcade',
        categoryRu: 'Аркада',
        tag: 'Block Breaker',
        description: 'Launch plasma spheres, destroy corrupted sector blocks, and capture special cyber power-ups.',
        descriptionRu: 'Запускайте плазменный шар, разрушайте поврежденные блоки и собирайте усиления платформы.',
        icon: '🧱',
        difficulty: 'Medium',
        difficultyRu: 'Средне',
        accentColor: 'border-rose-500/50 hover:border-rose-400 group-hover:shadow-[0_0_25px_rgba(244,63,94,0.3)] bg-gradient-to-b from-rose-950/40 to-slate-900/90'
    },
    {
        id: 'cyber_tetris',
        title: 'Cyber Tetris',
        titleRu: 'Кибер-Тетрис',
        category: 'puzzle',
        categoryRu: 'Головоломка',
        tag: 'Row Matrix',
        description: 'Position and rotate falling cyber blocks to complete solid rows and clear the data stack.',
        descriptionRu: 'Вращайте и укладывайте падающие неоновые блоки, заполняя горизонтальные ряды матрицы.',
        icon: '🧩',
        difficulty: 'Adaptive',
        difficultyRu: 'Адаптивно',
        accentColor: 'border-cyan-500/50 hover:border-cyan-400 group-hover:shadow-[0_0_25px_rgba(6,182,212,0.3)] bg-gradient-to-b from-cyan-950/40 to-slate-900/90'
    }
];

export const getGameProgressSummary = (gameId: string, progress: any): string | null => {
    if (!progress) return null;

    if (gameId === 'cyber_tetris') {
        if (progress.gameOver) return null;
        const score = progress.score || 0;
        const lines = progress.lines || 0;
        const level = progress.level || 1;
        return `Счет: ${score} | Линий: ${lines} | Ур. ${level}`;
    }

    if (gameId === 'neuro_2048') {
        if (progress.gameOver) return null;
        const score = progress.score || 0;
        const maxTile = progress.maxTile ? ` (Блок: ${progress.maxTile})` : '';
        return `Счет: ${score}${maxTile}`;
    }

    if (gameId === 'neural_snake') {
        if (progress.gameOver) return null;
        const score = progress.score || 0;
        const len = progress.snake?.length || 3;
        return `Счет: ${score} | Длина: ${len}`;
    }

    if (gameId === 'cyber_arkanoid') {
        if (progress.gameOver || progress.isWon) return null;
        const score = progress.score || 0;
        const lives = progress.lives ?? 3;
        const remainingBricks = progress.bricks?.length ?? 0;
        return `Счет: ${score} | ❤️ ${lives} | Блоков: ${remainingBricks}`;
    }

    if (gameId === 'memory_matrix') {
        if (progress.isWon) return null;
        const matched = progress.matchedPairs || 0;
        const moves = progress.moves || 0;
        return `Пары: ${matched} | Ходов: ${moves}`;
    }

    if (gameId === 'quantum_hopper') {
        if (progress.gameOver || !progress.score) return null;
        return `Счет: ${progress.score}`;
    }

    if (gameId === 'data_defender') {
        if (progress.isLevelComplete) return null;
        const score = progress.score || 0;
        const towers = progress.towers?.length || 0;
        if (score === 0 && towers === 0) return null;
        return `Счет: ${score} | Турелей: ${towers}`;
    }

    return null;
};

interface MiniGamesHubProps {
    onSelectGame: (gameId: MiniGameId, mode?: 'continue' | 'new') => void;
    audio: ReturnType<typeof import('./useGameAudio').useGameAudio>;
    highScores: Record<string, number>;
    gamesProgress?: Record<string, any>;
}

export const MiniGamesHub: React.FC<MiniGamesHubProps> = ({
    onSelectGame,
    audio,
    highScores,
    gamesProgress = {}
}) => {
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const filteredGames = GAMES_CATALOG.filter(game => {
        const matchesCat = filterCategory === 'all' || game.category === filterCategory;
        const matchesQuery = !searchQuery || 
            game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            game.titleRu.toLowerCase().includes(searchQuery.toLowerCase()) ||
            game.tag.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCat && matchesQuery;
    });

    const handleContinue = (id: MiniGameId, e: React.MouseEvent) => {
        e.stopPropagation();
        audio.playClick();
        onSelectGame(id, 'continue');
    };

    const handleNewGame = (id: MiniGameId, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        audio.playClick();
        onSelectGame(id, 'new');
    };

    return (
        <div className="relative w-full h-full bg-slate-950 flex flex-col select-none overflow-y-auto p-4 sm:p-5">
            {/* Hub Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xl shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                        🎮
                    </div>
                    <div>
                        <h1 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                            <span>Мини-Игры & Лаундж</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700 font-mono">
                                7 Игр
                            </span>
                        </h1>
                        <p className="text-xs text-slate-400">
                            Коллекция мини-игр с автосохранением прогресса для отдыха и ожидания фоновых генераций
                        </p>
                    </div>
                </div>

                {/* Search & Category Filter */}
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Поиск игры..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-36 sm:w-44"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1.5 text-slate-500 hover:text-slate-300 text-xs"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 py-3 overflow-x-auto shrink-0 scrollbar-none">
                {[
                    { id: 'all', label: 'Все игры' },
                    { id: 'strategy', label: '🛡️ Стратегии' },
                    { id: 'puzzle', label: '🧩 Головоломки' },
                    { id: 'arcade', label: '🕹️ Аркады' },
                    { id: 'reflex', label: '⚡ Реакция' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setFilterCategory(tab.id); audio.playClick(); }}
                        className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                            filterCategory === tab.id
                                ? 'bg-amber-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Games Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                {filteredGames.map(game => {
                    const best = highScores[game.id] || 0;
                    const progress = gamesProgress[game.id];
                    const progressSummary = getGameProgressSummary(game.id, progress);
                    const hasProgress = Boolean(progressSummary);

                    return (
                        <div
                            key={game.id}
                            className={`group relative rounded-xl border p-4 transition-all duration-200 flex flex-col justify-between ${game.accentColor} ${
                                hasProgress ? 'ring-1 ring-amber-400/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : ''
                            }`}
                        >
                            <div>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-lg bg-slate-950/80 border border-slate-700/80 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                            {game.icon}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                                                {game.titleRu}
                                            </h3>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                {game.title}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950/90 text-slate-300 border border-slate-700/60 font-mono">
                                            {game.tag}
                                        </span>
                                        {hasProgress && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                                Сохранено
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <p className="text-xs text-slate-300/90 line-clamp-2 leading-relaxed mb-3">
                                    {game.descriptionRu}
                                </p>

                                {hasProgress && (
                                    <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-slate-950/70 border border-amber-500/30 text-[11px] font-mono text-amber-300 flex items-center justify-between">
                                        <span className="text-slate-400">В процессе:</span>
                                        <span className="font-semibold text-amber-200">{progressSummary}</span>
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2">
                                <div className="flex items-center justify-between text-[11px] font-mono">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <span>Рекорд:</span>
                                        <span className="font-bold text-amber-400">{best}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500">
                                        {game.difficultyRu}
                                    </span>
                                </div>

                                {/* Action Buttons: Continue vs New Game */}
                                {hasProgress ? (
                                    <div className="flex items-center gap-2 pt-1">
                                        <button
                                            onClick={(e) => handleContinue(game.id, e)}
                                            className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/50 flex items-center justify-center gap-1.5 transition-all active:scale-95 border border-emerald-400/30"
                                        >
                                            <GameArrowIcon direction="right" className="w-2.5 h-2.5" />
                                            <span>Продолжить</span>
                                        </button>
                                        <button
                                            onClick={(e) => handleNewGame(game.id, e)}
                                            className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-all active:scale-95"
                                            title="Начать игру заново с 0"
                                        >
                                            <span>🔄 Новая</span>
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleNewGame(game.id)}
                                        className="w-full py-1.5 px-3 rounded-lg bg-slate-800/90 hover:bg-amber-600 hover:text-slate-950 text-slate-200 font-bold text-xs transition-all active:scale-95 border border-slate-700 hover:border-amber-400 flex items-center justify-center gap-1.5 group/btn"
                                    >
                                        <span>Играть</span>
                                        <span className="transform group-hover/btn:translate-x-1 transition-transform">→</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredGames.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
                    <span className="text-3xl">🔍</span>
                    <p className="text-xs">Игры по вашему запросу не найдены</p>
                </div>
            )}
        </div>
    );
};
