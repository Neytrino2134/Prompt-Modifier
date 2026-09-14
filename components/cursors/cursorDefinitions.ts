import { CursorSkin, Theme } from '../../types';
import { CursorDefinitionSet, renderCssRules, THEME_ACCENT_COLORS, svgToDataUri, SkinColors } from './types';
import { defaultSkin } from './skins/defaultSkin';
import { promptModifierSkin } from './skins/promptModifierSkin';
import { cyberNeonSkin } from './skins/cyberNeonSkin';
import { amberGoldSkin } from './skins/amberGoldSkin';
import { plasmaPurpleSkin } from './skins/plasmaPurpleSkin';
import { modernFlatSkin, getModernFlatDefinition } from './skins/modernFlatSkin';
import { modernFlatDarkSkin, getModernFlatDarkDefinition } from './skins/modernFlatDarkSkin';
import { modernFlatDarkCyanSkin } from './skins/modernFlatDarkCyanSkin';
import { modernFlatDarkWhiteSkin } from './skins/modernFlatDarkWhiteSkin';
import { roundedGradientCyanSkin } from './skins/roundedGradientCyanSkin';
import { roundedGradientAdaptiveSkin, getRoundedGradientAdaptiveDefinition } from './skins/roundedGradientAdaptiveSkin';
import { roundedGradientPurpleSkin } from './skins/roundedGradientPurpleSkin';
import { roundedGradientVioletOrangeSkin } from './skins/roundedGradientVioletOrangeSkin';
import { roundedGradientSunsetSkin } from './skins/roundedGradientSunsetSkin';
import { roundedGradientEmeraldSkin } from './skins/roundedGradientEmeraldSkin';
import { roundedGradientRoseSkin } from './skins/roundedGradientRoseSkin';
import { toyAdaptiveSkin, getToyAdaptiveDefinition } from './skins/toyAdaptiveSkin';
import { toyClassicBlueSkin } from './skins/toyClassicBlueSkin';
import { toyBubblegumSkin } from './skins/toyBubblegumSkin';
import { toyMintSkin } from './skins/toyMintSkin';
import { toyAmberSkin } from './skins/toyAmberSkin';
import { toyLilacSkin } from './skins/toyLilacSkin';

// Re-export types and helpers for external usage
export * from './types';
export { getModernFlatDefinition } from './skins/modernFlatSkin';
export { getModernFlatDarkDefinition } from './skins/modernFlatDarkSkin';
export { modernFlatDarkCyanSkin } from './skins/modernFlatDarkCyanSkin';
export { modernFlatDarkWhiteSkin } from './skins/modernFlatDarkWhiteSkin';
export { defaultSkin } from './skins/defaultSkin';
export { promptModifierSkin } from './skins/promptModifierSkin';
export { cyberNeonSkin } from './skins/cyberNeonSkin';
export { amberGoldSkin } from './skins/amberGoldSkin';
export { plasmaPurpleSkin } from './skins/plasmaPurpleSkin';
export { modernFlatSkin } from './skins/modernFlatSkin';
export { modernFlatDarkSkin } from './skins/modernFlatDarkSkin';
export { roundedGradientCyanSkin } from './skins/roundedGradientCyanSkin';
export { roundedGradientAdaptiveSkin, getRoundedGradientAdaptiveDefinition } from './skins/roundedGradientAdaptiveSkin';
export { roundedGradientPurpleSkin } from './skins/roundedGradientPurpleSkin';
export { roundedGradientVioletOrangeSkin } from './skins/roundedGradientVioletOrangeSkin';
export { roundedGradientSunsetSkin } from './skins/roundedGradientSunsetSkin';
export { roundedGradientEmeraldSkin } from './skins/roundedGradientEmeraldSkin';
export { roundedGradientRoseSkin } from './skins/roundedGradientRoseSkin';
export { toyAdaptiveSkin, getToyAdaptiveDefinition } from './skins/toyAdaptiveSkin';
export { toyClassicBlueSkin } from './skins/toyClassicBlueSkin';
export { toyBubblegumSkin } from './skins/toyBubblegumSkin';
export { toyMintSkin } from './skins/toyMintSkin';
export { toyAmberSkin } from './skins/toyAmberSkin';
export { toyLilacSkin } from './skins/toyLilacSkin';

export const CURSOR_SETS: Record<CursorSkin, CursorDefinitionSet> = {
    default: defaultSkin,
    rounded_gradient_cyan: roundedGradientCyanSkin,
    rounded_gradient_adaptive: roundedGradientAdaptiveSkin,
    rounded_gradient_purple: roundedGradientPurpleSkin,
    rounded_gradient_violet_orange: roundedGradientVioletOrangeSkin,
    rounded_gradient_sunset: roundedGradientSunsetSkin,
    rounded_gradient_emerald: roundedGradientEmeraldSkin,
    rounded_gradient_rose: roundedGradientRoseSkin,
    toy_adaptive: toyAdaptiveSkin,
    toy_classic_blue: toyClassicBlueSkin,
    toy_bubblegum: toyBubblegumSkin,
    toy_mint: toyMintSkin,
    toy_amber: toyAmberSkin,
    toy_lilac: toyLilacSkin,
    modern_flat: modernFlatSkin,
    modern_flat_dark: modernFlatDarkSkin,
    modern_flat_dark_cyan: modernFlatDarkCyanSkin,
    modern_flat_dark_white: modernFlatDarkWhiteSkin,
    prompt_modifier: promptModifierSkin,
    cyber_neon: cyberNeonSkin,
    amber_gold: amberGoldSkin,
    plasma_purple: plasmaPurpleSkin,
};

