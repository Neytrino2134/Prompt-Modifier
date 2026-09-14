import { CursorDefinitionSet, SkinColors } from '../types';
import { buildSciFiSvgSet } from './baseSciFiSet';

export const CYBER_NEON_PALETTE: SkinColors = {
    primary: '#10b981',      // Emerald 500
    secondary: '#34d399',    // Emerald 400
    glow: 'rgba(16, 185, 129, 0.65)',
    darkBorder: '#05110c',
    fill: '#062016',
    whiteCore: '#ffffff'
};

export const cyberNeonSkin: CursorDefinitionSet = {
    id: 'cyber_neon',
    nameKey: 'settings.cursorSkin.cyber_neon',
    descKey: 'settings.cursorSkin.cyber_neonDesc',
    accentColor: CYBER_NEON_PALETTE.primary,
    glowColor: CYBER_NEON_PALETTE.glow,
    ...buildSciFiSvgSet(CYBER_NEON_PALETTE)
};
