import { CursorDefinitionSet } from '../types';
import { buildModernFlatSvgSet } from './baseModernFlatSet';

export const modernFlatDarkCyanSkin: CursorDefinitionSet = {
    id: 'modern_flat_dark_cyan',
    nameKey: 'settings.cursorSkin.modernFlatDarkCyan',
    descKey: 'settings.cursorSkin.modernFlatDarkCyanDesc',
    accentColor: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.65)',
    ...buildModernFlatSvgSet('#06b6d4', '#22d3ee', true)
};
