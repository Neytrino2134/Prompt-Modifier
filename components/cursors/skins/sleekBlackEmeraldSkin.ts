import { CursorDefinitionSet } from '../types';
import { buildSleekBlackSvgSet } from './baseSleekBlackSet';

export const sleekBlackEmeraldSkin: CursorDefinitionSet = {
    id: 'sleek_black_emerald',
    nameKey: 'settings.cursorSkin.sleekBlackEmerald',
    descKey: 'settings.cursorSkin.sleekBlackEmeraldDesc',
    accentColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.65)',
    ...buildSleekBlackSvgSet('#10b981', '#34d399', false)
};
