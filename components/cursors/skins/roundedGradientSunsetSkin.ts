import { CursorDefinitionSet } from '../types';
import { buildRoundedGradientSvgSet } from './baseRoundedGradientSet';

export const roundedGradientSunsetSkin: CursorDefinitionSet = {
    id: 'rounded_gradient_sunset',
    nameKey: 'settings.cursorSkin.rounded_gradient_sunset',
    descKey: 'settings.cursorSkin.rounded_gradient_sunsetDesc',
    accentColor: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.5)',
    ...buildRoundedGradientSvgSet({
        id: 'sunset',
        stop1: '#f59e0b', // Rich Warm Amber Gold
        stop2: '#f43f5e', // Vibrant Coral Rose
        stop3: '#be123c', // Deep Crimson
        accentColor: '#f97316'
    })
};
