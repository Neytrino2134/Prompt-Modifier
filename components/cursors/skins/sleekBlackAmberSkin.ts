import { CursorDefinitionSet } from '../types';
import { buildSleekBlackSvgSet } from './baseSleekBlackSet';

export const sleekBlackAmberSkin: CursorDefinitionSet = {
    id: 'sleek_black_amber',
    nameKey: 'settings.cursorSkin.sleekBlackAmber',
    descKey: 'settings.cursorSkin.sleekBlackAmberDesc',
    accentColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.65)',
    ...buildSleekBlackSvgSet('#f59e0b', '#fbbf24', false)
};
