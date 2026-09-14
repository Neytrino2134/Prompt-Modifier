import { CursorDefinitionSet, svgToDataUri } from '../types';

export interface ToyPalette {
    id: string;
    outerColor: string; // The solid toy shell color
    innerColor: string; // The soft interior inlay color
    darkShadow?: string; // Optional soft drop shadow color
    accentColor: string;
}

/**
 * Builds a complete 15-cursor set in the tactile, friendly "Toy Style" (Rounded Flat 2-Tone).
 * Inspired by friendly molded toy UI with rounded caps, dual-tone layering, and chunky silhouettes.
 */
export function buildToySvgSet(palette: ToyPalette): {
    cursors: CursorDefinitionSet['cursors'];
    rawSvgs: CursorDefinitionSet['rawSvgs'];
} {
    const { id, outerColor, innerColor, darkShadow = 'rgba(0,0,0,0.3)', accentColor } = palette;
    const filterId = `toy-sh-${id}`;

    const filterDef = `
        <defs>
            <filter id='${filterId}' x='-20%' y='-20%' width='145%' height='145%'>
                <feDropShadow dx='0.5' dy='1.2' stdDeviation='1' flood-color='${darkShadow}' flood-opacity='0.4'/>
            </filter>
        </defs>
    `;

    // 1. Default (Chunky 2-Tone Rounded Toy Arrow with Cute Tail Tab)
    const defaultSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId})'>
            <!-- Tail Tab -->
            <rect x='13' y='13' width='5.5' height='5.5' rx='1.6' transform='rotate(45 15.75 15.75)' fill='${outerColor}'/>
            <!-- Outer Balloon Head -->
            <path d='M 4.2 4.2 C 2.8 5.6, 3.2 8.8, 4.8 12.2 L 7.8 18.5 C 9.2 21.4, 12.4 21.2, 14.2 19 L 15 18 C 15.5 17.4, 16.5 17.4, 17 18 L 17.8 19 C 19.6 21.2, 22.8 21.4, 24.2 18.5 L 20.8 12.2 C 19.2 8.8, 16.4 2.8, 12.2 4.8 L 4.2 4.2 Z' fill='none'/>
            <path d='M 5.5 3.5 C 3.6 4.6, 3.8 8.2, 5.2 11.6 L 8.4 18.8 C 9.6 21.5, 12.8 21.8, 14.8 19.5 C 16.8 21.8, 20 21.5, 21.2 18.8 L 24.4 11.6 C 25.8 8.2, 26 4.6, 24.1 3.5 C 22.2 2.4, 18.8 4.2, 14.8 7.2 C 10.8 4.2, 7.4 2.4, 5.5 3.5 Z' fill='none'/>
            <!-- Precision Toy Arrow Head (outer shell) -->
            <path d='M 4.8 4.8 C 3.2 6.4, 3.8 10, 5.5 13.8 L 8.8 20.5 C 10.2 23.2, 13.5 22.8, 15.2 20.2 L 19.8 15.2 C 22.4 13.5, 22.8 10.2, 20.1 8.8 L 13.8 5.5 C 10 3.8, 6.4 3.2, 4.8 4.8 Z' fill='${outerColor}'/>
            <!-- Inner Inlay -->
            <path d='M 6.8 6.8 C 5.8 7.8, 6.2 10.2, 7.5 12.8 L 10.2 17.8 C 11.2 19.6, 13.2 19.2, 14.2 17.8 L 17.5 14.2 C 19 13, 19.2 11.2, 17.8 10.2 L 12.8 7.5 C 10.2 6.2, 7.8 5.8, 6.8 6.8 Z' fill='${innerColor}'/>
        </g>
    </svg>`;

    // 2. Pointer (Toy Arrow with Cute Floating Bubble Indicator)
    const pointerSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId})'>
            <!-- Tail Tab -->
            <rect x='11.5' y='11.5' width='5' height='5' rx='1.5' transform='rotate(45 14 14)' fill='${outerColor}'/>
            <!-- Outer Head -->
            <path d='M 3.8 3.8 C 2.5 5.1, 3 8, 4.5 11.2 L 7.2 16.8 C 8.4 19.2, 11.2 18.8, 12.6 16.6 L 16.2 12.6 C 18.4 11.2, 18.8 8.4, 16.5 7.2 L 11.2 4.5 C 8 3, 5.1 2.5, 3.8 3.8 Z' fill='${outerColor}'/>
            <!-- Inner Inlay -->
            <path d='M 5.5 5.5 C 4.7 6.3, 5 8.2, 6 10.2 L 8.2 14.2 C 9.1 15.6, 10.8 15.3, 11.6 14.2 L 14.2 11.6 C 15.3 10.8, 15.6 9.1, 14.2 8.2 L 10.2 6 C 8.2 5, 6.3 4.7, 5.5 5.5 Z' fill='${innerColor}'/>
            <!-- Cute Floating Toy Tap Ring -->
            <circle cx='20.5' cy='20.5' r='5' fill='${outerColor}'/>
            <circle cx='20.5' cy='20.5' r='3.2' fill='${innerColor}'/>
            <circle cx='20.5' cy='20.5' r='1.2' fill='${outerColor}'/>
        </g>
    </svg>`;

    // 3. Grab (Cute 4-way Toy Mushroom Pad / Open Palm)
    const grabSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId})'>
            <circle cx='14' cy='14' r='10' fill='${outerColor}'/>
            <circle cx='14' cy='14' r='6.8' fill='${innerColor}'/>
            <!-- 4 Soft Toy Grip Dots -->
            <circle cx='14' cy='9' r='1.8' fill='${outerColor}'/>
            <circle cx='14' cy='19' r='1.8' fill='${outerColor}'/>
            <circle cx='9' cy='14' r='1.8' fill='${outerColor}'/>
            <circle cx='19' cy='14' r='1.8' fill='${outerColor}'/>
            <circle cx='14' cy='14' r='2' fill='${outerColor}'/>
        </g>
    </svg>`;

    // 4. Grabbing (Compressed Gripping Toy Button)
    const grabbingSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId})'>
            <circle cx='14' cy='14' r='8.5' fill='${outerColor}'/>
            <circle cx='14' cy='14' r='5.2' fill='${innerColor}'/>
            <circle cx='14' cy='14' r='2.8' fill='${outerColor}'/>
        </g>
    </svg>`;

    // 5. Text (Toy Barbell / Capsule I-Beam)
    const textSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId})'>
            <!-- Top Cap -->
            <rect x='7' y='4' width='14' height='5.5' rx='2.75' fill='${outerColor}'/>
            <rect x='9' y='5' width='10' height='3.5' rx='1.75' fill='${innerColor}'/>
            <!-- Bottom Cap -->
            <rect x='7' y='18.5' width='14' height='5.5' rx='2.75' fill='${outerColor}'/>
            <rect x='9' y='19.5' width='10' height='3.5' rx='1.75' fill='${innerColor}'/>
            <!-- Center Stem -->
            <rect x='11.5' y='7' width='5' height='14' rx='2.5' fill='${outerColor}'/>
            <rect x='12.7' y='8.5' width='2.6' height='11' rx='1.3' fill='${innerColor}'/>
        </g>
    </svg>`;

    // 6. Crosshair (Chunky Rounded Toy Reticle)
    const crosshairSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId})'>
            <circle cx='14' cy='14' r='9.5' fill='none' stroke='${outerColor}' stroke-width='3.2'/>
            <circle cx='14' cy='14' r='9.5' fill='none' stroke='${innerColor}' stroke-width='1.6'/>
            <!-- 4 Soft Toy Crosshair Pills -->
            <rect x='12.5' y='2' width='3' height='6' rx='1.5' fill='${outerColor}'/>
            <rect x='12.5' y='20' width='3' height='6' rx='1.5' fill='${outerColor}'/>
            <rect x='2' y='12.5' width='6' height='3' rx='1.5' fill='${outerColor}'/>
            <rect x='20' y='12.5' width='6' height='3' rx='1.5' fill='${outerColor}'/>
            <!-- Center Bead -->
            <circle cx='14' cy='14' r='2.5' fill='${outerColor}'/>
            <circle cx='14' cy='14' r='1.2' fill='${innerColor}'/>
        </g>
    </svg>`;

    // 7. EW Resize (Chunky Double Toy Arrow Horizontal)
    const ewResizeSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId})'>
            <!-- Horizontal Connector Pill -->
            <rect x='5' y='11.5' width='18' height='5' rx='2.5' fill='${outerColor}'/>
            <rect x='7' y='12.5' width='14' height='3' rx='1.5' fill='${innerColor}'/>
            <!-- Left Toy Arrow -->
            <path d='M 8 7 C 8 5.8, 6.5 5.2, 5.5 6.2 L 2.2 9.8 C 1.2 10.8, 1.2 12.4, 2.2 13.4 L 5.5 17 C 6.5 18, 8 17.4, 8 16.2 Z' fill='${outerColor}'/>
            <path d='M 6.8 8.5 L 3.8 11.6 C 3.4 12, 3.4 12.6, 3.8 13 L 6.8 16 Z' fill='${innerColor}'/>
            <!-- Right Toy Arrow -->
            <path d='M 20 7 C 20 5.8, 21.5 5.2, 22.5 6.2 L 25.8 9.8 C 26.8 10.8, 26.8 12.4, 25.8 13.4 L 22.5 17 C 21.5 18, 20 17.4, 20 16.2 Z' fill='${outerColor}'/>
            <path d='M 21.2 8.5 L 24.2 11.6 C 24.6 12, 24.6 12.6, 24.2 13 L 21.2 16 Z' fill='${innerColor}'/>
        </g>
    </svg>`;

    // 8. NS Resize (Chunky Double Toy Arrow Vertical)
    const nsResizeSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId})'>
            <!-- Vertical Connector Pill -->
            <rect x='11.5' y='5' width='5' height='18' rx='2.5' fill='${outerColor}'/>
            <rect x='12.5' y='7' width='3' height='14' rx='1.5' fill='${innerColor}'/>
            <!-- Top Toy Arrow -->
            <path d='M 7 8 C 5.8 8, 5.2 6.5, 6.2 5.5 L 9.8 2.2 C 10.8 1.2, 12.4 1.2, 13.4 2.2 L 17 5.5 C 18 6.5, 17.4 8, 16.2 8 Z' fill='${outerColor}'/>
            <path d='M 8.5 6.8 L 11.6 3.8 C 12 3.4, 12.6 3.4, 13 3.8 L 16 6.8 Z' fill='${innerColor}'/>
            <!-- Bottom Toy Arrow -->
            <path d='M 7 20 C 5.8 20, 5.2 21.5, 6.2 22.5 L 9.8 25.8 C 10.8 26.8, 12.4 26.8, 13.4 25.8 L 17 22.5 C 18 21.5, 17.4 20, 16.2 20 Z' fill='${outerColor}'/>
            <path d='M 8.5 21.2 L 11.6 24.2 C 12 24.6, 12.6 24.6, 13 24.2 L 16 21.2 Z' fill='${innerColor}'/>
        </g>
    </svg>`;

    // 9. NWSE Resize (Chunky Diagonal Toy Arrow)
    const nwseResizeSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId})' transform='rotate(45 14 14)'>
            <rect x='11.5' y='5' width='5' height='18' rx='2.5' fill='${outerColor}'/>
            <rect x='12.5' y='7' width='3' height='14' rx='1.5' fill='${innerColor}'/>
            <path d='M 7 8 C 5.8 8, 5.2 6.5, 6.2 5.5 L 9.8 2.2 C 10.8 1.2, 12.4 1.2, 13.4 2.2 L 17 5.5 C 18 6.5, 17.4 8, 16.2 8 Z' fill='${outerColor}'/>
            <path d='M 8.5 6.8 L 11.6 3.8 C 12 3.4, 12.6 3.4, 13 3.8 L 16 6.8 Z' fill='${innerColor}'/>
            <path d='M 7 20 C 5.8 20, 5.2 21.5, 6.2 22.5 L 9.8 25.8 C 10.8 26.8, 12.4 26.8, 13.4 25.8 L 17 22.5 C 18 21.5, 17.4 20, 16.2 20 Z' fill='${outerColor}'/>
            <path d='M 8.5 21.2 L 11.6 24.2 C 12 24.6, 12.6 24.6, 13 24.2 L 16 21.2 Z' fill='${innerColor}'/>
        </g>
    </svg>`;

    // 10. NESW Resize (Chunky Diagonal Toy Arrow)
    const neswResizeSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId})' transform='rotate(-45 14 14)'>
            <rect x='11.5' y='5' width='5' height='18' rx='2.5' fill='${outerColor}'/>
            <rect x='12.5' y='7' width='3' height='14' rx='1.5' fill='${innerColor}'/>
            <path d='M 7 8 C 5.8 8, 5.2 6.5, 6.2 5.5 L 9.8 2.2 C 10.8 1.2, 12.4 1.2, 13.4 2.2 L 17 5.5 C 18 6.5, 17.4 8, 16.2 8 Z' fill='${outerColor}'/>
            <path d='M 8.5 6.8 L 11.6 3.8 C 12 3.4, 12.6 3.4, 13 3.8 L 16 6.8 Z' fill='${innerColor}'/>
            <path d='M 7 20 C 5.8 20, 5.2 21.5, 6.2 22.5 L 9.8 25.8 C 10.8 26.8, 12.4 26.8, 13.4 25.8 L 17 22.5 C 18 21.5, 17.4 20, 16.2 20 Z' fill='${outerColor}'/>
            <path d='M 8.5 21.2 L 11.6 24.2 C 12 24.6, 12.6 24.6, 13 24.2 L 16 21.2 Z' fill='${innerColor}'/>
        </g>
    </svg>`;

    // 11. Move (Chunky 4-Way Toy D-Pad Compass)
    const moveSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId})'>
            <!-- Center Hub -->
            <circle cx='14' cy='14' r='4' fill='${outerColor}'/>
            <circle cx='14' cy='14' r='2.2' fill='${innerColor}'/>
            <!-- Top / Bottom / Left / Right Arrows -->
            <path d='M 11.5 5 C 11.5 4, 12.5 3.2, 13.3 3.8 L 15.5 5.5 C 16.2 6.1, 15.8 7.2, 14.8 7.2 L 13.2 7.2 C 12.2 7.2, 11.5 6.5, 11.5 5.5 Z' fill='none'/>
            <!-- 4 Rounded Directional Caps -->
            <path d='M 11 6 C 11 4.5, 12.8 3.5, 14 4.5 L 16 6.2 C 17 7.2, 16.5 9, 15 9 L 13 9 C 11.8 9, 11 8, 11 6 Z' fill='${outerColor}'/>
            <path d='M 11 22 C 11 23.5, 12.8 24.5, 14 23.5 L 16 21.8 C 17 20.8, 16.5 19, 15 19 L 13 19 C 11.8 19, 11 20, 11 22 Z' fill='${outerColor}'/>
            <path d='M 6 11 C 4.5 11, 3.5 12.8, 4.5 14 L 6.2 16 C 7.2 17, 9 16.5, 9 15 L 9 13 C 9 11.8, 8 11, 6 11 Z' fill='${outerColor}'/>
            <path d='M 22 11 C 23.5 11, 24.5 12.8, 23.5 14 L 21.8 16 C 20.8 17, 19 16.5, 19 15 L 19 13 C 19 11.8, 20 11, 22 11 Z' fill='${outerColor}'/>
            <!-- Center Stems -->
            <rect x='12.5' y='6' width='3' height='16' rx='1.5' fill='${outerColor}'/>
            <rect x='6' y='12.5' width='16' height='3' rx='1.5' fill='${outerColor}'/>
        </g>
    </svg>`;

    // 12. Cutter (Chunky Toy Safety Scissors)
    const cutterSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId})'>
            <!-- Handle Ring 1 -->
            <circle cx='7.5' cy='7.5' r='5' fill='${outerColor}'/>
            <circle cx='7.5' cy='7.5' r='2.8' fill='${innerColor}'/>
            <!-- Handle Ring 2 -->
            <circle cx='7.5' cy='20.5' r='5' fill='${outerColor}'/>
            <circle cx='7.5' cy='20.5' r='2.8' fill='${innerColor}'/>
            <!-- Rounded Safety Blades -->
            <path d='M 10 9 L 22.5 17.5 C 23.8 18.5, 23.2 20.5, 21.5 20.5 L 10 17 Z' fill='${outerColor}'/>
            <path d='M 11 10.5 L 20 17.5 L 11 15.5 Z' fill='${innerColor}'/>
            <path d='M 10 19 L 22.5 10.5 C 23.8 9.5, 23.2 7.5, 21.5 7.5 L 10 11 Z' fill='${outerColor}'/>
            <path d='M 11 17.5 L 20 10.5 L 11 12.5 Z' fill='${innerColor}'/>
            <!-- Pivot Pin -->
            <circle cx='12.5' cy='14' r='2.5' fill='${outerColor}'/>
            <circle cx='12.5' cy='14' r='1.2' fill='${innerColor}'/>
        </g>
    </svg>`;

    // 13. Reroute (Chunky Toy Reroute Capsule Node with Flow Chevrons)
    const rerouteSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId})'>
            <!-- Lead Wire Pins -->
            <line x1='1.5' y1='14' x2='4' y2='14' stroke='${outerColor}' stroke-width='2' stroke-linecap='round'/>
            <line x1='24' y1='14' x2='26.5' y2='14' stroke='${outerColor}' stroke-width='2' stroke-linecap='round'/>
            <!-- Main Reroute Capsule Body -->
            <rect x='6.5' y='8.5' width='15' height='11' rx='4' fill='${outerColor}'/>
            <rect x='8' y='10' width='12' height='8' rx='2.8' fill='${innerColor}'/>
            <!-- Left Socket Pin -->
            <circle cx='5' cy='14' r='3' fill='${outerColor}'/>
            <circle cx='5' cy='14' r='1.4' fill='${innerColor}'/>
            <!-- Right Socket Pin -->
            <circle cx='23' cy='14' r='3' fill='${outerColor}'/>
            <circle cx='23' cy='14' r='1.4' fill='${innerColor}'/>
            <!-- Center Flow Chevrons (>> Cutout) -->
            <path d='M 11.5 11.8 L 14 14 L 11.5 16.2 M 14.5 11.8 L 17 14 L 14.5 16.2' stroke='${outerColor}' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' fill='none'/>
        </g>
    </svg>`;

    // 14. Not Allowed (Chunky Toy Prohibition Ring)
    const notAllowedSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId})'>
            <circle cx='14' cy='14' r='9.5' fill='none' stroke='${outerColor}' stroke-width='3.6'/>
            <circle cx='14' cy='14' r='9.5' fill='none' stroke='${innerColor}' stroke-width='1.8'/>
            <line x1='7.5' y1='7.5' x2='20.5' y2='20.5' stroke='${outerColor}' stroke-width='3.6' stroke-linecap='round'/>
            <line x1='7.5' y1='7.5' x2='20.5' y2='20.5' stroke='${innerColor}' stroke-width='1.8' stroke-linecap='round'/>
        </g>
    </svg>`;

    // 15. Wait (Playful Toy Orbital Beads)
    const waitSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        ${filterDef}
        <g filter='url(#${filterId})'>
            <!-- Center Toy Sphere -->
            <circle cx='14' cy='14' r='4.5' fill='${outerColor}'/>
            <circle cx='14' cy='14' r='2.5' fill='${innerColor}'/>
            <!-- Orbital Candy Beads -->
            <circle cx='14' cy='5' r='2.5' fill='${outerColor}'/>
            <circle cx='21' cy='8' r='2.2' fill='${innerColor}'/>
            <circle cx='23' cy='14' r='2.5' fill='${outerColor}'/>
            <circle cx='21' cy='20' r='2.2' fill='${innerColor}'/>
            <circle cx='14' cy='23' r='2.5' fill='${outerColor}'/>
            <circle cx='7' cy='20' r='2.2' fill='${innerColor}'/>
            <circle cx='5' cy='14' r='2.5' fill='${outerColor}'/>
            <circle cx='7' cy='8' r='2.2' fill='${innerColor}'/>
        </g>
    </svg>`;

    return {
        cursors: {
            default: `${svgToDataUri(defaultSvg)} 4 4, auto`,
            pointer: `${svgToDataUri(pointerSvg)} 4 4, pointer`,
            grab: `${svgToDataUri(grabSvg)} 14 14, grab`,
            grabbing: `${svgToDataUri(grabbingSvg)} 14 14, grabbing`,
            text: `${svgToDataUri(textSvg)} 14 14, text`,
            crosshair: `${svgToDataUri(crosshairSvg)} 14 14, crosshair`,
            ewResize: `${svgToDataUri(ewResizeSvg)} 14 14, ew-resize`,
            nsResize: `${svgToDataUri(nsResizeSvg)} 14 14, ns-resize`,
            nwseResize: `${svgToDataUri(nwseResizeSvg)} 14 14, nwse-resize`,
            neswResize: `${svgToDataUri(neswResizeSvg)} 14 14, nesw-resize`,
            move: `${svgToDataUri(moveSvg)} 14 14, move`,
            cutter: `${svgToDataUri(cutterSvg)} 12 14, crosshair`,
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
