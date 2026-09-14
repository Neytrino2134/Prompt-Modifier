import { CursorDefinitionSet } from '../types';
import { buildRoundedGradientSvgSet } from './baseRoundedGradientSet';

export const roundedGradientEmeraldSkin: CursorDefinitionSet = {
    id: 'rounded_gradient_emerald',
    nameKey: 'settings.cursorSkin.rounded_gradient_emerald',
    descKey: 'settings.cursorSkin.rounded_gradient_emeraldDesc',
    accentColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.5)',
    ...buildRoundedGradientSvgSet({
        id: 'emerald',
        stop1: '#10b981', // Vivid Emerald Green
        stop2: '#06b6d4', // Bright Teal
        stop3: '#0369a1', // Deep Ocean Blue
        accentColor: '#10b981'
    })
};
