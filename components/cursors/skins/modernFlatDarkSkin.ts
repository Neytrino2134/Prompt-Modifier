import { Theme } from '../../../types';
import { CursorDefinitionSet, THEME_ACCENT_COLORS } from '../types';
import { buildModernFlatSvgSet } from './baseModernFlatSet';

/**
 * Returns a complete CursorDefinitionSet for the modern_flat_dark (Modern Flat Dark) skin configured for a given theme
 */
export function getModernFlatDarkDefinition(theme: Theme = 'cyan'): CursorDefinitionSet {
    const themeColor = THEME_ACCENT_COLORS[theme] || THEME_ACCENT_COLORS.cyan;
    return {
        id: 'modern_flat_dark',
        nameKey: 'settings.cursorSkin.modernFlatDark',
        descKey: 'settings.cursorSkin.modernFlatDarkDesc',
        accentColor: themeColor.primary,
        glowColor: themeColor.glow,
        ...buildModernFlatSvgSet(themeColor.primary, themeColor.secondary, true)
    };
}

export const modernFlatDarkSkin = getModernFlatDarkDefinition('cyan');
