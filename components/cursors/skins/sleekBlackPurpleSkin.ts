import { CursorDefinitionSet } from '../types';
import { buildSleekBlackSvgSet } from './baseSleekBlackSet';

export const sleekBlackPurpleSkin: CursorDefinitionSet = {
    id: 'sleek_black_purple',
    nameKey: 'settings.cursorSkin.sleekBlackPurple',
    descKey: 'settings.cursorSkin.sleekBlackPurpleDesc',
    accentColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.65)',
    ...buildSleekBlackSvgSet('#a855f7', '#c084fc', false)
};
