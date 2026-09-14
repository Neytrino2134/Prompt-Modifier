import { CursorDefinitionSet } from '../types';
import { buildToySvgSet } from './baseToySet';

export const toyAmberSkin: CursorDefinitionSet = {
    id: 'toy_amber',
    nameKey: 'settings.cursorSkin.toy_amber',
    descKey: 'settings.cursorSkin.toy_amberDesc',
    accentColor: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.5)',
    ...buildToySvgSet({
        id: 'toy-amber',
        outerColor: '#b45309', // Amber caramel toy shell
        innerColor: '#fbbf24', // Sunny honey inlay
        accentColor: '#fbbf24'
    })
};
