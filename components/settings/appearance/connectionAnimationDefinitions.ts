import { ConnectionAnimationStyle, ConnectionColorMode, ConnectionAnimationConfig, Theme } from '../../../types';

export interface ConnectionThemeOption {
  id: ConnectionAnimationStyle;
  titleKey: string;
  descKey: string;
  badgeKey: string;
  accentColor: string;
  glowColor: string;
  iconName: string;
  previewType: 'trail' | 'neon' | 'pulse' | 'shimmer' | 'particles' | 'beam' | 'classic';
  isWholeLine?: boolean; // True for animations where the entire line glows/pulses rather than moving dashes
}

export const CONNECTION_THEMES: ConnectionThemeOption[] = [
  {
    id: 'cyber_tron',
    titleKey: 'settings.connectionTheme.cyber_tron',
    descKey: 'settings.connectionTheme.cyber_tronDesc',
    badgeKey: 'settings.connectionTheme.cyber_tronBadge',
    accentColor: '#00f0ff',
    glowColor: 'rgba(0, 240, 255, 0.85)',
    iconName: 'tron',
    previewType: 'trail',
    isWholeLine: false,
  },
  {
    id: 'neon_flow',
    titleKey: 'settings.connectionTheme.neon_flow',
    descKey: 'settings.connectionTheme.neon_flowDesc',
    badgeKey: 'settings.connectionTheme.neon_flowBadge',
    accentColor: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.85)',
    iconName: 'neon',
    previewType: 'neon',
    isWholeLine: true,
  },
  {
    id: 'pulse',
    titleKey: 'settings.connectionTheme.pulse',
    descKey: 'settings.connectionTheme.pulseDesc',
    badgeKey: 'settings.connectionTheme.pulseBadge',
    accentColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.85)',
    iconName: 'pulse',
    previewType: 'pulse',
    isWholeLine: true,
  },
  {
    id: 'shimmer',
    titleKey: 'settings.connectionTheme.shimmer',
    descKey: 'settings.connectionTheme.shimmerDesc',
    badgeKey: 'settings.connectionTheme.shimmerBadge',
    accentColor: '#fef08a',
    glowColor: 'rgba(254, 240, 138, 0.85)',
    iconName: 'shimmer',
    previewType: 'shimmer',
    isWholeLine: true,
  },
  {
    id: 'particle_stream',
    titleKey: 'settings.connectionTheme.particle_stream',
    descKey: 'settings.connectionTheme.particle_streamDesc',
    badgeKey: 'settings.connectionTheme.particle_streamBadge',
    accentColor: '#34d399',
    glowColor: 'rgba(52, 211, 153, 0.85)',
    iconName: 'particles',
    previewType: 'particles',
    isWholeLine: false,
  },
  {
    id: 'energy_beam',
    titleKey: 'settings.connectionTheme.energy_beam',
    descKey: 'settings.connectionTheme.energy_beamDesc',
    badgeKey: 'settings.connectionTheme.energy_beamBadge',
    accentColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.85)',
    iconName: 'beam',
    previewType: 'beam',
    isWholeLine: false,
  },
  {
    id: 'classic',
    titleKey: 'settings.connectionTheme.classic',
    descKey: 'settings.connectionTheme.classicDesc',
    badgeKey: 'settings.connectionTheme.classicBadge',
    accentColor: '#9ca3af',
    glowColor: 'rgba(156, 163, 175, 0.5)',
    iconName: 'classic',
    previewType: 'classic',
    isWholeLine: false,
  },
];

export interface ColorModeOption {
  id: ConnectionColorMode;
  titleKey: string;
  previewColor: string;
}

