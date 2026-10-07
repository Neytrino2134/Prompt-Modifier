import { CursorSkin, Theme } from '../../types';

// Helper to convert SVG strings to clean CSS url() data URIs
export function svgToDataUri(svg: string): string {
    const cleaned = svg.replace(/\n\s*/g, ' ').replace(/"/g, "'").trim();
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(cleaned)}")`;
}

export interface CursorDefinitionSet {
    id: CursorSkin;
    nameKey: string;
    descKey: string;
    accentColor: string;
    glowColor: string;
    cursors: {
        default: string;
        pointer: string;
        grab: string;
        grabbing: string;
        text: string;
        crosshair: string;
        ewResize: string;
        nsResize: string;
        nwseResize: string;
        neswResize: string;
        move: string;
        cutter: string;
        reroute: string;
        notAllowed: string;
        wait: string;
    };
    rawSvgs: {
        default: string;
        pointer: string;
        grab: string;
        grabbing: string;
        text: string;
        crosshair: string;
        cutter: string;
        reroute?: string;
    };
}

// Color palettes for skins
export interface SkinColors {
    primary: string;
    secondary: string;
    glow: string;
    darkBorder: string;
    fill: string;
    whiteCore: string;
}

// Theme accent color mapping for adaptive skins
export const THEME_ACCENT_COLORS: Record<Theme, { primary: string; secondary: string; glow: string }> = {
    cyan: { primary: '#06b6d4', secondary: '#22d3ee', glow: 'rgba(6, 182, 212, 0.65)' },
    azure: { primary: '#0ea5e9', secondary: '#38bdf8', glow: 'rgba(14, 165, 233, 0.65)' },
    amber: { primary: '#d97706', secondary: '#fbbf24', glow: 'rgba(245, 158, 11, 0.55)' },
    teal: { primary: '#0f766e', secondary: '#2dd4bf', glow: 'rgba(20, 184, 166, 0.55)' },
    rose: { primary: '#be123c', secondary: '#fb7185', glow: 'rgba(244, 63, 94, 0.55)' },
    purple: { primary: '#7c3aed', secondary: '#a78bfa', glow: 'rgba(167, 139, 250, 0.55)' },
    pink: { primary: '#db2777', secondary: '#f472b6', glow: 'rgba(244, 114, 182, 0.55)' },
    red: { primary: '#dc2626', secondary: '#f87171', glow: 'rgba(248, 113, 113, 0.55)' },
    orange: { primary: '#ea580c', secondary: '#fb923c', glow: 'rgba(251, 146, 60, 0.55)' },
    lime: { primary: '#65a30d', secondary: '#a3e635', glow: 'rgba(163, 230, 53, 0.55)' },
    emerald: { primary: '#059669', secondary: '#34d399', glow: 'rgba(52, 211, 153, 0.55)' },
    gray: { primary: '#71717a', secondary: '#a1a1aa', glow: 'rgba(161, 161, 170, 0.55)' },
    pastel_mint: { primary: '#0f766e', secondary: '#5eead4', glow: 'rgba(94, 234, 212, 0.45)' },
    pastel_lavender: { primary: '#5b4b70', secondary: '#c4b5db', glow: 'rgba(196, 181, 219, 0.45)' },
    pastel_peach: { primary: '#7d4e38', secondary: '#ebba9e', glow: 'rgba(235, 186, 158, 0.45)' },
    pastel_rose: { primary: '#704859', secondary: '#e2afc3', glow: 'rgba(226, 175, 195, 0.45)' },
    pastel_sky: { primary: '#3d5a73', secondary: '#a5c6de', glow: 'rgba(165, 198, 222, 0.45)' },
    pastel_vanilla: { primary: '#6d5a37', secondary: '#e8d49d', glow: 'rgba(232, 212, 157, 0.45)' },
    pastel_sage: { primary: '#405d4b', secondary: '#a8cbb3', glow: 'rgba(168, 203, 179, 0.45)' },
    pastel_sand: { primary: '#78583c', secondary: '#e6ccb2', glow: 'rgba(230, 204, 178, 0.45)' }
};

