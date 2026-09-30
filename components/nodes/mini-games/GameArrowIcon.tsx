import React from 'react';

export type GameArrowDirection = 'up' | 'down' | 'left' | 'right';

interface GameArrowIconProps {
    direction: GameArrowDirection;
    className?: string;
}

const ROTATION_MAP: Record<GameArrowDirection, string | undefined> = {
    up: undefined,
    right: 'rotate(90 12 12)',
    down: 'rotate(180 12 12)',
    left: 'rotate(270 12 12)'
};

/**
 * Robust, SVG-based arrow icon for mini-game D-pads and controls.
 * Guarantees 100% identical styling, size, and color across all platforms/browsers,
 * preventing operating systems from replacing left/right triangles with emoji glyphs.
 */
export const GameArrowIcon: React.FC<GameArrowIconProps> = ({
    direction,
    className = 'w-3.5 h-3.5'
}) => {
    const transform = ROTATION_MAP[direction];

    return (
        <svg
            viewBox="0 0 24 24"
            className={`shrink-0 fill-current ${className}`}
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <polygon
                points="12,5.5 5,18 19,18"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                transform={transform}
            />
        </svg>
    );
};
