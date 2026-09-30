import { CursorDefinitionSet } from '../types';
import { buildSleekBlackSvgSet } from './baseSleekBlackSet';

export const sleekBlackCyanSkin: CursorDefinitionSet = {
    id: 'sleek_black_cyan',
    nameKey: 'settings.cursorSkin.sleekBlackCyan',
    descKey: 'settings.cursorSkin.sleekBlackCyanDesc',
    accentColor: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.65)',
    ...buildSleekBlackSvgSet('#06b6d4', '#22d3ee', false)
};
