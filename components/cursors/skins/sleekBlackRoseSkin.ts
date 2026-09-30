import { CursorDefinitionSet } from '../types';
import { buildSleekBlackSvgSet } from './baseSleekBlackSet';

export const sleekBlackRoseSkin: CursorDefinitionSet = {
    id: 'sleek_black_rose',
    nameKey: 'settings.cursorSkin.sleekBlackRose',
    descKey: 'settings.cursorSkin.sleekBlackRoseDesc',
    accentColor: '#f43f5e',
    glowColor: 'rgba(244, 63, 94, 0.65)',
    ...buildSleekBlackSvgSet('#f43f5e', '#fb7185', false)
};
