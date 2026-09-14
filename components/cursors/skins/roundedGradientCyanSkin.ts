import { CursorDefinitionSet } from '../types';
import { buildRoundedGradientSvgSet } from './baseRoundedGradientSet';

export const roundedGradientCyanSkin: CursorDefinitionSet = {
    id: 'rounded_gradient_cyan',
    nameKey: 'settings.cursorSkin.rounded_gradient_cyan',
    descKey: 'settings.cursorSkin.rounded_gradient_cyanDesc',
    accentColor: '#22d3ee',
    glowColor: 'rgba(34, 211, 238, 0.5)',
    ...buildRoundedGradientSvgSet({
        id: 'cyan',
        stop1: '#0891b2', // Main Theme Cyan Accent (#0891b2)
        stop2: '#22d3ee', // Text Connection Socket Color (#22d3ee)
        stop3: '#1cead8', // Image Connection Socket Color (#1cead8)
        accentColor: '#22d3ee'
    })
};
