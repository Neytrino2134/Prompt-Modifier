import React from 'react';
import { PanelAnimation, Theme } from '../../../types';

export interface ThemeAnimationPalette {
  primary: string;
  secondary: string;
  highlight: string;
  dim: string;
  glow: string;
  subtleGlow: string;
  waveGradient: string[];
  auroraGradient: string[];
  neonStops: string[];
  svgStroke: string;
  svgFill: string;
  particleColor: string;
}

export const THEME_ANIMATION_PALETTES: Record<Theme, ThemeAnimationPalette> = {
  cyan: {
    primary: '#22d3ee',
    secondary: '#0891b2',
    highlight: '#67e8f9',
    dim: 'rgba(34, 211, 238, 0.10)',
    glow: 'rgba(34, 211, 238, 0.40)',
    subtleGlow: 'rgba(34, 211, 238, 0.16)',
    waveGradient: ['rgba(8, 145, 178, 0.05)', 'rgba(34, 211, 238, 0.18)', 'rgba(103, 232, 249, 0.28)', 'rgba(34, 211, 238, 0.18)', 'rgba(8, 145, 178, 0.05)'],
    auroraGradient: ['rgba(8, 145, 178, 0.25)', 'rgba(6, 182, 212, 0.35)', 'rgba(45, 212, 191, 0.35)', 'rgba(56, 189, 248, 0.30)'],
    neonStops: ['#0891b2', '#22d3ee', '#67e8f9', '#22d3ee', '#0891b2'],
    svgStroke: '#22d3ee',
    svgFill: 'rgba(34, 211, 238, 0.20)',
    particleColor: '#67e8f9',
  },
  orange: {
    primary: '#fb923c',
    secondary: '#d25622',
    highlight: '#fed7aa',
    dim: 'rgba(251, 146, 60, 0.10)',
    glow: 'rgba(251, 146, 60, 0.40)',
    subtleGlow: 'rgba(251, 146, 60, 0.16)',
    waveGradient: ['rgba(210, 86, 34, 0.05)', 'rgba(251, 146, 60, 0.18)', 'rgba(254, 215, 170, 0.28)', 'rgba(251, 146, 60, 0.18)', 'rgba(210, 86, 34, 0.05)'],
    auroraGradient: ['rgba(210, 86, 34, 0.25)', 'rgba(249, 115, 22, 0.35)', 'rgba(245, 158, 11, 0.35)', 'rgba(239, 68, 68, 0.30)'],
    neonStops: ['#d25622', '#fb923c', '#fde047', '#fb923c', '#d25622'],
    svgStroke: '#fb923c',
    svgFill: 'rgba(251, 146, 60, 0.20)',
    particleColor: '#fed7aa',
  },
  pink: {
    primary: '#f472b6',
    secondary: '#c63672',
    highlight: '#fbcfe8',
    dim: 'rgba(244, 114, 182, 0.10)',
    glow: 'rgba(244, 114, 182, 0.40)',
    subtleGlow: 'rgba(244, 114, 182, 0.16)',
    waveGradient: ['rgba(198, 54, 114, 0.05)', 'rgba(244, 114, 182, 0.18)', 'rgba(251, 207, 232, 0.28)', 'rgba(244, 114, 182, 0.18)', 'rgba(198, 54, 114, 0.05)'],
    auroraGradient: ['rgba(198, 54, 114, 0.25)', 'rgba(236, 72, 153, 0.35)', 'rgba(217, 70, 239, 0.35)', 'rgba(168, 85, 247, 0.30)'],
    neonStops: ['#c63672', '#f472b6', '#fbcfe8', '#f472b6', '#c63672'],
    svgStroke: '#f472b6',
    svgFill: 'rgba(244, 114, 182, 0.20)',
    particleColor: '#fbcfe8',
  },
  gray: {
    primary: '#e4e4e7',
    secondary: '#71717a',
    highlight: '#ffffff',
    dim: 'rgba(228, 228, 231, 0.08)',
    glow: 'rgba(228, 228, 231, 0.35)',
    subtleGlow: 'rgba(228, 228, 231, 0.14)',
    waveGradient: ['rgba(113, 113, 122, 0.05)', 'rgba(228, 228, 231, 0.16)', 'rgba(255, 255, 255, 0.26)', 'rgba(228, 228, 231, 0.16)', 'rgba(113, 113, 122, 0.05)'],
    auroraGradient: ['rgba(82, 82, 91, 0.25)', 'rgba(161, 161, 170, 0.30)', 'rgba(212, 212, 216, 0.35)', 'rgba(113, 113, 122, 0.25)'],
    neonStops: ['#52525b', '#a1a1aa', '#ffffff', '#a1a1aa', '#52525b'],
    svgStroke: '#d4d4d8',
    svgFill: 'rgba(228, 228, 231, 0.18)',
    particleColor: '#ffffff',
  },
  lime: {
    primary: '#a3e635',
    secondary: '#65a30d',
    highlight: '#d9f99d',
    dim: 'rgba(163, 230, 53, 0.10)',
    glow: 'rgba(163, 230, 53, 0.40)',
    subtleGlow: 'rgba(163, 230, 53, 0.16)',
    waveGradient: ['rgba(101, 163, 13, 0.05)', 'rgba(163, 230, 53, 0.18)', 'rgba(217, 249, 157, 0.28)', 'rgba(163, 230, 53, 0.18)', 'rgba(101, 163, 13, 0.05)'],
    auroraGradient: ['rgba(101, 163, 13, 0.25)', 'rgba(132, 204, 22, 0.35)', 'rgba(74, 222, 128, 0.35)', 'rgba(234, 179, 8, 0.30)'],
    neonStops: ['#65a30d', '#a3e635', '#fef08a', '#a3e635', '#65a30d'],
    svgStroke: '#a3e635',
    svgFill: 'rgba(163, 230, 53, 0.20)',
    particleColor: '#d9f99d',
  },
  purple: {
    primary: '#c084fc',
    secondary: '#9333ea',
    highlight: '#f3e8ff',
    dim: 'rgba(192, 132, 252, 0.10)',
    glow: 'rgba(192, 132, 252, 0.40)',
    subtleGlow: 'rgba(192, 132, 252, 0.16)',
    waveGradient: ['rgba(147, 51, 234, 0.05)', 'rgba(192, 132, 252, 0.18)', 'rgba(243, 232, 255, 0.28)', 'rgba(192, 132, 252, 0.18)', 'rgba(147, 51, 234, 0.05)'],
    auroraGradient: ['rgba(147, 51, 234, 0.25)', 'rgba(168, 85, 247, 0.35)', 'rgba(217, 70, 239, 0.35)', 'rgba(99, 102, 241, 0.30)'],
    neonStops: ['#9333ea', '#c084fc', '#f3e8ff', '#c084fc', '#9333ea'],
    svgStroke: '#c084fc',
    svgFill: 'rgba(192, 132, 252, 0.20)',
    particleColor: '#f3e8ff',
  },
  azure: {
    primary: '#38bdf8',
    secondary: '#0284c7',
    highlight: '#bae6fd',
    dim: 'rgba(56, 189, 248, 0.10)',
    glow: 'rgba(56, 189, 248, 0.40)',
    subtleGlow: 'rgba(56, 189, 248, 0.16)',
    waveGradient: ['rgba(2, 132, 199, 0.05)', 'rgba(56, 189, 248, 0.18)', 'rgba(186, 230, 253, 0.28)', 'rgba(56, 189, 248, 0.18)', 'rgba(2, 132, 199, 0.05)'],
    auroraGradient: ['rgba(2, 132, 199, 0.25)', 'rgba(59, 130, 246, 0.35)', 'rgba(96, 165, 250, 0.35)', 'rgba(14, 165, 233, 0.30)'],
    neonStops: ['#0284c7', '#38bdf8', '#bae6fd', '#38bdf8', '#0284c7'],
    svgStroke: '#38bdf8',
    svgFill: 'rgba(56, 189, 248, 0.20)',
    particleColor: '#bae6fd',
  },
  red: {
    primary: '#f87171',
    secondary: '#e33d3d',
    highlight: '#fecaca',
    dim: 'rgba(248, 113, 113, 0.10)',
    glow: 'rgba(248, 113, 113, 0.40)',
    subtleGlow: 'rgba(248, 113, 113, 0.16)',
    waveGradient: ['rgba(227, 61, 61, 0.05)', 'rgba(248, 113, 113, 0.18)', 'rgba(254, 202, 202, 0.28)', 'rgba(248, 113, 113, 0.18)', 'rgba(227, 61, 61, 0.05)'],
    auroraGradient: ['rgba(227, 61, 61, 0.25)', 'rgba(239, 68, 68, 0.35)', 'rgba(251, 113, 133, 0.35)', 'rgba(244, 63, 94, 0.30)'],
    neonStops: ['#e33d3d', '#f87171', '#fecaca', '#f87171', '#e33d3d'],
    svgStroke: '#f87171',
    svgFill: 'rgba(248, 113, 113, 0.20)',
    particleColor: '#fecaca',
  },
  emerald: {
    primary: '#34d399',
    secondary: '#059669',
    highlight: '#a7f3d0',
    dim: 'rgba(52, 211, 153, 0.10)',
    glow: 'rgba(52, 211, 153, 0.40)',
    subtleGlow: 'rgba(52, 211, 153, 0.16)',
    waveGradient: ['rgba(5, 150, 105, 0.05)', 'rgba(52, 211, 153, 0.18)', 'rgba(167, 243, 208, 0.28)', 'rgba(52, 211, 153, 0.18)', 'rgba(5, 150, 105, 0.05)'],
    auroraGradient: ['rgba(5, 150, 105, 0.25)', 'rgba(16, 185, 129, 0.35)', 'rgba(45, 212, 191, 0.35)', 'rgba(13, 148, 136, 0.30)'],
    neonStops: ['#059669', '#34d399', '#a7f3d0', '#34d399', '#059669'],
    svgStroke: '#34d399',
    svgFill: 'rgba(52, 211, 153, 0.20)',
    particleColor: '#a7f3d0',
  },
};

