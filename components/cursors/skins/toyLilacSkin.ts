import { CursorDefinitionSet } from '../types';
import { buildToySvgSet } from './baseToySet';

export const toyLilacSkin: CursorDefinitionSet = {
    id: 'toy_lilac',
    nameKey: 'settings.cursorSkin.toy_lilac',
    descKey: 'settings.cursorSkin.toy_lilacDesc',
    accentColor: '#c084fc',
    glowColor: 'rgba(192, 132, 252, 0.5)',
    ...buildToySvgSet({
        id: 'toy-lilac',
        outerColor: '#6b21a8', // Deep purple grape toy shell
        innerColor: '#c084fc', // Pastel lilac lavender inlay
        accentColor: '#c084fc'
    })
};
