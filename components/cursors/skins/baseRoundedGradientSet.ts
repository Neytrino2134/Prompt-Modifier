import { svgToDataUri } from '../types';

export interface GradientPalette {
    id: string;
    stop1: string; // Top-left start color (rich / vibrant tone 1)
    stop2?: string; // Optional midpoint transition color
    stop3: string; // Bottom-right end color (rich / vibrant tone 2)
    accentColor: string;
    glowColor?: string;
}

/**
 * Builds the complete 15-cursor Rounded Gradient set.
 * Ultra-clean flat gradient style with pure smooth curves,
 * NO embossing, NO shadows/filters, and NO outline strokes.
 */
export function buildRoundedGradientSvgSet(palette: GradientPalette) {
    const { id, stop1, stop2, stop3 } = palette;
    const gradId = `rg-grad-${id}`;

    const stops = stop2
        ? `<stop offset='0%' stop-color='${stop1}'/>
           <stop offset='50%' stop-color='${stop2}'/>
           <stop offset='100%' stop-color='${stop3}'/>`
        : `<stop offset='0%' stop-color='${stop1}'/>
           <stop offset='100%' stop-color='${stop3}'/>`;

    const defs = `<defs>
        <linearGradient id='${gradId}' x1='10%' y1='5%' x2='90%' y2='95%'>
            ${stops}
        </linearGradient>
    </defs>`;

    // 1. Default Arrow (Clean Rounded Flat Gradient Arrow)
    const defaultSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${defs}
        <path d='M 5.8 3.5 C 4.2 2.2, 2.4 4.0, 3.6 5.8 L 9.5 22.8 C 10.4 24.8, 13.0 25.0, 14.1 23.1 L 16.8 17.6 C 17.2 16.8, 17.9 16.1, 18.7 15.7 L 24.3 12.9 C 26.2 11.9, 26.0 9.2, 23.9 8.4 L 6.8 2.8 C 6.4 2.7, 6.1 3.0, 5.8 3.5 Z' fill='url(#${gradId})'/>
    </svg>`;

    // 2. Pointer (Rounded Action Pointer with Flat Target Ring)
    const pointerSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${defs}
        <path d='M 4.8 2.5 C 3.2 1.2, 1.4 3.0, 2.6 4.8 L 8.5 21.8 C 9.4 23.8, 12.0 24.0, 13.1 22.1 L 15.8 16.6 C 16.2 15.8, 16.9 15.1, 17.7 14.7 L 23.3 11.9 C 25.2 10.9, 25.0 8.2, 22.9 7.4 L 5.8 1.8 C 5.4 1.7, 5.1 2.0, 4.8 2.5 Z' fill='url(#${gradId})'/>
        <circle cx='21' cy='21' r='4' fill='url(#${gradId})'/>
    </svg>`;

    // 3. Grab (4-Way Rounded Arrows Pan Compass - Clean Flat Gradient, No Hand)
    const grabSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${defs}
        <!-- North Arrow -->
        <path d='M 14 2.2 C 14.6 2.2, 15.2 2.7, 15.6 3.3 L 19.0 8.2 C 19.6 9.0, 19.0 10.0, 18.0 10.0 L 10.0 10.0 C 9.0 10.0, 8.4 9.0, 9.0 8.2 L 12.4 3.3 C 12.8 2.7, 13.4 2.2, 14 2.2 Z' fill='url(#${gradId})'/>
        <!-- South Arrow -->
        <path d='M 14 25.8 C 13.4 25.8, 12.8 25.3, 12.4 24.7 L 9.0 19.8 C 8.4 19.0, 9.0 18.0, 10.0 18.0 L 18.0 18.0 C 19.0 18.0, 19.6 19.0, 19.0 19.8 L 15.6 24.7 C 15.2 25.3, 14.6 25.8, 14 25.8 Z' fill='url(#${gradId})'/>
        <!-- West Arrow -->
        <path d='M 2.2 14 C 2.2 13.4, 2.7 12.8, 3.3 12.4 L 8.2 9.0 C 9.0 8.4, 10.0 9.0, 10.0 10.0 L 10.0 18.0 C 10.0 19.0, 9.0 19.6, 8.2 19.0 L 3.3 15.6 C 2.7 15.2, 2.2 14.6, 2.2 14 Z' fill='url(#${gradId})'/>
        <!-- East Arrow -->
        <path d='M 25.8 14 C 25.8 14.6, 25.3 15.2, 24.7 15.6 L 19.8 19.0 C 19.0 19.6, 18.0 19.0, 18.0 18.0 L 18.0 10.0 C 18.0 9.0, 19.0 8.4, 19.8 9.0 L 24.7 12.4 C 25.3 12.8, 25.8 13.4, 25.8 14 Z' fill='url(#${gradId})'/>
        <!-- Center Rounded Hub -->
        <rect x='11' y='11' width='6' height='6' rx='2.2' fill='url(#${gradId})'/>
    </svg>`;

    // 4. Grabbing (Compressed 4-Way Rounded Arrows Active Pan Compass)
    const grabbingSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${defs}
        <!-- North Arrow Compressed -->
        <path d='M 14 5.2 C 14.5 5.2, 15.0 5.6, 15.4 6.2 L 18.2 10.5 C 18.7 11.2, 18.2 12.0, 17.4 12.0 L 10.6 12.0 C 9.8 12.0, 9.3 11.2, 9.8 10.5 L 12.6 6.2 C 13.0 5.6, 13.5 5.2, 14 5.2 Z' fill='url(#${gradId})'/>
        <!-- South Arrow Compressed -->
        <path d='M 14 22.8 C 13.5 22.8, 13.0 22.4, 12.6 21.8 L 9.8 17.5 C 9.3 16.8, 9.8 16.0, 10.6 16.0 L 17.4 16.0 C 18.2 16.0, 18.7 16.8, 18.2 17.5 L 15.4 21.8 C 15.0 22.4, 14.5 22.8, 14 22.8 Z' fill='url(#${gradId})'/>
        <!-- West Arrow Compressed -->
        <path d='M 5.2 14 C 5.2 13.5, 5.6 13.0, 6.2 12.6 L 10.5 9.8 C 11.2 9.3, 12.0 9.8, 12.0 10.6 L 12.0 17.4 C 12.0 18.2, 11.2 18.7, 10.5 18.2 L 6.2 15.4 C 5.6 15.0, 5.2 14.5, 5.2 14 Z' fill='url(#${gradId})'/>
        <!-- East Arrow Compressed -->
        <path d='M 22.8 14 C 22.8 14.5, 22.4 15.0, 21.8 15.4 L 17.5 18.2 C 16.8 18.7, 16.0 18.2, 16.0 17.4 L 16.0 10.6 C 16.0 9.8, 16.8 9.3, 17.5 9.8 L 21.8 12.6 C 22.4 13.0, 22.8 13.5, 22.8 14 Z' fill='url(#${gradId})'/>
        <!-- Center Hub -->
        <rect x='11.5' y='11.5' width='5' height='5' rx='1.8' fill='url(#${gradId})'/>
    </svg>`;

    // 5. Text / I-Beam (Clean Rounded Capsule Beam)
    const textSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${defs}
        <rect x='7.5' y='3' width='13' height='3' rx='1.5' fill='url(#${gradId})'/>
        <rect x='7.5' y='22' width='13' height='3' rx='1.5' fill='url(#${gradId})'/>
        <rect x='12.5' y='4' width='3' height='20' rx='1.5' fill='url(#${gradId})'/>
    </svg>`;

    // 6. Crosshair (Clean Rounded Precision Reticle)
    const crosshairSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${defs}
        <circle cx='14' cy='14' r='5' fill='none' stroke='url(#${gradId})' stroke-width='2.4'/>
        <circle cx='14' cy='14' r='1.6' fill='url(#${gradId})'/>
        <rect x='12.75' y='2' width='2.5' height='5.5' rx='1.25' fill='url(#${gradId})'/>
        <rect x='12.75' y='20.5' width='2.5' height='5.5' rx='1.25' fill='url(#${gradId})'/>
        <rect x='2' y='12.75' width='5.5' height='2.5' rx='1.25' fill='url(#${gradId})'/>
        <rect x='20.5' y='12.75' width='5.5' height='2.5' rx='1.25' fill='url(#${gradId})'/>
    </svg>`;

    // 7. EW Resize (Clean Rounded Horizontal Arrow)
    const ewResizeSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${defs}
        <path d='M 3.2 14 C 2.8 13.5, 3.2 12.8, 3.9 12.3 L 8.5 8.7 C 9.3 8.1, 10.3 8.7, 10.3 9.7 L 10.3 12 L 17.7 12 L 17.7 9.7 C 17.7 8.7, 18.7 8.1, 19.5 8.7 L 24.1 12.3 C 24.8 12.8, 25.2 13.5, 24.8 14 C 25.2 14.5, 24.8 15.2, 24.1 15.7 L 19.5 19.3 C 18.7 19.9, 17.7 19.3, 17.7 18.3 L 17.7 16 L 10.3 16 L 10.3 18.3 C 10.3 19.3, 9.3 19.9, 8.5 19.3 L 3.9 15.7 C 3.2 15.2, 2.8 14.5, 3.2 14 Z' fill='url(#${gradId})'/>
    </svg>`;

    // 8. NS Resize (Clean Rounded Vertical Arrow)
    const nsResizeSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${defs}
        <path d='M 14 3.2 C 13.5 2.8, 12.8 3.2, 12.3 3.9 L 8.7 8.5 C 8.1 9.3, 8.7 10.3, 9.7 10.3 L 12 10.3 L 12 17.7 L 9.7 17.7 C 8.7 17.7, 8.1 18.7, 8.7 19.5 L 12.3 24.1 C 12.8 24.8, 13.5 25.2, 14 24.8 C 14.5 25.2, 15.2 24.8, 15.7 24.1 L 19.3 19.5 C 19.9 18.7, 19.3 17.7, 18.3 17.7 L 16 17.7 L 16 10.3 L 18.3 10.3 C 19.3 10.3, 19.9 9.3, 19.3 8.5 L 15.7 3.9 C 15.2 3.2, 14.5 2.8, 14 3.2 Z' fill='url(#${gradId})'/>
    </svg>`;

    // 9. NWSE Resize (Clean Rounded Diagonal Arrow)
    const nwseResizeSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${defs}
        <path d='M 4 4 L 12.5 4 C 13.4 4, 13.8 5.1, 13.2 5.7 L 10.8 8.1 L 19.9 17.2 L 22.3 14.8 C 22.9 14.2, 24 14.6, 24 15.5 L 24 24 L 15.5 24 C 14.6 24, 14.2 22.9, 14.8 22.3 L 17.2 19.9 L 8.1 10.8 L 5.7 13.2 C 5.1 13.8, 4 13.4, 4 12.5 Z' fill='url(#${gradId})'/>
    </svg>`;

    // 10. NESW Resize (Clean Rounded Diagonal Arrow)
    const neswResizeSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${defs}
        <path d='M 24 4 L 24 12.5 C 24 13.4, 22.9 13.8, 22.3 13.2 L 19.9 10.8 L 10.8 19.9 L 13.2 22.3 C 13.8 22.9, 13.4 24, 12.5 24 L 4 24 L 4 15.5 C 4 14.6, 5.1 14.2, 5.7 14.8 L 8.1 17.2 L 17.2 8.1 L 14.8 5.7 C 14.2 5.1, 14.6 4, 15.5 4 Z' fill='url(#${gradId})'/>
    </svg>`;

    // 11. Move (4-Way Rounded Move Compass)
    const moveSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${defs}
        <path d='M 14 2 L 17.5 5.8 C 18.0 6.4, 17.5 7.2, 16.7 7.2 L 15.5 7.2 L 15.5 12.5 L 20.8 12.5 L 20.8 11.3 C 20.8 10.5, 21.6 10.0, 22.2 10.5 L 26 14 L 22.2 17.5 C 21.6 18.0, 20.8 17.5, 20.8 16.7 L 20.8 15.5 L 15.5 15.5 L 15.5 20.8 L 16.7 20.8 C 17.5 20.8, 18.0 21.6, 17.5 22.2 L 14 26 L 10.5 22.2 C 10.0 21.6, 10.5 20.8, 11.3 20.8 L 12.5 20.8 L 12.5 15.5 L 7.2 15.5 L 7.2 16.7 C 7.2 17.5, 6.4 18.0, 5.8 17.5 L 2 14 L 5.8 10.5 C 6.4 10.0, 7.2 10.5, 7.2 11.3 L 7.2 12.5 L 12.5 12.5 L 12.5 7.2 L 11.3 7.2 C 10.5 7.2, 10.0 6.4, 10.5 5.8 Z' fill='url(#${gradId})'/>
        <circle cx='14' cy='14' r='2' fill='url(#${gradId})'/>
    </svg>`;

    // 12. Cutter (Clean Rounded Scissors Tool)
    const cutterSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${defs}
        <circle cx='7.5' cy='20.5' r='4' fill='none' stroke='url(#${gradId})' stroke-width='2.2'/>
        <circle cx='20.5' cy='20.5' r='4' fill='none' stroke='url(#${gradId})' stroke-width='2.2'/>
        <path d='M 9.5 17.5 L 18.5 4.5 C 19.0 3.8, 20.0 4.2, 19.8 5.0 L 12 19.5 Z' fill='url(#${gradId})'/>
        <path d='M 18.5 17.5 L 9.5 4.5 C 9.0 3.8, 8.0 4.2, 8.2 5.0 L 16 19.5 Z' fill='url(#${gradId})'/>
        <circle cx='14' cy='12' r='2' fill='url(#${gradId})'/>
    </svg>`;

    // 13. Reroute (Clean Rounded Reroute Node Capsule with Flow Chevrons)
    const rerouteSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${defs}
        <!-- Left & Right Lead Wire indicators -->
        <line x1='1.5' y1='14' x2='4' y2='14' stroke='url(#${gradId})' stroke-width='1.8' stroke-linecap='round'/>
        <line x1='24' y1='14' x2='26.5' y2='14' stroke='url(#${gradId})' stroke-width='1.8' stroke-linecap='round'/>
        <!-- Main Reroute Node Capsule Body -->
        <rect x='6.5' y='8.5' width='15' height='11' rx='3.5' fill='url(#${gradId})'/>
        <!-- Left Socket Pin -->
        <circle cx='5' cy='14' r='2.8' fill='url(#${gradId})'/>
        <circle cx='5' cy='14' r='1.2' fill='#090d16'/>
        <!-- Right Socket Pin -->
        <circle cx='23' cy='14' r='2.8' fill='url(#${gradId})'/>
        <circle cx='23' cy='14' r='1.2' fill='#090d16'/>
        <!-- Center Double Flow Chevrons (>> Cutout) -->
        <path d='M 11.5 11.5 L 14 14 L 11.5 16.5 M 15 11.5 L 17.5 14 L 15 16.5' stroke='#090d16' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round' fill='none'/>
    </svg>`;

    // 14. Not Allowed (Clean Rounded Forbidden Ring)
    const notAllowedSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${defs}
        <circle cx='14' cy='14' r='9.5' fill='none' stroke='url(#${gradId})' stroke-width='2.8'/>
        <line x1='7.3' y1='7.3' x2='20.7' y2='20.7' stroke='url(#${gradId})' stroke-width='2.8' stroke-linecap='round'/>
    </svg>`;

    // 15. Wait (Clean Rounded Segmented Orbital Spinner)
    const waitSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${defs}
        <circle cx='14' cy='14' r='9' stroke='url(#${gradId})' stroke-width='2.6' stroke-dasharray='14 8' stroke-linecap='round' fill='none'/>
        <circle cx='14' cy='5' r='2.5' fill='url(#${gradId})'/>
        <circle cx='14' cy='14' r='3' fill='url(#${gradId})'/>
    </svg>`;

    return {
        cursors: {
            default: `${svgToDataUri(defaultSvg)} 4 3, default`,
            pointer: `${svgToDataUri(pointerSvg)} 4 2, pointer`,
            grab: `${svgToDataUri(grabSvg)} 14 14, grab`,
            grabbing: `${svgToDataUri(grabbingSvg)} 14 14, grabbing`,
            text: `${svgToDataUri(textSvg)} 14 14, text`,
            crosshair: `${svgToDataUri(crosshairSvg)} 14 14, crosshair`,
            ewResize: `${svgToDataUri(ewResizeSvg)} 14 14, ew-resize`,
            nsResize: `${svgToDataUri(nsResizeSvg)} 14 14, ns-resize`,
            nwseResize: `${svgToDataUri(nwseResizeSvg)} 14 14, nwse-resize`,
            neswResize: `${svgToDataUri(neswResizeSvg)} 14 14, nesw-resize`,
            move: `${svgToDataUri(moveSvg)} 14 14, move`,
            cutter: `${svgToDataUri(cutterSvg)} 14 12, crosshair`,
            reroute: `${svgToDataUri(rerouteSvg)} 14 14, crosshair`,
            notAllowed: `${svgToDataUri(notAllowedSvg)} 14 14, not-allowed`,
            wait: `${svgToDataUri(waitSvg)} 14 14, wait`
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
