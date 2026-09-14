import { CursorDefinitionSet } from '../types';
import { buildToySvgSet } from './baseToySet';

export const toyBubblegumSkin: CursorDefinitionSet = {
    id: 'toy_bubblegum',
    nameKey: 'settings.cursorSkin.toy_bubblegum',
    descKey: 'settings.cursorSkin.toy_bubblegumDesc',
    accentColor: '#f472b6',
    glowColor: 'rgba(244, 114, 182, 0.5)',
    ...buildToySvgSet({
        id: 'toy-bubblegum',
        outerColor: '#be185d', // Strawberry candy shell
        innerColor: '#f472b6', // Pastel bubblegum pink inlay
        accentColor: '#f472b6'
    })
};
