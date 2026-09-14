import { CursorDefinitionSet } from '../types';
import { buildRoundedGradientSvgSet } from './baseRoundedGradientSet';

export const roundedGradientPurpleSkin: CursorDefinitionSet = {
    id: 'rounded_gradient_purple',
    nameKey: 'settings.cursorSkin.rounded_gradient_purple',
    descKey: 'settings.cursorSkin.rounded_gradient_purpleDesc',
    accentColor: '#d946ef',
    glowColor: 'rgba(217, 70, 239, 0.5)',
    ...buildRoundedGradientSvgSet({
        id: 'purple',
        stop1: '#ff2d75', // Hot Neon Pink
        stop2: '#c026d3', // Electric Purple
        stop3: '#6d28d9', // Deep Violet
        accentColor: '#d946ef'
    })
};
