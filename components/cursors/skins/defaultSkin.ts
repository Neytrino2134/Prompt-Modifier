import { CursorDefinitionSet } from '../types';

export const defaultSkin: CursorDefinitionSet = {
    id: 'default',
    nameKey: 'settings.cursorSkin.default',
    descKey: 'settings.cursorSkin.defaultDesc',
    accentColor: '#94a3b8',
    glowColor: 'transparent',
    cursors: {
        default: 'default',
        pointer: 'pointer',
        grab: 'grab',
        grabbing: 'grabbing',
        text: 'text',
        crosshair: 'crosshair',
        ewResize: 'ew-resize',
        nsResize: 'ns-resize',
        nwseResize: 'nwse-resize',
        neswResize: 'nesw-resize',
        move: 'move',
        cutter: 'crosshair',
        reroute: 'crosshair',
        notAllowed: 'not-allowed',
        wait: 'wait'
    },
    rawSvgs: {
        default: `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' stroke-width='2'><path d='M3 3l7 18 3-7 7-3L3 3z'/></svg>`,
        pointer: `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' stroke-width='2'><path d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'/></svg>`,
        grab: `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' stroke-width='2'><path d='M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0'/><path d='M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2'/><path d='M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8'/><path d='M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15'/></svg>`,
        grabbing: `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' stroke-width='2'><circle cx='12' cy='12' r='8'/></svg>`,
        text: `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' stroke-width='2'><path d='M4 7V4h16v3M9 20h6M12 4v16'/></svg>`,
        crosshair: `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' stroke-width='2'><circle cx='12' cy='12' r='10'/><line x1='22' y1='12' x2='18' y2='12'/><line x1='6' y1='12' x2='2' y2='12'/><line x1='12' y1='6' x2='12' y2='2'/><line x1='12' y1='22' x2='12' y2='18'/></svg>`,
        cutter: `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' stroke-width='2'><circle cx='6' cy='6' r='3'/><circle cx='6' cy='18' r='3'/><line x1='20' y1='4' x2='8.12' y2='15.88'/><line x1='14.47' y1='14.48' x2='20' y2='20'/><line x1='8.12' y1='8.12' x2='12' y2='12'/></svg>`,
        reroute: `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' stroke-width='2'><rect x='5' y='6' width='14' height='12' rx='3'/><circle cx='4' cy='12' r='2'/><circle cx='20' cy='12' r='2'/><path d='M10 9l3 3-3 3M13 9l3 3-3 3'/></svg>`
    }
};
