import { SkinColors, svgToDataUri } from '../types';

export function buildSciFiSvgSet(colors: SkinColors) {
    const { primary, secondary, darkBorder, fill, whiteCore } = colors;

    // 1. Default Arrow (Sleek Angular Sci-Fi Pointer)
    const defaultSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        <defs>
            <filter id='glow' x='-20%' y='-20%' width='140%' height='140%'>
                <feDropShadow dx='0' dy='1' stdDeviation='1.2' flood-color='${primary}' flood-opacity='0.6'/>
            </filter>
        </defs>
        <path d='M2 2 L12 26 L16 16 L26 12 Z' fill='${darkBorder}' stroke='${darkBorder}' stroke-width='2' stroke-linejoin='round'/>
        <path d='M3 3.5 L11.5 23.5 L15 15 L23.5 11.5 Z' fill='${fill}' stroke='${primary}' stroke-width='1.2' stroke-linejoin='round' filter='url(#glow)'/>
        <path d='M4.5 5.5 L10.5 19.5 L13 13.5 L19.5 10.5 Z' fill='${secondary}' opacity='0.35'/>
        <line x1='3.5' y1='4.5' x2='14' y2='14' stroke='${whiteCore}' stroke-width='1' stroke-linecap='round'/>
        <circle cx='3' cy='3' r='1.2' fill='${whiteCore}'/>
    </svg>`;

    // 2. Pointer (Interactive Hand / Targeted Click Pointer)
    const pointerSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        <defs>
            <filter id='glow-p' x='-20%' y='-20%' width='140%' height='140%'>
                <feDropShadow dx='0' dy='1' stdDeviation='1.5' flood-color='${primary}' flood-opacity='0.7'/>
            </filter>
        </defs>
        <path d='M3 1 L11 23 L14.5 16.5 L21 21 L23 18 L16.5 13.5 L23 11 Z' fill='${darkBorder}' stroke='${darkBorder}' stroke-width='2' stroke-linejoin='round'/>
        <path d='M4 2.5 L10.5 20.5 L13.5 15 L19.5 19 L20.8 17.2 L15 12.5 L20.5 10.5 Z' fill='${fill}' stroke='${secondary}' stroke-width='1.2' stroke-linejoin='round' filter='url(#glow-p)'/>
        <path d='M5 4.5 L9.5 17 L12 13 L17 11 Z' fill='${primary}' opacity='0.4'/>
        <circle cx='4' cy='3' r='1.5' fill='${whiteCore}'/>
        <circle cx='21' cy='5' r='2.5' stroke='${primary}' stroke-width='1' fill='${fill}'/>
        <circle cx='21' cy='5' r='1' fill='${secondary}'/>
    </svg>`;

    // 3. Grab (4-Way Sci-Fi Cyber Pan Compass)
    const grabSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        <defs>
            <filter id='glow-g' x='-30%' y='-30%' width='160%' height='160%'>
                <feDropShadow dx='0' dy='0' stdDeviation='1.5' flood-color='${primary}' flood-opacity='0.75'/>
            </filter>
        </defs>
        <!-- Dark Shadow Underlayer -->
        <g stroke='${darkBorder}' stroke-width='3.2' stroke-linejoin='round' stroke-linecap='round'>
            <path d='M14 2 L19.2 8.5 L8.8 8.5 Z' fill='${darkBorder}'/>
            <path d='M14 26 L8.8 19.5 L19.2 19.5 Z' fill='${darkBorder}'/>
            <path d='M2 14 L8.5 8.8 L8.5 19.2 Z' fill='${darkBorder}'/>
            <path d='M26 14 L19.5 19.2 L19.5 8.8 Z' fill='${darkBorder}'/>
            <rect x='10.5' y='10.5' width='7' height='7' rx='1.8' fill='${darkBorder}'/>
        </g>
        <!-- Glowing Sci-Fi Layer -->
        <g filter='url(#glow-g)'>
            <path d='M14 2.5 L18.8 8.5 L9.2 8.5 Z' fill='${fill}' stroke='${primary}' stroke-width='1.4' stroke-linejoin='round'/>
            <path d='M14 25.5 L9.2 19.5 L18.8 19.5 Z' fill='${fill}' stroke='${primary}' stroke-width='1.4' stroke-linejoin='round'/>
            <path d='M2.5 14 L8.5 9.2 L8.5 18.8 Z' fill='${fill}' stroke='${primary}' stroke-width='1.4' stroke-linejoin='round'/>
            <path d='M25.5 14 L19.5 18.8 L19.5 9.2 Z' fill='${fill}' stroke='${primary}' stroke-width='1.4' stroke-linejoin='round'/>
            <rect x='11' y='11' width='6' height='6' rx='1.5' fill='${fill}' stroke='${secondary}' stroke-width='1.4' stroke-linejoin='round'/>
        </g>
        <!-- Sci-Fi Inner Core Highlights -->
        <circle cx='14' cy='14' r='1.3' fill='${whiteCore}'/>
        <line x1='14' y1='4.5' x2='14' y2='6.5' stroke='${whiteCore}' stroke-width='0.9' stroke-linecap='round'/>
        <line x1='14' y1='23.5' x2='14' y2='21.5' stroke='${whiteCore}' stroke-width='0.9' stroke-linecap='round'/>
        <line x1='4.5' y1='14' x2='6.5' y2='14' stroke='${whiteCore}' stroke-width='0.9' stroke-linecap='round'/>
        <line x1='23.5' y1='14' x2='21.5' y2='14' stroke='${whiteCore}' stroke-width='0.9' stroke-linecap='round'/>
    </svg>`;

    // 4. Grabbing (Compressed Sci-Fi Cyber Pan Core)
    const grabbingSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        <defs>
            <filter id='glow-gb' x='-30%' y='-30%' width='160%' height='160%'>
                <feDropShadow dx='0' dy='0' stdDeviation='1.8' flood-color='${secondary}' flood-opacity='0.9'/>
            </filter>
        </defs>
        <!-- Dark Shadow Underlayer -->
        <g stroke='${darkBorder}' stroke-width='3.2' stroke-linejoin='round' stroke-linecap='round'>
            <path d='M14 5 L18.6 11 L9.4 11 Z' fill='${darkBorder}'/>
            <path d='M14 23 L9.4 17 L18.6 17 Z' fill='${darkBorder}'/>
            <path d='M5 14 L11 9.4 L11 18.6 Z' fill='${darkBorder}'/>
            <path d='M23 14 L17 18.6 L17 9.4 Z' fill='${darkBorder}'/>
            <rect x='11' y='11' width='6' height='6' rx='1.5' fill='${darkBorder}'/>
        </g>
        <!-- Glowing Sci-Fi Compressed Layer -->
        <g filter='url(#glow-gb)'>
            <path d='M14 5.5 L18.2 11 L9.8 11 Z' fill='${fill}' stroke='${secondary}' stroke-width='1.4' stroke-linejoin='round'/>
            <path d='M14 22.5 L9.8 17 L18.2 17 Z' fill='${fill}' stroke='${secondary}' stroke-width='1.4' stroke-linejoin='round'/>
            <path d='M5.5 14 L11 9.8 L11 18.2 Z' fill='${fill}' stroke='${secondary}' stroke-width='1.4' stroke-linejoin='round'/>
            <path d='M22.5 14 L17 18.2 L17 9.8 Z' fill='${fill}' stroke='${secondary}' stroke-width='1.4' stroke-linejoin='round'/>
            <rect x='11.5' y='11.5' width='5' height='5' rx='1.2' fill='${primary}' stroke='${whiteCore}' stroke-width='1.2' stroke-linejoin='round'/>
        </g>
        <!-- Sci-Fi Energetic Core Center -->
        <circle cx='14' cy='14' r='1.2' fill='${whiteCore}'/>
    </svg>`;

    // 5. Text / I-Beam (Precision Digital Beam)
    const textSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        <defs>
            <filter id='glow-t' x='-30%' y='-30%' width='160%' height='160%'>
                <feDropShadow dx='0' dy='0' stdDeviation='1.2' flood-color='${primary}' flood-opacity='0.8'/>
            </filter>
        </defs>
        <path d='M9 4 L19 4 M9 24 L19 24 M14 4 L14 24' stroke='${darkBorder}' stroke-width='4' stroke-linecap='round'/>
        <path d='M9 4 L19 4 M9 24 L19 24 M14 4 L14 24' stroke='${primary}' stroke-width='2' stroke-linecap='round' filter='url(#glow-t)'/>
        <line x1='14' y1='6' x2='14' y2='22' stroke='${whiteCore}' stroke-width='1' stroke-linecap='round'/>
        <circle cx='14' cy='14' r='1.5' fill='${secondary}'/>
    </svg>`;

    // 6. Crosshair (Sci-Fi Target Reticle)
    const crosshairSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        <defs>
            <filter id='glow-c' x='-30%' y='-30%' width='160%' height='160%'>
                <feDropShadow dx='0' dy='0' stdDeviation='1.5' flood-color='${primary}' flood-opacity='0.7'/>
            </filter>
        </defs>
        <circle cx='14' cy='14' r='9' stroke='${darkBorder}' stroke-width='3' fill='none'/>
        <circle cx='14' cy='14' r='9' stroke='${primary}' stroke-width='1.5' stroke-dasharray='4 2' fill='none' filter='url(#glow-c)'/>
        <circle cx='14' cy='14' r='3.5' stroke='${secondary}' stroke-width='1' fill='${fill}'/>
        <line x1='14' y1='2' x2='14' y2='8' stroke='${primary}' stroke-width='2' stroke-linecap='round'/>
        <line x1='14' y1='20' x2='14' y2='26' stroke='${primary}' stroke-width='2' stroke-linecap='round'/>
        <line x1='2' y1='14' x2='8' y2='14' stroke='${primary}' stroke-width='2' stroke-linecap='round'/>
        <line x1='20' y1='14' x2='26' y2='14' stroke='${primary}' stroke-width='2' stroke-linecap='round'/>
        <circle cx='14' cy='14' r='1' fill='${whiteCore}'/>
    </svg>`;

    // 7. EW Resize (Horizontal Cyber Arrows)
    const ewResizeSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        <defs>
            <filter id='glow-ew' x='-20%' y='-20%' width='140%' height='140%'>
                <feDropShadow dx='0' dy='0' stdDeviation='1.5' flood-color='${primary}' flood-opacity='0.7'/>
            </filter>
        </defs>
        <path d='M3 14 L9 8.5 L9 11.5 L19 11.5 L19 8.5 L25 14 L19 19.5 L19 16.5 L9 16.5 L9 19.5 Z' fill='${darkBorder}' stroke='${darkBorder}' stroke-width='2' stroke-linejoin='round'/>
        <path d='M3.5 14 L9 9 L9 12 L19 12 L19 9 L24.5 14 L19 19 L19 16 L9 16 L9 19 Z' fill='${fill}' stroke='${primary}' stroke-width='1.2' stroke-linejoin='round' filter='url(#glow-ew)'/>
        <line x1='11' y1='14' x2='17' y2='14' stroke='${whiteCore}' stroke-width='1.2' stroke-linecap='round'/>
    </svg>`;

    // 8. NS Resize (Vertical Cyber Arrows)
    const nsResizeSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        <defs>
            <filter id='glow-ns' x='-20%' y='-20%' width='140%' height='140%'>
                <feDropShadow dx='0' dy='0' stdDeviation='1.5' flood-color='${primary}' flood-opacity='0.7'/>
            </filter>
        </defs>
        <path d='M14 3 L8.5 9 L11.5 9 L11.5 19 L8.5 19 L14 25 L19.5 19 L16.5 19 L16.5 9 L19.5 9 Z' fill='${darkBorder}' stroke='${darkBorder}' stroke-width='2' stroke-linejoin='round'/>
        <path d='M14 3.5 L9 9 L12 9 L12 19 L9 19 L14 24.5 L19 19 L16 19 L16 9 L19 9 Z' fill='${fill}' stroke='${primary}' stroke-width='1.2' stroke-linejoin='round' filter='url(#glow-ns)'/>
        <line x1='14' y1='11' x2='14' y2='17' stroke='${whiteCore}' stroke-width='1.2' stroke-linecap='round'/>
    </svg>`;

    // 9. NWSE Resize (Diagonal Cyber Arrows \)
    const nwseResizeSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        <defs>
            <filter id='glow-nwse' x='-20%' y='-20%' width='140%' height='140%'>
                <feDropShadow dx='0' dy='0' stdDeviation='1.5' flood-color='${primary}' flood-opacity='0.7'/>
            </filter>
        </defs>
        <path d='M5 5 L13 5 L10 8 L19 17 L22 14 L22 22 L14 22 L17 19 L8 10 L5 13 Z' fill='${darkBorder}' stroke='${darkBorder}' stroke-width='2' stroke-linejoin='round'/>
        <path d='M5.5 5.5 L12.5 5.5 L9.8 8.2 L18.8 17.2 L21.5 14.5 L21.5 21.5 L14.5 21.5 L17.2 18.8 L8.2 9.8 L5.5 12.5 Z' fill='${fill}' stroke='${primary}' stroke-width='1.2' stroke-linejoin='round' filter='url(#glow-nwse)'/>
        <line x1='10' y1='10' x2='17' y2='17' stroke='${whiteCore}' stroke-width='1.2' stroke-linecap='round'/>
    </svg>`;

    // 10. NESW Resize (Diagonal Cyber Arrows /)
    const neswResizeSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        <defs>
            <filter id='glow-nesw' x='-20%' y='-20%' width='140%' height='140%'>
                <feDropShadow dx='0' dy='0' stdDeviation='1.5' flood-color='${primary}' flood-opacity='0.7'/>
            </filter>
        </defs>
        <path d='M22 5 L22 13 L19 10 L10 19 L13 22 L5 22 L5 14 L8 17 L17 8 L14 5 Z' fill='${darkBorder}' stroke='${darkBorder}' stroke-width='2' stroke-linejoin='round'/>
        <path d='M21.5 5.5 L21.5 12.5 L18.8 9.8 L9.8 18.8 L12.5 21.5 L5.5 21.5 L5.5 14.5 L8.2 17.2 L17.2 8.2 L14.5 5.5 Z' fill='${fill}' stroke='${primary}' stroke-width='1.2' stroke-linejoin='round' filter='url(#glow-nesw)'/>
        <line x1='17' y1='10' x2='10' y2='17' stroke='${whiteCore}' stroke-width='1.2' stroke-linecap='round'/>
    </svg>`;

    // 11. Move (4-Way Omni Directional Translocator)
    const moveSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        <defs>
            <filter id='glow-mv' x='-20%' y='-20%' width='140%' height='140%'>
                <feDropShadow dx='0' dy='0' stdDeviation='1.5' flood-color='${primary}' flood-opacity='0.7'/>
            </filter>
        </defs>
        <path d='M14 2 L18 6 L15.5 6 L15.5 12.5 L22 12.5 L22 10 L26 14 L22 18 L22 15.5 L15.5 15.5 L15.5 22 L18 22 L14 26 L10 22 L12.5 22 L12.5 15.5 L6 15.5 L6 18 L2 14 L6 10 L6 12.5 L12.5 12.5 L12.5 6 L10 6 Z' fill='${darkBorder}' stroke='${darkBorder}' stroke-width='2' stroke-linejoin='round'/>
        <path d='M14 3 L17.5 6.5 L15 6.5 L15 13 L21.5 13 L21.5 10.5 L25 14 L21.5 17.5 L21.5 15 L15 15 L15 21.5 L17.5 21.5 L14 25 L10.5 21.5 L13 21.5 L13 15 L6.5 15 L6.5 17.5 L3 14 L6.5 10.5 L6.5 13 L13 13 L13 6.5 L10.5 6.5 Z' fill='${fill}' stroke='${primary}' stroke-width='1.2' stroke-linejoin='round' filter='url(#glow-mv)'/>
        <circle cx='14' cy='14' r='2' fill='${secondary}' stroke='${whiteCore}' stroke-width='0.8'/>
    </svg>`;

    // 12. Cutter (Laser Shears / Circuit Severer)
    const cutterSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        <defs>
            <filter id='glow-cut' x='-20%' y='-20%' width='140%' height='140%'>
                <feDropShadow dx='0' dy='0' stdDeviation='1.8' flood-color='#ef4444' flood-opacity='0.85'/>
            </filter>
        </defs>
        <circle cx='8' cy='20' r='4.5' fill='${darkBorder}' stroke='${darkBorder}' stroke-width='2'/>
        <circle cx='20' cy='20' r='4.5' fill='${darkBorder}' stroke='${darkBorder}' stroke-width='2'/>
        <circle cx='8' cy='20' r='4' fill='${fill}' stroke='${primary}' stroke-width='1.4'/>
        <circle cx='20' cy='20' r='4' fill='${fill}' stroke='${primary}' stroke-width='1.4'/>
        <circle cx='8' cy='20' r='1.5' fill='${secondary}'/>
        <circle cx='20' cy='20' r='1.5' fill='${secondary}'/>
        <line x1='10' y1='17' x2='18' y2='6' stroke='#ef4444' stroke-width='2.2' stroke-linecap='round' filter='url(#glow-cut)'/>
        <line x1='18' y1='17' x2='10' y2='6' stroke='${primary}' stroke-width='2' stroke-linecap='round'/>
        <circle cx='14' cy='11.5' r='1.8' fill='${whiteCore}' stroke='${darkBorder}' stroke-width='1'/>
    </svg>`;

    // 13. Reroute (Node Gateway & Flow Re-director Capsule)
    const rerouteSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        <defs>
            <filter id='glow-rr' x='-20%' y='-20%' width='140%' height='140%'>
                <feDropShadow dx='0' dy='0' stdDeviation='1.5' flood-color='${primary}' flood-opacity='0.75'/>
            </filter>
        </defs>
        <!-- Outer Dark Shield Backing -->
        <rect x='5.5' y='7.5' width='17' height='13' rx='4.5' fill='${darkBorder}'/>
        <!-- Lead Wire Indicators -->
        <line x1='1' y1='14' x2='4' y2='14' stroke='${secondary}' stroke-width='1.8' stroke-linecap='round'/>
        <line x1='24' y1='14' x2='27' y2='14' stroke='${secondary}' stroke-width='1.8' stroke-linecap='round'/>
        <!-- Main Reroute Node Body -->
        <rect x='6.5' y='8.5' width='15' height='11' rx='3.5' fill='${fill}' stroke='${primary}' stroke-width='1.5' filter='url(#glow-rr)'/>
        <!-- Left Socket Pin -->
        <circle cx='5' cy='14' r='2.8' fill='${fill}' stroke='${primary}' stroke-width='1.3'/>
        <circle cx='5' cy='14' r='1.2' fill='${secondary}'/>
        <!-- Right Socket Pin -->
        <circle cx='23' cy='14' r='2.8' fill='${fill}' stroke='${primary}' stroke-width='1.3'/>
        <circle cx='23' cy='14' r='1.2' fill='${secondary}'/>
        <!-- Center Double Flow Chevrons (>>) -->
        <path d='M 11.5 11.5 L 14 14 L 11.5 16.5 M 15 11.5 L 17.5 14 L 15 16.5' stroke='${whiteCore}' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/>
    </svg>`;

    // 14. Not Allowed (Plasma Warning Barrier)
    const notAllowedSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        <defs>
            <filter id='glow-na' x='-20%' y='-20%' width='140%' height='140%'>
                <feDropShadow dx='0' dy='0' stdDeviation='1.5' flood-color='#ef4444' flood-opacity='0.8'/>
            </filter>
        </defs>
        <circle cx='14' cy='14' r='10' stroke='${darkBorder}' stroke-width='3' fill='none'/>
        <circle cx='14' cy='14' r='10' stroke='#ef4444' stroke-width='2' fill='${fill}' filter='url(#glow-na)'/>
        <line x1='7' y1='7' x2='21' y2='21' stroke='#ef4444' stroke-width='2.2' stroke-linecap='round' filter='url(#glow-na)'/>
        <line x1='7' y1='7' x2='21' y2='21' stroke='${whiteCore}' stroke-width='0.8' stroke-linecap='round'/>
    </svg>`;

    // 15. Wait / Loading (Reactor Core Vortex)
    const waitSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'>
        <defs>
            <filter id='glow-w' x='-20%' y='-20%' width='140%' height='140%'>
                <feDropShadow dx='0' dy='0' stdDeviation='1.5' flood-color='${primary}' flood-opacity='0.8'/>
            </filter>
        </defs>
        <circle cx='14' cy='14' r='9' stroke='${darkBorder}' stroke-width='3' fill='none'/>
        <circle cx='14' cy='14' r='9' stroke='${primary}' stroke-width='2' stroke-dasharray='14 8' fill='none' filter='url(#glow-w)'/>
        <circle cx='14' cy='5' r='2' fill='${secondary}' stroke='${whiteCore}' stroke-width='0.8'/>
        <circle cx='14' cy='14' r='3' fill='${fill}' stroke='${primary}' stroke-width='1.2'/>
        <circle cx='14' cy='14' r='1.2' fill='${whiteCore}'/>
    </svg>`;

    return {
        cursors: {
            default: `${svgToDataUri(defaultSvg)} 2 2, default`,
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
            cutter: `${svgToDataUri(cutterSvg)} 14 11, crosshair`,
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
