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
    purple: {
        outerColor: '#9333ea', // Purple-600
        innerColor: '#c084fc', // Purple-400
        accent: '#c084fc'
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