export function renderCssRules(selector: string, cursors: CursorDefinitionSet['cursors']): string {
    return `
${selector},
${selector} body,
${selector} header,
${selector} #app-header,
${selector} .top-panel-unified,
${selector} .app-region-drag,
${selector} .app-region-no-drag,
${selector} #app-header * {
    cursor: ${cursors.default} !important;
}

/* Common interactive elements & header controls */
${selector} button:not(:disabled),
${selector} a,
${selector} [role="button"],
${selector} select,
${selector} .cursor-pointer,
${selector} [data-clickable="true"],
${selector} #app-header button:not(:disabled),
${selector} #app-header a,
${selector} #app-header [role="button"],
${selector} #app-header .cursor-pointer {
    cursor: ${cursors.pointer} !important;
}

/* Text inputs & textareas */
${selector} input[type="text"],
${selector} input[type="search"],
${selector} input[type="number"],
${selector} input[type="password"],
${selector} input[type="email"],
${selector} textarea,
${selector} [contenteditable="true"],
${selector} .cursor-text {
    cursor: ${cursors.text} !important;
}

/* Scrollbars & scrollbar thumb (Show normal arrow cursor on scrollbar hover) */
${selector} ::-webkit-scrollbar,
${selector} ::-webkit-scrollbar-track,
${selector} ::-webkit-scrollbar-thumb,
${selector} ::-webkit-scrollbar-corner,
${selector} textarea::-webkit-scrollbar,
${selector} textarea::-webkit-scrollbar-track,
${selector} textarea::-webkit-scrollbar-thumb,
${selector} textarea::-webkit-scrollbar-corner {
    cursor: ${cursors.default} !important;
}

/* Grabbable elements / Pan canvas */
${selector} .cursor-grab,
${selector} [data-tool="pan"],
${selector} .canvas-panning-ready {
    cursor: ${cursors.grab} !important;
}

${selector} .cursor-grabbing,
${selector} .canvas-is-panning,
${selector} .dragging-node {
    cursor: ${cursors.grabbing} !important;
}

/* Crosshair / Precision tools */
${selector} .cursor-crosshair,
${selector} [data-tool="select"],
${selector} [data-tool="area-select"] {
    cursor: ${cursors.crosshair} !important;
}

/* Move / Translate elements */
${selector} .cursor-move,
${selector} [data-action="move"] {
    cursor: ${cursors.move} !important;
}

/* Resizers */
${selector} .cursor-ew-resize,
${selector} [data-resize="ew"],
${selector} [data-handle="ew"] {
    cursor: ${cursors.ewResize} !important;
}

${selector} .cursor-ns-resize,
${selector} [data-resize="ns"],
${selector} [data-handle="ns"] {
    cursor: ${cursors.nsResize} !important;
}

${selector} .cursor-nwse-resize,
${selector} [data-resize="nwse"],
${selector} [data-handle="nwse"] {
    cursor: ${cursors.nwseResize} !important;
}

${selector} .cursor-nesw-resize,
${selector} [data-resize="nesw"],
${selector} [data-handle="nesw"] {
    cursor: ${cursors.neswResize} !important;
}

/* Custom Workflow Tools */
${selector} [data-tool="cutter"],
${selector} .tool-active-cutter {
    cursor: ${cursors.cutter} !important;
}

${selector} [data-tool="reroute"],
${selector} .tool-active-reroute {
    cursor: ${cursors.reroute} !important;
}

/* Disabled / Not Allowed */
${selector} :disabled,
${selector} .cursor-not-allowed,
${selector} [aria-disabled="true"] {
    cursor: ${cursors.notAllowed} !important;
}

/* Loading / Waiting */
${selector} .cursor-wait,
${selector} [data-loading="true"],
${selector} .is-loading {
    cursor: ${cursors.wait} !important;
}
`;
}
