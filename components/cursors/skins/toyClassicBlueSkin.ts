import { CursorDefinitionSet } from '../types';
import { buildToySvgSet } from './baseToySet';

export const toyClassicBlueSkin: CursorDefinitionSet = {
    id: 'toy_classic_blue',
    nameKey: 'settings.cursorSkin.toy_classic_blue',
    descKey: 'settings.cursorSkin.toy_classic_blueDesc',
    accentColor: '#688fae',
    glowColor: 'rgba(104, 143, 174, 0.5)',
    ...buildToySvgSet({
        id: 'toy-classic-blue',
        outerColor: '#3c5874', // Soft slate-blue toy shell
        innerColor: '#6e93b4', // Gentle blue-gray toy inlay
        accentColor: '#6e93b4'
    })
};
