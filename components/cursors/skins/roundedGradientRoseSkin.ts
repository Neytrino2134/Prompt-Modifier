import { CursorDefinitionSet } from '../types';
import { buildRoundedGradientSvgSet } from './baseRoundedGradientSet';

export const roundedGradientRoseSkin: CursorDefinitionSet = {
    id: 'rounded_gradient_rose',
    nameKey: 'settings.cursorSkin.rounded_gradient_rose',
    descKey: 'settings.cursorSkin.rounded_gradient_roseDesc',
    accentColor: '#fb7185',
    glowColor: 'rgba(251, 113, 133, 0.5)',
    ...buildRoundedGradientSvgSet({
        id: 'rose',
        stop1: '#fb7185', // Radiant Rose
        stop2: '#e11d48', // Vibrant Crimson
        stop3: '#701a75', // Deep Velvet Fuchsia
        accentColor: '#fb7185'
    })
};
