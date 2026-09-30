import { CursorDefinitionSet } from '../types';
import { buildSleekBlackSvgSet } from './baseSleekBlackSet';

export const sleekBlackWhiteSkin: CursorDefinitionSet = {
    id: 'sleek_black_white',
    nameKey: 'settings.cursorSkin.sleekBlackWhite',
    descKey: 'settings.cursorSkin.sleekBlackWhiteDesc',
    accentColor: '#ffffff',
    glowColor: 'rgba(255, 255, 255, 0.75)',
    ...buildSleekBlackSvgSet('#ffffff', '#e2e8f0', true)
};
