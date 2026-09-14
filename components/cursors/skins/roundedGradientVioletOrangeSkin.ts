import { CursorDefinitionSet } from '../types';
import { buildRoundedGradientSvgSet } from './baseRoundedGradientSet';

export const roundedGradientVioletOrangeSkin: CursorDefinitionSet = {
    id: 'rounded_gradient_violet_orange',
    nameKey: 'settings.cursorSkin.rounded_gradient_violet_orange',
    descKey: 'settings.cursorSkin.rounded_gradient_violet_orangeDesc',
    accentColor: '#ff7700',
    glowColor: 'rgba(255, 119, 0, 0.5)',
    ...buildRoundedGradientSvgSet({
        id: 'violet-orange',
        stop1: '#ff7700', // Vivid Solar Orange
        stop2: '#ec4899', // Harmonic Pink Bridge
        stop3: '#6366f1', // Electric Indigo Violet
        accentColor: '#ff7700'
    })
};