/**
 * Returns the currently active CursorDefinitionSet based on skin and theme
 */
export function getActiveCursorDefinition(skin: CursorSkin, theme: Theme = 'cyan'): CursorDefinitionSet {
    if (skin === 'rounded_gradient_adaptive') {
        return getRoundedGradientAdaptiveDefinition(theme);
    }
    if (skin === 'toy_adaptive') {
        return getToyAdaptiveDefinition(theme);
    }
    if (skin === 'modern_flat') {
        return getModernFlatDefinition(theme);
    }
    if (skin === 'modern_flat_dark') {
        return getModernFlatDarkDefinition(theme);
    }
    if (skin === 'modern_flat_dark_cyan') {
        return modernFlatDarkCyanSkin;
    }
    if (skin === 'modern_flat_dark_white') {
        return modernFlatDarkWhiteSkin;
    }
    return CURSOR_SETS[skin] || CURSOR_SETS.rounded_gradient_cyan || CURSOR_SETS.prompt_modifier;
}

/**
 * Generates global CSS injection string based on active skin and theme
 */
export function generateCursorCss(skin: CursorSkin, currentTheme: Theme = 'cyan'): string {
    const allThemes: Theme[] = ['cyan', 'orange', 'pink', 'gray', 'lime', 'purple', 'azure', 'red', 'emerald'];

    if (skin === 'rounded_gradient_adaptive') {
        const activeDef = getRoundedGradientAdaptiveDefinition(currentTheme);
        let css = `/* Custom Dynamic Cursor Skin: Rounded Gradient (Adaptive Theme) */\n`;
        // Base fallback
        css += renderCssRules(`html[data-cursor-skin="rounded_gradient_adaptive"]`, activeDef.cursors);
        // Instant pure-CSS rules for each specific theme
        for (const t of allThemes) {
            const tDef = getRoundedGradientAdaptiveDefinition(t);
            css += renderCssRules(`html[data-cursor-skin="rounded_gradient_adaptive"][data-theme="${t}"]`, tDef.cursors);
        }
        return css;
    }

    if (skin === 'toy_adaptive') {
        const activeDef = getToyAdaptiveDefinition(currentTheme);
        let css = `/* Custom Dynamic Cursor Skin: Toy Style (Adaptive Theme) */\n`;
        // Base fallback
        css += renderCssRules(`html[data-cursor-skin="toy_adaptive"]`, activeDef.cursors);
        // Instant pure-CSS rules for each specific theme
        for (const t of allThemes) {
            const tDef = getToyAdaptiveDefinition(t);
            css += renderCssRules(`html[data-cursor-skin="toy_adaptive"][data-theme="${t}"]`, tDef.cursors);
        }
        return css;
    }

    if (skin === 'modern_flat') {
        const activeDef = getModernFlatDefinition(currentTheme);
        let css = `/* Custom Dynamic Cursor Skin: Modern Flat White (Adaptive Theme) */\n`;
        // Base fallback for modern_flat using current theme
        css += renderCssRules(`html[data-cursor-skin="modern_flat"]`, activeDef.cursors);
        // Instant pure-CSS rules for each specific theme
        for (const t of allThemes) {
            const tDef = getModernFlatDefinition(t);
            css += renderCssRules(`html[data-cursor-skin="modern_flat"][data-theme="${t}"]`, tDef.cursors);
        }
        return css;
    }

    if (skin === 'modern_flat_dark') {
        const activeDef = getModernFlatDarkDefinition(currentTheme);
        let css = `/* Custom Dynamic Cursor Skin: Modern Flat Dark (Adaptive Theme) */\n`;
        // Base fallback for modern_flat_dark using current theme
        css += renderCssRules(`html[data-cursor-skin="modern_flat_dark"]`, activeDef.cursors);
        // Instant pure-CSS rules for each specific theme
        for (const t of allThemes) {
            const tDef = getModernFlatDarkDefinition(t);
            css += renderCssRules(`html[data-cursor-skin="modern_flat_dark"][data-theme="${t}"]`, tDef.cursors);
        }
        return css;
    }

    const def = CURSOR_SETS[skin] || CURSOR_SETS.rounded_gradient_cyan || CURSOR_SETS.prompt_modifier;
    return renderCssRules(`html[data-cursor-skin="${skin}"]`, def.cursors);
}
