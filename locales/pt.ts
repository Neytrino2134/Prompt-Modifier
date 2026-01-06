import { common } from './definitions/pt/common';
import { ui } from './definitions/pt/ui';
import { nodes } from './definitions/pt/nodes';
import { editors } from './definitions/pt/editors';
import { dialogs } from './definitions/pt/dialogs';
import { library } from './definitions/pt/library';

export const pt = {
    ...common,
    ...ui,
    ...nodes,
    ...editors,
    ...dialogs,
    ...library,
};