import { svgToDataUri } from '../types';

/**
 * Builds the complete 15-cursor modern flat set with crisp dynamic theme stroke
 * Supports both Modern Flat White (clean white fill) and Modern Flat Dark (dark slate-blue UI fill)
 */
export function buildModernFlatSvgSet(primary: string, secondary: string, isDark: boolean = false) {
    const fill = isDark ? '#0f172a' : '#ffffff';
    const filterId = isDark ? 'mfd' : 'mf';
    const filterDef = isDark
        ? `<defs>
            <filter id='${filterId}-sh' x='-30%' y='-30%' width='160%' height='160%'>
                <feDropShadow dx='0' dy='1' stdDeviation='1.2' flood-color='#000000' flood-opacity='0.9'/>
                <feDropShadow dx='0' dy='0' stdDeviation='1.5' flood-color='${primary}' flood-opacity='0.55'/>
            </filter>
        </defs>`
        : `<defs>
            <filter id='${filterId}-sh' x='-30%' y='-30%' width='160%' height='160%'>
                <feDropShadow dx='0' dy='1' stdDeviation='1' flood-color='#000000' flood-opacity='0.65'/>
            </filter>
        </defs>`;

    // 1. Default Arrow (User's Modern Flat Path with Dynamic Theme Outline)
    const defaultSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none'>
        ${filterDef}
        <path d='M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z' fill='${fill}' stroke='${primary}' stroke-width='1.8' stroke-linejoin='round' filter='url(#${filterId}-sh)'/>
    </svg>`;

    // 2. Pointer (User's Hand-link Path with Dynamic Theme Outline - compact ~25% scaled)
    const pointerSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='21' height='21' viewBox='0 0 24 24' fill='none'>
        ${filterDef}
        <path d='M10 11V8.99c0-.88.59-1.64 1.44-1.86h.05A1.99 1.99 0 0 1 14 9.05V12v-2c0-.88.6-1.65 1.46-1.87h.05A1.98 1.98 0 0 1 18 10.06V13v-1.94a2 2 0 0 1 1.51-1.94h0A2 2 0 0 1 22 11.06V14c0 .6-.08 1.27-.21 1.97a7.96 7.96 0 0 1-7.55 6.48 54.98 54.98 0 0 1-4.48 0 7.96 7.96 0 0 1-7.55-6.48C2.08 15.27 2 14.59 2 14v-1.49c0-1.11.9-2.01 2.01-2.01h0a2 2 0 0 1 2.01 2.03l-.01.97v-10c0-1.1.9-2 2-2h0a2 2 0 0 1 2 2V11Z' fill='${fill}' stroke='${primary}' stroke-width='1.8' stroke-linejoin='round' filter='url(#${filterId}-sh)'/>
    </svg>`;

    // 3. Grab (4-Way Compass Triangles with Center Rounded Square in Theme Color)
    const grabSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId}-sh)'>
            <path d='M14 2.5 L18.8 8.5 L9.2 8.5 Z' fill='${fill}' stroke='${primary}' stroke-width='1.8' stroke-linejoin='round' stroke-linecap='round'/>
            <path d='M14 25.5 L9.2 19.5 L18.8 19.5 Z' fill='${fill}' stroke='${primary}' stroke-width='1.8' stroke-linejoin='round' stroke-linecap='round'/>
            <path d='M2.5 14 L8.5 9.2 L8.5 18.8 Z' fill='${fill}' stroke='${primary}' stroke-width='1.8' stroke-linejoin='round' stroke-linecap='round'/>
            <path d='M25.5 14 L19.5 18.8 L19.5 9.2 Z' fill='${fill}' stroke='${primary}' stroke-width='1.8' stroke-linejoin='round' stroke-linecap='round'/>
            <rect x='11' y='11' width='6' height='6' rx='1.6' fill='${fill}' stroke='${primary}' stroke-width='1.8' stroke-linejoin='round'/>
        </g>
    </svg>`;

    // 4. Grabbing (Compressed 4-Way Triangles & Smaller Center Square in Theme Color)
    const grabbingSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId}-sh)'>
            <path d='M14 5.5 L18.2 11 L9.8 11 Z' fill='${fill}' stroke='${primary}' stroke-width='1.8' stroke-linejoin='round' stroke-linecap='round'/>
            <path d='M14 22.5 L9.8 17 L18.2 17 Z' fill='${fill}' stroke='${primary}' stroke-width='1.8' stroke-linejoin='round' stroke-linecap='round'/>
            <path d='M5.5 14 L11 9.8 L11 18.2 Z' fill='${fill}' stroke='${primary}' stroke-width='1.8' stroke-linejoin='round' stroke-linecap='round'/>
            <path d='M22.5 14 L17 18.2 L17 9.8 Z' fill='${fill}' stroke='${primary}' stroke-width='1.8' stroke-linejoin='round' stroke-linecap='round'/>
            <rect x='11.8' y='11.8' width='4.4' height='4.4' rx='1.2' fill='${fill}' stroke='${primary}' stroke-width='1.8' stroke-linejoin='round'/>
        </g>
    </svg>`;

    // 5. Text / I-Beam
    const textSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId}-sh)'>
            <path d='M7 4 L17 4' stroke='${primary}' stroke-width='2.2' stroke-linecap='round'/>
            <path d='M7 20 L17 20' stroke='${primary}' stroke-width='2.2' stroke-linecap='round'/>
            <line x1='12' y1='4' x2='12' y2='20' stroke='${primary}' stroke-width='2.4' stroke-linecap='round'/>
            <line x1='12' y1='6' x2='12' y2='18' stroke='${fill}' stroke-width='1' stroke-linecap='round'/>
        </g>
    </svg>`;

    // 6. Crosshair
    const crosshairSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId}-sh)'>
            <circle cx='12' cy='12' r='3.2' fill='${fill}' stroke='${primary}' stroke-width='1.6'/>
            <circle cx='12' cy='12' r='1' fill='${primary}'/>
            <line x1='12' y1='2' x2='12' y2='8' stroke='${primary}' stroke-width='2' stroke-linecap='round'/>
            <line x1='12' y1='16' x2='12' y2='22' stroke='${primary}' stroke-width='2' stroke-linecap='round'/>
            <line x1='2' y1='12' x2='8' y2='12' stroke='${primary}' stroke-width='2' stroke-linecap='round'/>
            <line x1='16' y1='12' x2='22' y2='12' stroke='${primary}' stroke-width='2' stroke-linecap='round'/>
        </g>
    </svg>`;

    // 7. EW Resize
    const ewResizeSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none'>
        ${filterDef}
        <path d='M3 12 L8 7.5 L8 10.2 L16 10.2 L16 7.5 L21 12 L16 16.5 L16 13.8 L8 13.8 L8 16.5 Z' fill='${fill}' stroke='${primary}' stroke-width='1.6' stroke-linejoin='round' filter='url(#${filterId}-sh)'/>
    </svg>`;

    // 8. NS Resize
    const nsResizeSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none'>
        ${filterDef}
        <path d='M12 3 L7.5 8 L10.2 8 L10.2 16 L7.5 16 L12 21 L16.5 16 L13.8 16 L13.8 8 L16.5 8 Z' fill='${fill}' stroke='${primary}' stroke-width='1.6' stroke-linejoin='round' filter='url(#${filterId}-sh)'/>
    </svg>`;

    // 9. NWSE Resize
    const nwseResizeSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none'>
        ${filterDef}
        <path d='M4 4 L11 4 L8.5 6.5 L17.5 15.5 L20 13 L20 20 L13 20 L15.5 17.5 L6.5 8.5 L4 11 Z' fill='${fill}' stroke='${primary}' stroke-width='1.6' stroke-linejoin='round' filter='url(#${filterId}-sh)'/>
    </svg>`;

    // 10. NESW Resize
    const neswResizeSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none'>
        ${filterDef}
        <path d='M20 4 L20 11 L17.5 8.5 L8.5 17.5 L11 20 L4 20 L4 13 L6.5 15.5 L15.5 6.5 L13 4 Z' fill='${fill}' stroke='${primary}' stroke-width='1.6' stroke-linejoin='round' filter='url(#${filterId}-sh)'/>
    </svg>`;

    // 11. Move
    const moveSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId}-sh)'>
            <path d='M12 2 L15.5 5.5 L13.5 5.5 L13.5 10.5 L18.5 10.5 L18.5 8.5 L22 12 L18.5 15.5 L18.5 13.5 L13.5 13.5 L13.5 18.5 L15.5 18.5 L12 22 L8.5 18.5 L10.5 18.5 L10.5 13.5 L5.5 13.5 L5.5 15.5 L2 12 L5.5 8.5 L5.5 10.5 L10.5 10.5 L10.5 5.5 L8.5 5.5 Z' fill='${fill}' stroke='${primary}' stroke-width='1.6' stroke-linejoin='round'/>
            <circle cx='12' cy='12' r='1.5' fill='${primary}'/>
        </g>
    </svg>`;

    // 12. Cutter (Scissors)
    const cutterSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId}-sh)'>
            <circle cx='6' cy='18' r='3.5' fill='${fill}' stroke='${primary}' stroke-width='1.6'/>
            <circle cx='18' cy='18' r='3.5' fill='${fill}' stroke='${primary}' stroke-width='1.6'/>
            <line x1='8' y1='15' x2='16' y2='5' stroke='#ef4444' stroke-width='2' stroke-linecap='round'/>
            <line x1='16' y1='15' x2='8' y2='5' stroke='${primary}' stroke-width='2' stroke-linecap='round'/>
            <circle cx='12' cy='10' r='1.5' fill='${fill}' stroke='${primary}' stroke-width='1'/>
        </g>
    </svg>`;

    // 13. Reroute (Node Gateway & Flow Re-director Capsule)
    const rerouteSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId}-sh)'>
            <!-- Lead Wire Indicators -->
            <line x1='1.5' y1='14' x2='4' y2='14' stroke='${primary}' stroke-width='1.8' stroke-linecap='round'/>
            <line x1='24' y1='14' x2='26.5' y2='14' stroke='${primary}' stroke-width='1.8' stroke-linecap='round'/>
            <!-- Main Reroute Node Body -->
            <rect x='6.5' y='8.5' width='15' height='11' rx='3.5' fill='${fill}' stroke='${primary}' stroke-width='1.8'/>
            <!-- Left Socket Pin -->
            <circle cx='5' cy='14' r='2.8' fill='${fill}' stroke='${primary}' stroke-width='1.4'/>
            <circle cx='5' cy='14' r='1.2' fill='${primary}'/>
            <!-- Right Socket Pin -->
            <circle cx='23' cy='14' r='2.8' fill='${fill}' stroke='${primary}' stroke-width='1.4'/>
            <circle cx='23' cy='14' r='1.2' fill='${primary}'/>
            <!-- Center Flow Chevrons (>>) -->
            <path d='M 11.5 11.5 L 14 14 L 11.5 16.5 M 15 11.5 L 17.5 14 L 15 16.5' stroke='${primary}' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/>
        </g>
    </svg>`;

    // 14. Not Allowed
    const notAllowedSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId}-sh)'>
            <circle cx='12' cy='12' r='8.5' fill='${fill}' stroke='#ef4444' stroke-width='2.2'/>
            <line x1='6' y1='6' x2='18' y2='18' stroke='#ef4444' stroke-width='2.2' stroke-linecap='round'/>
        </g>
    </svg>`;

    // 15. Wait (Spinner)
    const waitSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId}-sh)'>
            <circle cx='12' cy='12' r='8' stroke='${primary}' stroke-width='2' stroke-dasharray='12 6' fill='none'/>
            <circle cx='12' cy='4' r='2' fill='${fill}' stroke='${primary}' stroke-width='1.2'/>
            <circle cx='12' cy='12' r='2.5' fill='${fill}' stroke='${primary}' stroke-width='1'/>
        </g>
    </svg>`;

    return {
        cursors: {
            default: `${svgToDataUri(defaultSvg)} 5 3, default`,
            pointer: `${svgToDataUri(pointerSvg)} 5 2, pointer`,
            grab: `${svgToDataUri(grabSvg)} 14 14, grab`,
            grabbing: `${svgToDataUri(grabbingSvg)} 14 14, grabbing`,
            text: `${svgToDataUri(textSvg)} 12 12, text`,
            crosshair: `${svgToDataUri(crosshairSvg)} 12 12, crosshair`,
            ewResize: `${svgToDataUri(ewResizeSvg)} 12 12, ew-resize`,
            nsResize: `${svgToDataUri(nsResizeSvg)} 12 12, ns-resize`,
            nwseResize: `${svgToDataUri(nwseResizeSvg)} 12 12, nwse-resize`,
            neswResize: `${svgToDataUri(neswResizeSvg)} 12 12, nesw-resize`,
            move: `${svgToDataUri(moveSvg)} 12 12, move`,
            cutter: `${svgToDataUri(cutterSvg)} 12 10, crosshair`,
            reroute: `${svgToDataUri(rerouteSvg)} 14 14, crosshair`,
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