// Default signature palettes for standalone (non-adaptive) mode
export const DEFAULT_ANIMATION_PALETTES: Record<PanelAnimation, ThemeAnimationPalette> = {
  shimmer: THEME_ANIMATION_PALETTES.gray,
  pulse: THEME_ANIMATION_PALETTES.cyan,
  breath: THEME_ANIMATION_PALETTES.azure,
  wave: THEME_ANIMATION_PALETTES.azure,
  aurora: {
    ...THEME_ANIMATION_PALETTES.cyan,
    auroraGradient: ['rgba(16, 185, 129, 0.30)', 'rgba(6, 182, 212, 0.35)', 'rgba(168, 85, 247, 0.35)', 'rgba(236, 72, 153, 0.30)'],
  },
  neon: {
    ...THEME_ANIMATION_PALETTES.cyan,
    neonStops: ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#38bdf8'],
  },
  shapes_bubbles: {
    ...THEME_ANIMATION_PALETTES.azure,
    svgStroke: '#38bdf8',
    svgFill: 'rgba(56, 189, 248, 0.25)',
    particleColor: '#bae6fd',
  },
  shapes_ocean: {
    ...THEME_ANIMATION_PALETTES.cyan,
    svgStroke: '#06b6d4',
    svgFill: 'rgba(8, 145, 178, 0.30)',
    particleColor: '#67e8f9',
  },
  shapes_geometry: {
    ...THEME_ANIMATION_PALETTES.purple,
    svgStroke: '#a855f7',
    svgFill: 'rgba(168, 85, 247, 0.20)',
    particleColor: '#e9d5ff',
  },
  shapes_techno: {
    ...THEME_ANIMATION_PALETTES.lime,
    svgStroke: '#84cc16',
    svgFill: 'rgba(132, 204, 22, 0.25)',
    particleColor: '#bef264',
  },
  shapes_cyber: {
    ...THEME_ANIMATION_PALETTES.purple,
    svgStroke: '#ec4899',
    svgFill: 'rgba(236, 72, 153, 0.25)',
    particleColor: '#38bdf8',
  },
  shapes_nature: {
    ...THEME_ANIMATION_PALETTES.emerald,
    svgStroke: '#10b981',
    svgFill: 'rgba(16, 185, 129, 0.25)',
    particleColor: '#fbbf24',
  },
  shapes_space: {
    ...THEME_ANIMATION_PALETTES.purple,
    svgStroke: '#818cf8',
    svgFill: 'rgba(99, 102, 241, 0.25)',
    particleColor: '#ffffff',
  },
  none: THEME_ANIMATION_PALETTES.gray,
};

