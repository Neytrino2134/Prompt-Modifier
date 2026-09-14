import { CursorDefinitionSet } from '../types';
import { buildModernFlatSvgSet } from './baseModernFlatSet';

export const modernFlatDarkWhiteSkin: CursorDefinitionSet = {
    id: 'modern_flat_dark_white',
    nameKey: 'settings.cursorSkin.modernFlatDarkWhite',
    descKey: 'settings.cursorSkin.modernFlatDarkWhiteDesc',
    accentColor: '#ffffff',
    glowColor: 'rgba(255, 255, 255, 0.65)',
    ...buildModernFlatSvgSet('#ffffff', '#e2e8f0', true)
};
