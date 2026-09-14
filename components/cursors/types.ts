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
    purple: { primary: '#a855f7', secondary: '#c084fc', glow: 'rgba(168, 85, 247, 0.65)' },
    pink: { primary: '#ec4899', secondary: '#f472b6', glow: 'rgba(236, 72, 153, 0.65)' },
    red: { primary: '#ef4444', secondary: '#f87171', glow: 'rgba(239, 68, 68, 0.65)' },
    orange: { primary: '#f97316', secondary: '#fb923c', glow: 'rgba(249, 115, 22, 0.65)' },
    lime: { primary: '#84cc16', secondary: '#a3e635', glow: 'rgba(132, 204, 22, 0.65)' },
    emerald: { primary: '#10b981', secondary: '#34d399', glow: 'rgba(16, 185, 129, 0.65)' },
    gray: { primary: '#9ca3af', secondary: '#d1d5db', glow: 'rgba(156, 163, 175, 0.65)' }
};

export function renderCssRules(selector: string, cursors: CursorDefinitionSet['cursors']): string {
    return `
${selector},
${selector} body {
    cursor: ${cursors.default};
}

/* Common interactive elements */
${selector} button:not(:disabled),
${selector} a,
${selector} [role="button"],
${selector} select,
${selector} .cursor-pointer,
${selector} [data-clickable="true"] {
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
