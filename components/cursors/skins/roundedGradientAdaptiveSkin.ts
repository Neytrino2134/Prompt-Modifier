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
    purple: {
        stop1: '#9333ea', // Main Accent (purple-600)
        stop2: '#c084fc', // Text Connection Socket (purple-400)
        stop3: '#e879f9', // Image Connection Socket (fuchsia-400)
        accent: '#c084fc'
    },
    pink: {
        stop1: '#c63672', // Main Accent
        stop2: '#f472b6', // Text Connection Socket (pink-400)
        stop3: '#e879f9', // Image Connection Socket (fuchsia-400)
        accent: '#f472b6'
    },
    red: {
        stop1: '#e33d3d', // Main Accent
        stop2: '#f87171', // Text Connection Socket (red-400)
        stop3: '#fb7185', // Image Connection Socket (rose-400)
        accent: '#f87171'
    },
    orange: {
        stop1: '#d25622', // Main Accent
        stop2: '#fb923c', // Text Connection Socket (orange-400)
        stop3: '#fbbf24', // Image Connection Socket (amber-400)
        accent: '#fb923c'
    },
    lime: {
        stop1: '#65a30d', // Main Accent (lime-600)
        stop2: '#a3e635', // Text Connection Socket (lime-400)
        stop3: '#4ade80', // Image Connection Socket (green-400)
        accent: '#a3e635'
    },
    emerald: {
        stop1: '#059669', // Main Accent (emerald-600)
        stop2: '#34d399', // Text Connection Socket (emerald-400)
        stop3: '#2dd4bf', // Image Connection Socket (teal-400)
        accent: '#34d399'
    },
    gray: {
        stop1: '#52525b', // Main Accent (zinc-600)
        stop2: '#a1a1aa', // Text Connection Socket (zinc-400)
        stop3: '#d4d4d8', // Image Connection Socket (zinc-300)
        accent: '#e4e4e7'
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
