import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MiniGameProps } from '../types';
import { GameArrowIcon } from '../GameArrowIcon';

interface Card {
    id: number;
    icon: string;
    label: string;
    isFlipped: boolean;
    isMatched: boolean;
}

const ICONS_POOL = [
    { icon: '🧠', label: 'Neuron' },
    { icon: '⚡', label: 'Tensor' },
    { icon: '🔮', label: 'Prompt' },
    { icon: '💾', label: 'Memory' },
    { icon: '🛰️', label: 'Vector' },
    { icon: '👾', label: 'Agent' },
    { icon: '🛡️', label: 'Firewall' },
    { icon: '🧬', label: 'Token' },
    { icon: '🌐', label: 'Network' },
    { icon: '🤖', label: 'Model' },
];

const getPairsCount = (diff: 'easy' | 'normal' | 'hard') => {
    return diff === 'easy' ? 6 : diff === 'normal' ? 8 : 10;
};

const buildDeck = (diff: 'easy' | 'normal' | 'hard'): Card[] => {
    const count = getPairsCount(diff);
    const selectedIcons = ICONS_POOL.slice(0, count);
    const deck: Card[] = [];

    selectedIcons.forEach((item, index) => {
        deck.push({ id: index * 2, icon: item.icon, label: item.label, isFlipped: false, isMatched: false });
        deck.push({ id: index * 2 + 1, icon: item.icon, label: item.label, isFlipped: false, isMatched: false });
    });

    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
};