export const CONNECTION_COLOR_MODES: ColorModeOption[] = [
  {
    id: 'handle_type',
    titleKey: 'settings.connectionColor.handle_type',
    previewColor: 'linear-gradient(135deg, #22d3ee 0%, #ec4899 50%, #3b82f6 100%)',
  },
  {
    id: 'theme',
    titleKey: 'settings.connectionColor.theme',
    previewColor: 'var(--color-accent, #0891b2)',
  },
  {
    id: 'cyber_cyan',
    titleKey: 'settings.connectionColor.cyber_cyan',
    previewColor: '#00f0ff',
  },
  {
    id: 'neon_amber',
    titleKey: 'settings.connectionColor.neon_amber',
    previewColor: '#ffb700',
  },
  {
    id: 'plasma_pink',
    titleKey: 'settings.connectionColor.plasma_pink',
    previewColor: '#ff007f',
  },
  {
    id: 'matrix_green',
    titleKey: 'settings.connectionColor.matrix_green',
    previewColor: '#00ff66',
  },
  {
    id: 'rainbow',
    titleKey: 'settings.connectionColor.rainbow',
    previewColor: 'linear-gradient(90deg, #ff0055, #ffaa00, #00ff66, #00f0ff, #a855f7)',
  },
];

export const getEffectiveConnectionColor = (
  colorMode: ConnectionColorMode,
  defaultHandleColor: string,
  themeColor: string
): string => {
  switch (colorMode) {
    case 'handle_type':
      return defaultHandleColor;
    case 'theme':
      return themeColor || '#22d3ee';
    case 'cyber_cyan':
      return '#00f0ff';
    case 'neon_amber':
      return '#ffb700';
    case 'plasma_pink':
      return '#ff007f';
    case 'matrix_green':
      return '#00ff66';
    case 'rainbow':
      return '#00f0ff';
    default:
      return defaultHandleColor;
  }
};

/**
 * Returns color palette array for continuous shifting gradient in Neon Flow
 */
export const getNeonFlowGradientStops = (
  colorMode: ConnectionColorMode,
  baseColor: string
): string[] => {
  switch (colorMode) {
    case 'cyber_cyan':
      return ['#00f0ff', '#0077ff', '#7000ff', '#00f0ff', '#38bdf8'];
    case 'neon_amber':
      return ['#ffb700', '#ff5500', '#ff0055', '#ffaa00', '#ffcc00'];
    case 'plasma_pink':
      return ['#ff007f', '#a855f7', '#00f0ff', '#ec4899', '#ff007f'];
    case 'matrix_green':
      return ['#00ff66', '#00f0ff', '#a3e635', '#059669', '#00ff66'];
    case 'rainbow':
      return ['#ff0055', '#ffaa00', '#00ff66', '#00f0ff', '#a855f7', '#ff0055'];
    case 'theme':
    case 'handle_type':
    default:
      return [baseColor, '#a855f7', '#ec4899', '#38bdf8', baseColor];
  }
};

/**
 * 9 Gradations for Cyber Tron tail fading (plus 1 photon head = 10 stages total)
 */
export const CYBER_TRON_GRADATIONS = [
  // level 0: Tail tip (full length, lowest opacity, soft glow)
  { lenFrac: 1.00, widthMul: 0.40, opacityMul: 0.08 },
  // level 1
  { lenFrac: 0.88, widthMul: 0.48, opacityMul: 0.16 },
  // level 2
  { lenFrac: 0.76, widthMul: 0.56, opacityMul: 0.25 },
  // level 3
  { lenFrac: 0.64, widthMul: 0.64, opacityMul: 0.36 },
  // level 4
  { lenFrac: 0.52, widthMul: 0.72, opacityMul: 0.48 },
  // level 5
  { lenFrac: 0.40, widthMul: 0.80, opacityMul: 0.60 },
  // level 6
  { lenFrac: 0.30, widthMul: 0.88, opacityMul: 0.72 },
  // level 7
  { lenFrac: 0.20, widthMul: 0.98, opacityMul: 0.84 },
  // level 8: Just behind the photon head
  { lenFrac: 0.10, widthMul: 1.10, opacityMul: 0.94 },
];
