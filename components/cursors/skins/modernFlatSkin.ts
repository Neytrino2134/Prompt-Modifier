import { Theme } from '../../../types';
import { CursorDefinitionSet, THEME_ACCENT_COLORS } from '../types';
import { buildModernFlatSvgSet } from './baseModernFlatSet';

/**
 * Returns a complete CursorDefinitionSet for the modern_flat (Modern Flat White) skin configured for a given theme
 */
export function getModernFlatDefinition(theme: Theme = 'cyan'): CursorDefinitionSet {
    const themeColor = THEME_ACCENT_COLORS[theme] || THEME_ACCENT_COLORS.cyan;
    return {
        id: 'modern_flat',
        nameKey: 'settings.cursorSkin.modernFlat',
        descKey: 'settings.cursorSkin.modernFlatDesc',
        accentColor: themeColor.primary,
        glowColor: themeColor.glow,
        ...buildModernFlatSvgSet(themeColor.primary, themeColor.secondary, false)
    };
}

export const modernFlatSkin = getModernFlatDefinition('cyan');
