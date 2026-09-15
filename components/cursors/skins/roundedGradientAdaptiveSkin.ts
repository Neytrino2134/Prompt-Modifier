import { Theme } from '../../../types';
import { CursorDefinitionSet } from '../types';
import { buildRoundedGradientSvgSet } from './baseRoundedGradientSet';

export const THEME_GRADIENT_PALETTES: Record<Theme, { stop1: string; stop2: string; stop3: string; accent: string }> = {
    cyan: {
        stop1: '#0891b2', // Main Accent (cyan-600)
        stop2: '#22d3ee', // Text Connection Socket (cyan-400)
        stop3: '#1cead8', // Image Connection Socket (Bright Turquoise)
        accent: '#22d3ee'
    },
    azure: {
        stop1: '#0284c7', // Main Accent (sky-600)
        stop2: '#38bdf8', // Text Connection Socket (sky-400)
        stop3: '#60a5fa', // Image Connection Socket (blue-400)
        accent: '#38bdf8'
    },
    amber: {
        stop1: '#d97706', // amber-600
        stop2: '#fbbf24', // amber-400
        stop3: '#fde047', // yellow-400
        accent: '#fbbf24'
    },
    teal: {
        stop1: '#0f766e', // teal-700
        stop2: '#2dd4bf', // teal-400
        stop3: '#5eead4', // teal-300
        accent: '#2dd4bf'
    },
    rose: {
        stop1: '#be123c', // rose-700
        stop2: '#fb7185', // rose-400
        stop3: '#fda4af', // rose-300
        accent: '#fb7185'
    },
    purple: {
        stop1: '#7c3aed', // violet-600
        stop2: '#a78bfa', // violet-400
        stop3: '#c4b5fd', // violet-300
        accent: '#a78bfa'
    },
    pink: {
        stop1: '#db2777', // pink-600
        stop2: '#f472b6', // pink-400
        stop3: '#fbcfe8', // pink-200
        accent: '#f472b6'
    },
    red: {
        stop1: '#dc2626', // red-600
        stop2: '#f87171', // red-400
        stop3: '#fca5a5', // red-300
        accent: '#f87171'
    },
    orange: {
        stop1: '#ea580c', // orange-600
        stop2: '#fb923c', // orange-400
        stop3: '#fed7aa', // orange-200
        accent: '#fb923c'
    },
    lime: {
        stop1: '#65a30d', // lime-600
        stop2: '#a3e635', // lime-400
        stop3: '#bef264', // lime-300
        accent: '#a3e635'
    },
    emerald: {
        stop1: '#059669', // emerald-600
        stop2: '#34d399', // emerald-400
        stop3: '#6ee7b7', // emerald-300
        accent: '#34d399'
    },
    gray: {
        stop1: '#52525b', // zinc-600
        stop2: '#a1a1aa', // zinc-400
        stop3: '#d4d4d8', // zinc-300
        accent: '#e4e4e7'
    },
    pastel_mint: {
        stop1: '#0f766e',
        stop2: '#5eead4',
        stop3: '#99f6e4',
        accent: '#5eead4'
    },
    pastel_lavender: {
        stop1: '#5b4b70',
        stop2: '#c4b5db',
        stop3: '#e2d9ee',
        accent: '#c4b5db'
    },
    pastel_peach: {
        stop1: '#7d4e38',
        stop2: '#ebba9e',
        stop3: '#f5d5c3',
        accent: '#ebba9e'
    },
    pastel_rose: {
        stop1: '#704859',
        stop2: '#e2afc3',
        stop3: '#f2d3df',
        accent: '#e2afc3'
    },
    pastel_sky: {
        stop1: '#3d5a73',
        stop2: '#a5c6de',
        stop3: '#cde0ee',
        accent: '#a5c6de'
    },
    pastel_vanilla: {
        stop1: '#6d5a37',
        stop2: '#e8d49d',
        stop3: '#f4e6be',
        accent: '#e8d49d'
    },
    pastel_sage: {
        stop1: '#405d4b',
        stop2: '#a8cbb3',
        stop3: '#cee3d5',
        accent: '#a8cbb3'
    },
    pastel_sand: {
        stop1: '#78583c',
        stop2: '#e6ccb2',
        stop3: '#ede0d4',
        accent: '#e6ccb2'
    }
};

/**
 * Returns a complete CursorDefinitionSet for the rounded_gradient_adaptive skin configured for a given theme
 */
export function getRoundedGradientAdaptiveDefinition(theme: Theme = 'cyan'): CursorDefinitionSet {
    const palette = THEME_GRADIENT_PALETTES[theme] || THEME_GRADIENT_PALETTES.cyan;
    return {
        id: 'rounded_gradient_adaptive',
        nameKey: 'settings.cursorSkin.rounded_gradient_adaptive',
        descKey: 'settings.cursorSkin.rounded_gradient_adaptiveDesc',
        accentColor: palette.accent,
        glowColor: 'rgba(0, 0, 0, 0)',
        ...buildRoundedGradientSvgSet({
            id: `adaptive-${theme}`,
            stop1: palette.stop1,
            stop2: palette.stop2,
            stop3: palette.stop3,
            accentColor: palette.accent
        })
    };
}

export const roundedGradientAdaptiveSkin = getRoundedGradientAdaptiveDefinition('cyan');