export interface PanelAnimationOption {
  id: PanelAnimation;
  labelKey: string;
  descKey: string;
  badge?: string;
  iconName: string;
}

export interface PanelAnimationCategoryGroup {
  id: string;
  titleKey: string;
  icon: string;
  items: PanelAnimationOption[];
}

export const PANEL_ANIMATION_GROUPS: PanelAnimationCategoryGroup[] = [
  {
    id: 'lightEffects',
    titleKey: 'settings.panelAnimationGroup.lightEffects',
    icon: 'sparkles',
    items: [
      {
        id: 'shimmer',
        labelKey: 'settings.panelAnimation.shimmer',
        descKey: 'settings.panelAnimation.shimmerDesc',
        iconName: 'shimmer',
      },
      {
        id: 'pulse',
        labelKey: 'settings.panelAnimation.pulse',
        descKey: 'settings.panelAnimation.pulseDesc',
        iconName: 'pulse',
      },
      {
        id: 'breath',
        labelKey: 'settings.panelAnimation.breath',
        descKey: 'settings.panelAnimation.breathDesc',
        iconName: 'breath',
      },
      {
        id: 'wave',
        labelKey: 'settings.panelAnimation.wave',
        descKey: 'settings.panelAnimation.waveDesc',
        iconName: 'wave',
      },
      {
        id: 'aurora',
        labelKey: 'settings.panelAnimation.aurora',
        descKey: 'settings.panelAnimation.auroraDesc',
        iconName: 'aurora',
      },
      {
        id: 'neon',
        labelKey: 'settings.panelAnimation.neon',
        descKey: 'settings.panelAnimation.neonDesc',
        iconName: 'neon',
      },
      {
        id: 'none',
        labelKey: 'settings.panelAnimation.none',
        descKey: 'settings.panelAnimation.noneDesc',
        iconName: 'none',
      },
    ],
  },
  {
    id: 'vectorShapes',
    titleKey: 'settings.panelAnimationGroup.vectorShapes',
    icon: 'shapes',
    items: [
      {
        id: 'shapes_bubbles',
        labelKey: 'settings.panelAnimation.shapes_bubbles',
        descKey: 'settings.panelAnimation.shapes_bubblesDesc',
        iconName: 'bubbles',
      },
      {
        id: 'shapes_ocean',
        labelKey: 'settings.panelAnimation.shapes_ocean',
        descKey: 'settings.panelAnimation.shapes_oceanDesc',
        iconName: 'ocean',
      },
      {
        id: 'shapes_geometry',
        labelKey: 'settings.panelAnimation.shapes_geometry',
        descKey: 'settings.panelAnimation.shapes_geometryDesc',
        iconName: 'geometry',
      },
      {
        id: 'shapes_techno',
        labelKey: 'settings.panelAnimation.shapes_techno',
        descKey: 'settings.panelAnimation.shapes_technoDesc',
        iconName: 'techno',
      },
      {
        id: 'shapes_cyber',
        labelKey: 'settings.panelAnimation.shapes_cyber',
        descKey: 'settings.panelAnimation.shapes_cyberDesc',
        iconName: 'cyber',
      },
      {
        id: 'shapes_nature',
        labelKey: 'settings.panelAnimation.shapes_nature',
        descKey: 'settings.panelAnimation.shapes_natureDesc',
        iconName: 'nature',
      },
      {
        id: 'shapes_space',
        labelKey: 'settings.panelAnimation.shapes_space',
        descKey: 'settings.panelAnimation.shapes_spaceDesc',
        iconName: 'space',
      },
    ],
  },
];

export const getEffectivePalette = (
  anim: PanelAnimation,
  theme: Theme,
  isAdaptive: boolean
): ThemeAnimationPalette => {
  if (isAdaptive) {
    return THEME_ANIMATION_PALETTES[theme] || THEME_ANIMATION_PALETTES.cyan;
  }
  return DEFAULT_ANIMATION_PALETTES[anim] || THEME_ANIMATION_PALETTES.cyan;
};