export const MemoryMatrixGame: React.FC<MiniGameProps> = ({
    onBackToHub,
    audio,
    highScores,
    onUpdateHighScore,
    savedState,
    onSaveState,
    onClearState,
    isNewGameRequested
}) => {
    const initialDifficulty = (!isNewGameRequested && savedState?.difficulty) ? savedState.difficulty : 'normal';
    const expectedPairs = getPairsCount(initialDifficulty);

    const hasValidSaved = !isNewGameRequested &&
        savedState &&
        Array.isArray(savedState.cards) &&
        savedState.cards.length === expectedPairs * 2 &&
        savedState.cards.some((c: Card) => !c.isMatched) &&
        !savedState.isWon;

    const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>(initialDifficulty);

    const [cards, setCards] = useState<Card[]>(() => {
        if (hasValidSaved && Array.isArray(savedState.cards)) {
            return savedState.cards.map((c: Card) => ({
                ...c,
                isFlipped: Boolean(c.isMatched)
            }));
        }
        return buildDeck(initialDifficulty);
    });

    const [moves, setMoves] = useState<number>(() => {
        return (hasValidSaved && typeof savedState.moves === 'number') ? savedState.moves : 0;
    });
    const [matchedPairs, setMatchedPairs] = useState<number>(() => {
        return (hasValidSaved && typeof savedState.matchedPairs === 'number') ? savedState.matchedPairs : 0;
    });
    const [seconds, setSeconds] = useState<number>(() => {
        return (hasValidSaved && typeof savedState.seconds === 'number') ? savedState.seconds : 0;
    });
    const [timerActive, setTimerActive] = useState(false);
    const [isWon, setIsWon] = useState(false);

    // Refs for synchronous race-condition prevention
    const flippedCardsRef = useRef<number[]>([]);
    const isBusyRef = useRef<boolean>(false);
    const timeoutRef = useRef<any>(null);

    const pairsCount = getPairsCount(difficulty);

    const persistState = useCallback((nextCards: Card[], nextMoves: number, nextMatched: number, nextSecs: number, nextDiff: string) => {
        onSaveState?.({
            cards: nextCards,
            moves: nextMoves,
            matchedPairs: nextMatched,
            seconds: nextSecs,
            difficulty: nextDiff,
            isWon: false,
            savedAt: Date.now()
        });
    }, [onSaveState]);

    const setupGame = useCallback((diff?: 'easy' | 'normal' | 'hard') => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        const activeDiff = diff || difficulty;
        const newDeck = buildDeck(activeDiff);
        flippedCardsRef.current = [];
        isBusyRef.current = false;
        setCards(newDeck);
        setMoves(0);
        setMatchedPairs(0);
        setSeconds(0);
        setTimerActive(false);
        setIsWon(false);
        onClearState?.();
    }, [difficulty, onClearState]);

    // Timer
    useEffect(() => {
        let interval: any = null;
        if (timerActive && !isWon) {
            interval = setInterval(() => {
                setSeconds(s => s + 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [timerActive, isWon]);

    // Clean up any pending timeouts on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const handleDifficultyChange = (newDiff: 'easy' | 'normal' | 'hard') => {
        setDifficulty(newDiff);
        audio.playClick();
        setupGame(newDiff);
    };

    const handleCardClick = (index: number) => {
        if (isBusyRef.current) return;
        if (index < 0 || index >= cards.length) return;

        const currentCard = cards[index];
        if (!currentCard) return;
        if (currentCard.isMatched || currentCard.isFlipped) return;
        if (flippedCardsRef.current.includes(index)) return;

        if (!timerActive) {
            setTimerActive(true);
        }

        audio.playClick();

        // Flip card synchronously in tracking ref
        const currentFlipped = [...flippedCardsRef.current, index];
        flippedCardsRef.current = currentFlipped;

        const updatedCards = cards.map((c, i) => i === index ? { ...c, isFlipped: true } : c);
        setCards(updatedCards);

        if (currentFlipped.length === 2) {
            isBusyRef.current = true;
            const newMoves = moves + 1;
            setMoves(newMoves);
            const [firstIdx, secondIdx] = currentFlipped;
            const firstCard = updatedCards[firstIdx];
            const secondCard = updatedCards[secondIdx];

            if (firstCard && secondCard && firstCard.label === secondCard.label) {
                // Match!
                audio.playMerge();
                timeoutRef.current = setTimeout(() => {
                    setCards(prev => {
                        const matched = prev.map((c, i) =>
                            (i === firstIdx || i === secondIdx) ? { ...c, isMatched: true, isFlipped: true } : c
                        );
                        const nextMatchedCount = Math.floor(matched.filter(c => c.isMatched).length / 2);
                        setMatchedPairs(nextMatchedCount);

                        if (nextMatchedCount >= pairsCount) {
                            setIsWon(true);
                            audio.playScore();
                            const calculatedScore = Math.max(100, Math.round(5000 / (newMoves + 1) + 2000 / (seconds + 1)));
                            if (calculatedScore > (highScores['memory_matrix'] || 0)) {
                                onUpdateHighScore('memory_matrix', calculatedScore);
                            }
                            onClearState?.();
                        } else {
                            persistState(matched, newMoves, nextMatchedCount, seconds, difficulty);
                        }
                        return matched;
                    });
                    flippedCardsRef.current = [];
                    isBusyRef.current = false;
                }, 300);
            } else {
                // Not match - Flip back after short delay
                timeoutRef.current = setTimeout(() => {
                    setCards(prev => {
                        const reverted = prev.map((c, i) =>
                            (i === firstIdx || i === secondIdx) ? { ...c, isFlipped: false } : c
                        );
                        persistState(reverted, newMoves, matchedPairs, seconds, difficulty);
                        return reverted;
                    });
                    flippedCardsRef.current = [];
                    isBusyRef.current = false;
                }, 750);
            }
        }
    };

    return (
        <div className="relative w-full h-full bg-slate-950 flex flex-col select-none overflow-hidden">
            {/* Top Game Bar */}
            <div className="h-10 bg-slate-900/90 border-b border-indigo-900/50 flex items-center justify-between px-3 shrink-0 z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBackToHub}
                        className="px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1.5 border border-indigo-800/40 cursor-pointer"
                    >
                        <GameArrowIcon direction="left" className="w-3 h-3" />
                        <span>Меню игр</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Memory Matrix</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800">Mind Puzzle</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                    <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 text-slate-300">
                        <span>Сложность:</span>
                        <select
                            value={difficulty}
                            onChange={(e) => handleDifficultyChange(e.target.value as any)}
                            className="bg-slate-900 text-indigo-300 rounded px-1 py-0.5 border border-slate-700 focus:outline-none cursor-pointer"
                        >
                            <option value="easy">Легко (6 пар)</option>
                            <option value="normal">Нормально (8 пар)</option>
                            <option value="hard">Сложно (10 пар)</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                        <span className="text-slate-400">Ходы:</span>
                        <span className="font-bold text-indigo-400">{moves}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                        <span className="text-slate-400">Время:</span>
                        <span className="font-bold text-amber-400">{seconds}с</span>
                    </div>
                    <button
                        onClick={() => { setupGame(); audio.playClick(); }}
                        className="px-2 py-0.5 text-[11px] rounded bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 cursor-pointer"
                    >
                        Перемешать
                    </button>
                </div>
            </div>

            {/* Matrix Grid Card Area */}
            <div className="flex-grow flex items-center justify-center p-3 relative overflow-y-auto">
                <div className={`grid gap-2.5 max-w-xl w-full p-2 justify-center ${
                    difficulty === 'easy' ? 'grid-cols-4' : difficulty === 'normal' ? 'grid-cols-4' : 'grid-cols-5'
                }`}>
                    {cards.map((card, index) => {
                        const isLocked = card.isMatched;
                        const isShowing = card.isFlipped || card.isMatched;

                        return (
                            <button
                                key={`${card.id}-${index}`}
                                onClick={() => handleCardClick(index)}
                                disabled={isLocked}
                                type="button"
                                className={`h-20 sm:h-24 rounded-xl border flex flex-col items-center justify-center transition-all duration-200 transform select-none ${
                                    isLocked
                                        ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200 opacity-80 scale-95 shadow-[0_0_15px_rgba(16,185,129,0.25)] cursor-default'
                                        : isShowing
                                        ? 'bg-indigo-900 border-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] scale-105 cursor-default'
                                        : 'bg-slate-900 hover:bg-slate-800 border-slate-700 hover:border-indigo-400 text-indigo-300 hover:scale-[1.03] active:scale-95 cursor-pointer shadow-md hover:shadow-[0_0_15px_rgba(99,102,241,0.25)]'
                                }`}
                            >
                                {isShowing ? (
                                    <>
                                        <span className="text-2xl sm:text-3xl animate-fade-in">{card.icon}</span>
                                        <span className="text-[10px] uppercase font-mono font-bold tracking-wider mt-1 text-slate-200">
                                            {card.label}
                                        </span>
                                    </>
                                ) : (
                                    <div className="w-8 h-8 rounded-full border-2 border-indigo-500/40 bg-indigo-950/30 flex items-center justify-center text-sm font-mono font-bold text-indigo-300">
                                        ?
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Victory Modal */}
                {isWon && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20 animate-fade-in pointer-events-auto">
                        <div className="bg-slate-900 border-2 border-indigo-500 p-6 rounded-2xl max-w-xs w-full text-center shadow-[0_0_50px_rgba(99,102,241,0.4)] flex flex-col items-center gap-3">
                            <div className="text-4xl animate-bounce">🎉</div>
                            <h2 className="text-lg font-bold text-indigo-300 uppercase tracking-widest">Матрица раскрыта!</h2>
                            <p className="text-xs text-slate-300">Все пары нейронов успешно синхронизированы.</p>
                            <div className="flex justify-around w-full py-2 bg-slate-800/80 rounded-lg border border-slate-700 text-xs font-mono">
                                <div>
                                    <span className="text-slate-400 block">Ходы</span>
                                    <span className="font-bold text-indigo-400 text-sm">{moves}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Время</span>
                                    <span className="font-bold text-amber-400 text-sm">{seconds}с</span>
                                </div>
                            </div>
                            <div className="flex gap-2 w-full mt-2">
                                <button
                                    onClick={() => { setupGame(); audio.playClick(); }}
                                    className="flex-1 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-lg shadow-lg cursor-pointer"
                                >
                                    Сыграть еще
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
                <span>Найдите одинаковые пары карточек</span>
                <span>Найдено пар: {matchedPairs} / {pairsCount}</span>
            </div>
        </div>
    );
};
