import { CursorDefinitionSet } from '../types';
import { Theme } from '../../../types';
import { buildToySvgSet } from './baseToySet';

export const TOY_THEME_PALETTES: Record<Theme, { outerColor: string; innerColor: string; accent: string }> = {
    cyan: {
        outerColor: '#0891b2', // Cyan-600
        innerColor: '#22d3ee', // Cyan-400
        accent: '#22d3ee'
    },
    azure: {
        outerColor: '#385b7a', // Slate/Azure Blue matching concept reference
        innerColor: '#688fae', // Slate-400
        accent: '#38bdf8'
    },
    amber: {
        outerColor: '#d97706', // Amber-600
        innerColor: '#fbbf24', // Amber-400
        accent: '#fbbf24'
    },
    teal: {
        outerColor: '#0f766e', // Teal-700
        innerColor: '#2dd4bf', // Teal-400
        accent: '#2dd4bf'
    },
    rose: {
        outerColor: '#be123c', // Rose-700
        innerColor: '#fb7185', // Rose-400
        accent: '#fb7185'
    },
    purple: {
        outerColor: '#7c3aed', // Violet-600
        innerColor: '#a78bfa', // Violet-400
        accent: '#a78bfa'
    },
    pink: {
        outerColor: '#db2777', // Pink-600
        innerColor: '#f472b6', // Pink-400
        accent: '#f472b6'
    },
    red: {
        outerColor: '#dc2626', // Red-600
        innerColor: '#f87171', // Red-400
        accent: '#f87171'
    },
    orange: {
        outerColor: '#ea580c', // Orange-600
        innerColor: '#fb923c', // Orange-400
        accent: '#fb923c'
    },
    lime: {
        outerColor: '#65a30d', // Lime-600
        innerColor: '#a3e635', // Lime-400
        accent: '#a3e635'
    },
    emerald: {
        outerColor: '#059669', // Emerald-600
        innerColor: '#34d399', // Emerald-400
        accent: '#34d399'
    },
    gray: {
        outerColor: '#52525b', // Zinc-600
        innerColor: '#a1a1aa', // Zinc-400
        accent: '#e4e4e7'
    },
    pastel_mint: {
        outerColor: '#0f766e',
        innerColor: '#5eead4',
        accent: '#5eead4'
    },
    pastel_lavender: {
        outerColor: '#5b4b70',
        innerColor: '#c4b5db',
        accent: '#c4b5db'
    },
    pastel_peach: {
        outerColor: '#7d4e38',
        innerColor: '#ebba9e',
        accent: '#ebba9e'
    },
    pastel_rose: {
        outerColor: '#704859',
        innerColor: '#e2afc3',
        accent: '#e2afc3'
    },
    pastel_sky: {
        outerColor: '#3d5a73',
        innerColor: '#a5c6de',
        accent: '#a5c6de'
    },
    pastel_vanilla: {
        outerColor: '#6d5a37',
        innerColor: '#e8d49d',
        accent: '#e8d49d'
    },
    pastel_sage: {
        outerColor: '#405d4b',
        innerColor: '#a8cbb3',
        accent: '#a8cbb3'
    },
    pastel_sand: {
        outerColor: '#78583c',
        innerColor: '#e6ccb2',
        accent: '#e6ccb2'
    }
};

/**
 * Returns a complete CursorDefinitionSet for the toy_adaptive skin configured for a given theme
 */
export function getToyAdaptiveDefinition(theme: Theme = 'cyan'): CursorDefinitionSet {
    const palette = TOY_THEME_PALETTES[theme] || TOY_THEME_PALETTES.cyan;
    return {
        id: 'toy_adaptive',
        nameKey: 'settings.cursorSkin.toy_adaptive',
        descKey: 'settings.cursorSkin.toy_adaptiveDesc',
        accentColor: palette.accent,
        glowColor: `${palette.accent}80`,
        ...buildToySvgSet({
            id: `toy-adaptive-${theme}`,
            outerColor: palette.outerColor,
            innerColor: palette.innerColor,
            accentColor: palette.accent
        })
    };
}

export const toyAdaptiveSkin: CursorDefinitionSet = getToyAdaptiveDefinition('cyan');
