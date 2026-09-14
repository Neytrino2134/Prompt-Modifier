import { CursorDefinitionSet } from '../types';
import { buildToySvgSet } from './baseToySet';

export const toyMintSkin: CursorDefinitionSet = {
    id: 'toy_mint',
    nameKey: 'settings.cursorSkin.toy_mint',
    descKey: 'settings.cursorSkin.toy_mintDesc',
    accentColor: '#34d399',
    glowColor: 'rgba(52, 211, 153, 0.5)',
    ...buildToySvgSet({
        id: 'toy-mint',
        outerColor: '#047857', // Forest mint toy shell
        innerColor: '#34d399', // Fresh pastel mint inlay
        accentColor: '#34d399'
    })
};
