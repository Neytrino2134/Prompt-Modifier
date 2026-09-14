import { CursorDefinitionSet, SkinColors } from '../types';
import { buildSciFiSvgSet } from './baseSciFiSet';

export const AMBER_GOLD_PALETTE: SkinColors = {
    primary: '#f59e0b',      // Amber 500
    secondary: '#fbbf24',    // Amber 400
    glow: 'rgba(245, 158, 11, 0.65)',
    darkBorder: '#140c03',
    fill: '#1e1408',
    whiteCore: '#ffffff'
};

export const amberGoldSkin: CursorDefinitionSet = {
    id: 'amber_gold',
    nameKey: 'settings.cursorSkin.amber_gold',
    descKey: 'settings.cursorSkin.amber_goldDesc',
    accentColor: AMBER_GOLD_PALETTE.primary,
    glowColor: AMBER_GOLD_PALETTE.glow,
    ...buildSciFiSvgSet(AMBER_GOLD_PALETTE)
};
