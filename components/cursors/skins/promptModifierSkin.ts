import { CursorDefinitionSet, SkinColors } from '../types';
import { buildSciFiSvgSet } from './baseSciFiSet';

export const PROMPT_MODIFIER_PALETTE: SkinColors = {
    primary: '#06b6d4',      // Cyan 500
    secondary: '#22d3ee',    // Cyan 400
    glow: 'rgba(6, 182, 212, 0.65)',
    darkBorder: '#090d16',
    fill: '#0f172a',
    whiteCore: '#ffffff'
};

export const promptModifierSkin: CursorDefinitionSet = {
    id: 'prompt_modifier',
    nameKey: 'settings.cursorSkin.prompt_modifier',
    descKey: 'settings.cursorSkin.prompt_modifierDesc',
    accentColor: PROMPT_MODIFIER_PALETTE.primary,
    glowColor: PROMPT_MODIFIER_PALETTE.glow,
    ...buildSciFiSvgSet(PROMPT_MODIFIER_PALETTE)
};
