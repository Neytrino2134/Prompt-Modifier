import { CursorDefinitionSet, SkinColors } from '../types';
import { buildSciFiSvgSet } from './baseSciFiSet';

export const PLASMA_PURPLE_PALETTE: SkinColors = {
    primary: '#a855f7',      // Purple 500
    secondary: '#c084fc',    // Purple 400
    glow: 'rgba(168, 85, 247, 0.65)',
    darkBorder: '#0f051d',
    fill: '#1b0c2e',
    whiteCore: '#ffffff'
};

export const plasmaPurpleSkin: CursorDefinitionSet = {
    id: 'plasma_purple',
    nameKey: 'settings.cursorSkin.plasma_purple',
    descKey: 'settings.cursorSkin.plasma_purpleDesc',
    accentColor: PLASMA_PURPLE_PALETTE.primary,
    glowColor: PLASMA_PURPLE_PALETTE.glow,
    ...buildSciFiSvgSet(PLASMA_PURPLE_PALETTE)
};
