import { svgToDataUri, THEME_ACCENT_COLORS } from '../types';
import { Theme } from '../../../types';

export interface SleekBlackPalette {
    id: string;
    strokeColor: string; // The crisp outer stroke (e.g. #ffffff or dynamic theme color)
    secondaryColor?: string; // Accent/secondary highlight
    glowColor?: string;
    fillColor?: string; // Deep obsidian black fill
}

/**
 * Builds the complete 15-cursor Sleek Black set with high-contrast outline stroke
 * Features the exact aerodynamic curved pointer shape matched from user's Pointer.svg
 * with 20px height, deep black fill, and crisp contour
 */
export function buildSleekBlackSvgSet(strokeColor: string, secondaryColor: string = strokeColor, isPureWhite: boolean = false) {
    const fill = '#09090b';
    const filterId = isPureWhite ? 'sb-white' : `sb-${strokeColor.replace(/[^a-zA-Z0-9]/g, '')}`;
    
    // Drop shadow filter for maximum clarity across all background luminosities
    const filterDef = `<defs>
        <filter id='${filterId}-sh' x='-30%' y='-30%' width='160%' height='160%'>
            <feDropShadow dx='0' dy='1' stdDeviation='1' flood-color='#000000' flood-opacity='0.95'/>
            ${!isPureWhite ? `<feDropShadow dx='0' dy='0' stdDeviation='1.5' flood-color='${strokeColor}' flood-opacity='0.5'/>` : ''}
        </filter>
    </defs>`;

    // 1. Default Arrow: Sleek delta arrowhead with smoothly rounded tail tips (Height = exactly 20px)
    const defaultSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'>
        ${filterDef}
        <path d='M 2.5 2 L 17.2 13.5 Q 18.6 14.6 17.0 14.8 L 9.2 13.8 Q 8.4 13.7 7.6 14.8 L 3.6 20.8 Q 2.5 22.2 2.5 20.8 Z' fill='${fill}' stroke='${strokeColor}' stroke-width='1.6' stroke-linejoin='round' stroke-linecap='round' filter='url(#${filterId}-sh)'/>
    </svg>`;

    // 2. Pointer: Sleek delta arrowhead with smoothly rounded tail tips and click indicator ring (Height = 20px)
    const pointerSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId}-sh)'>
            <path d='M 2.5 2 L 15.2 12.0 Q 16.6 13.0 15.0 13.2 L 8.4 12.4 Q 7.6 12.3 6.8 13.4 L 3.6 18.4 Q 2.5 19.6 2.5 18.4 Z' fill='${fill}' stroke='${strokeColor}' stroke-width='1.6' stroke-linejoin='round' stroke-linecap='round'/>
            <circle cx='18.5' cy='18.5' r='3.8' fill='${fill}' stroke='${strokeColor}' stroke-width='1.5'/>
            <circle cx='18.5' cy='18.5' r='1.5' fill='${strokeColor}'/>
        </g>
    </svg>`;

    // 3. Grab: Sleek 4-way aerodynamic pan compass (Height = 20px)
    const grabSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId}-sh)'>
            <path d='M 12 2 L 16 7 L 8 7 Z' fill='${fill}' stroke='${strokeColor}' stroke-width='1.5' stroke-linejoin='round' stroke-linecap='round'/>
            <path d='M 12 22 L 8 17 L 16 17 Z' fill='${fill}' stroke='${strokeColor}' stroke-width='1.5' stroke-linejoin='round' stroke-linecap='round'/>
            <path d='M 2 12 L 7 8 L 7 16 Z' fill='${fill}' stroke='${strokeColor}' stroke-width='1.5' stroke-linejoin='round' stroke-linecap='round'/>
            <path d='M 22 12 L 17 16 L 17 8 Z' fill='${fill}' stroke='${strokeColor}' stroke-width='1.5' stroke-linejoin='round' stroke-linecap='round'/>
            <rect x='9.5' y='9.5' width='5' height='5' rx='1.2' fill='${fill}' stroke='${strokeColor}' stroke-width='1.5' stroke-linejoin='round'/>
        </g>
    </svg>`;

    // 4. Grabbing: Compressed sleek 4-way pan compass
    const grabbingSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId}-sh)'>
            <path d='M 12 4.5 L 15.5 9 L 8.5 9 Z' fill='${fill}' stroke='${strokeColor}' stroke-width='1.5' stroke-linejoin='round' stroke-linecap='round'/>
            <path d='M 12 19.5 L 8.5 15 L 15.5 15 Z' fill='${fill}' stroke='${strokeColor}' stroke-width='1.5' stroke-linejoin='round' stroke-linecap='round'/>
            <path d='M 4.5 12 L 9 8.5 L 9 15.5 Z' fill='${fill}' stroke='${strokeColor}' stroke-width='1.5' stroke-linejoin='round' stroke-linecap='round'/>
            <path d='M 19.5 12 L 15 15.5 L 15 8.5 Z' fill='${fill}' stroke='${strokeColor}' stroke-width='1.5' stroke-linejoin='round' stroke-linecap='round'/>
            <rect x='10' y='10' width='4' height='4' rx='1' fill='${strokeColor}' stroke='${fill}' stroke-width='1'/>
        </g>
    </svg>`;

    // 5. Text / I-Beam: Sleek black beam with high-contrast contour (Height = 20px)
    const textSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId}-sh)'>
            <path d='M 7 3 L 17 3' stroke='${strokeColor}' stroke-width='2.2' stroke-linecap='round'/>
            <path d='M 7 21 L 17 21' stroke='${strokeColor}' stroke-width='2.2' stroke-linecap='round'/>
            <line x1='12' y1='3' x2='12' y2='21' stroke='${strokeColor}' stroke-width='2.6' stroke-linecap='round'/>
            <line x1='12' y1='5' x2='12' y2='19' stroke='${fill}' stroke-width='1.2' stroke-linecap='round'/>
        </g>
    </svg>`;

    // 6. Crosshair: Sleek precision reticle with central dot
    const crosshairSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId}-sh)'>
            <circle cx='12' cy='12' r='3.2' fill='${fill}' stroke='${strokeColor}' stroke-width='1.6'/>
            <circle cx='12' cy='12' r='1' fill='${strokeColor}'/>
            <line x1='12' y1='2' x2='12' y2='7.5' stroke='${strokeColor}' stroke-width='1.8' stroke-linecap='round'/>
            <line x1='12' y1='16.5' x2='12' y2='22' stroke='${strokeColor}' stroke-width='1.8' stroke-linecap='round'/>
            <line x1='2' y1='12' x2='7.5' y2='12' stroke='${strokeColor}' stroke-width='1.8' stroke-linecap='round'/>
            <line x1='16.5' y1='12' x2='22' y2='12' stroke='${strokeColor}' stroke-width='1.8' stroke-linecap='round'/>
        </g>
    </svg>`;

    // 7. EW Resize: Sleek bidirectional horizontal aerodynamic arrows
    const ewResizeSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'>
        ${filterDef}
        <path d='M 2.5 12 L 7 8 L 7 10.4 L 17 10.4 L 17 8 L 21.5 12 L 17 16 L 17 13.6 L 7 13.6 L 7 16 Z' fill='${fill}' stroke='${strokeColor}' stroke-width='1.5' stroke-linejoin='round' filter='url(#${filterId}-sh)'/>
    </svg>`;

    // 8. NS Resize: Sleek bidirectional vertical aerodynamic arrows
    const nsResizeSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'>
        ${filterDef}
        <path d='M 12 2.5 L 8 7 L 10.4 7 L 10.4 17 L 8 17 L 12 21.5 L 16 17 L 13.6 17 L 13.6 7 L 16 7 Z' fill='${fill}' stroke='${strokeColor}' stroke-width='1.5' stroke-linejoin='round' filter='url(#${filterId}-sh)'/>
    </svg>`;

    // 9. NWSE Resize: Sleek diagonal NW-SE aerodynamic arrows
    const nwseResizeSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'>
        ${filterDef}
        <path d='M 3.5 3.5 L 10 3.5 L 7.8 5.8 L 16.2 14.2 L 18.5 11.8 L 18.5 18.5 L 11.8 18.5 L 14.2 16.2 L 5.8 7.8 L 3.5 10 Z' fill='${fill}' stroke='${strokeColor}' stroke-width='1.5' stroke-linejoin='round' filter='url(#${filterId}-sh)'/>
    </svg>`;

    // 10. NESW Resize: Sleek diagonal NE-SW aerodynamic arrows
    const neswResizeSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'>
        ${filterDef}
        <path d='M 18.5 3.5 L 18.5 10 L 16.2 7.8 L 7.8 16.2 L 10 18.5 L 3.5 18.5 L 3.5 11.8 L 5.8 14.2 L 14.2 5.8 L 11.8 3.5 Z' fill='${fill}' stroke='${strokeColor}' stroke-width='1.5' stroke-linejoin='round' filter='url(#${filterId}-sh)'/>
    </svg>`;

    // 11. Move: Sleek 4-way translation cross
    const moveSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId}-sh)'>
            <path d='M 12 2 L 15 5 L 13.2 5 L 13.2 10.8 L 19 10.8 L 19 9 L 22 12 L 19 15 L 19 13.2 L 13.2 13.2 L 13.2 19 L 15 19 L 12 22 L 9 19 L 10.8 19 L 10.8 13.2 L 5 13.2 L 5 15 L 2 12 L 5 9 L 5 10.8 L 10.8 10.8 L 10.8 5 L 9 5 Z' fill='${fill}' stroke='${strokeColor}' stroke-width='1.5' stroke-linejoin='round'/>
            <circle cx='12' cy='12' r='1.4' fill='${strokeColor}'/>
        </g>
    </svg>`;

    // 12. Cutter: Sleek precision black scissors
    const cutterSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId}-sh)'>
            <circle cx='6' cy='18' r='3.2' fill='${fill}' stroke='${strokeColor}' stroke-width='1.5'/>
            <circle cx='18' cy='18' r='3.2' fill='${fill}' stroke='${strokeColor}' stroke-width='1.5'/>
            <line x1='8' y1='15' x2='16' y2='5' stroke='#ef4444' stroke-width='2' stroke-linecap='round'/>
            <line x1='16' y1='15' x2='8' y2='5' stroke='${strokeColor}' stroke-width='2' stroke-linecap='round'/>
            <circle cx='12' cy='10' r='1.4' fill='${fill}' stroke='${strokeColor}' stroke-width='1'/>
        </g>
    </svg>`;

    // 13. Reroute: Sleek black node gateway with socket pins and chevrons
    const rerouteSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId}-sh)'>
            <line x1='1.5' y1='12' x2='4' y2='12' stroke='${strokeColor}' stroke-width='1.8' stroke-linecap='round'/>
            <line x1='20' y1='12' x2='22.5' y2='12' stroke='${strokeColor}' stroke-width='1.8' stroke-linecap='round'/>
            <rect x='5.5' y='7' width='13' height='10' rx='3' fill='${fill}' stroke='${strokeColor}' stroke-width='1.6'/>
            <circle cx='4.5' cy='12' r='2.2' fill='${fill}' stroke='${strokeColor}' stroke-width='1.4'/>
            <circle cx='4.5' cy='12' r='0.9' fill='${strokeColor}'/>
            <circle cx='19.5' cy='12' r='2.2' fill='${fill}' stroke='${strokeColor}' stroke-width='1.4'/>
            <circle cx='19.5' cy='12' r='0.9' fill='${strokeColor}'/>
            <path d='M 10 9.5 L 12.5 12 L 10 14.5 M 13.5 9.5 L 16 12 L 13.5 14.5' stroke='${strokeColor}' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round' fill='none'/>
        </g>
    </svg>`;

    // 14. Not Allowed: Sleek black forbidden indicator
    const notAllowedSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId}-sh)'>
            <circle cx='12' cy='12' r='8' fill='${fill}' stroke='#ef4444' stroke-width='2'/>
            <line x1='6.5' y1='6.5' x2='17.5' y2='17.5' stroke='#ef4444' stroke-width='2' stroke-linecap='round'/>
        </g>
    </svg>`;

    // 15. Wait: Sleek black orbital spinner
    const waitSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId}-sh)'>
            <circle cx='12' cy='12' r='7.5' stroke='${strokeColor}' stroke-width='1.8' stroke-dasharray='10 5' fill='none'/>
            <circle cx='12' cy='4.5' r='2' fill='${fill}' stroke='${strokeColor}' stroke-width='1.2'/>
            <circle cx='12' cy='12' r='2.2' fill='${fill}' stroke='${strokeColor}' stroke-width='1'/>
        </g>
    </svg>`;

    return {
        cursors: {
            default: `${svgToDataUri(defaultSvg)} 2 2, default`,
            pointer: `${svgToDataUri(pointerSvg)} 2 2, pointer`,
            grab: `${svgToDataUri(grabSvg)} 12 12, grab`,
            grabbing: `${svgToDataUri(grabbingSvg)} 12 12, grabbing`,
            text: `${svgToDataUri(textSvg)} 12 12, text`,
            crosshair: `${svgToDataUri(crosshairSvg)} 12 12, crosshair`,
            ewResize: `${svgToDataUri(ewResizeSvg)} 12 12, ew-resize`,
            nsResize: `${svgToDataUri(nsResizeSvg)} 12 12, ns-resize`,
            nwseResize: `${svgToDataUri(nwseResizeSvg)} 12 12, nwse-resize`,
            neswResize: `${svgToDataUri(neswResizeSvg)} 12 12, nesw-resize`,
            move: `${svgToDataUri(moveSvg)} 12 12, move`,
            cutter: `${svgToDataUri(cutterSvg)} 12 10, crosshair`,
            reroute: `${svgToDataUri(rerouteSvg)} 12 12, crosshair`,
            notAllowed: `${svgToDataUri(notAllowedSvg)} 12 12, not-allowed`,
            wait: `${svgToDataUri(waitSvg)} 12 12, wait`
        },
        rawSvgs: {
            default: defaultSvg,
            pointer: pointerSvg,
            grab: grabSvg,
            grabbing: grabbingSvg,
            text: textSvg,
            crosshair: crosshairSvg,
            cutter: cutterSvg,
            reroute: rerouteSvg
        }
    };
}

/**
 * Helper to get adaptive Sleek Black definition for a specific theme
 */
export function getSleekBlackAdaptiveDefinition(theme: Theme = 'cyan') {
    const accent = THEME_ACCENT_COLORS[theme] || THEME_ACCENT_COLORS.cyan;
    return {
        id: 'sleek_black_adaptive' as const,
        nameKey: 'settings.cursorSkin.sleekBlackAdaptive',
        descKey: 'settings.cursorSkin.sleekBlackAdaptiveDesc',
        accentColor: accent.primary,
        glowColor: accent.glow,
        ...buildSleekBlackSvgSet(accent.primary, accent.secondary, false)
    };
}
