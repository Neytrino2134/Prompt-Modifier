
import { common } from './definitions/it/common';
import { ui } from './definitions/it/ui';
import { nodes } from './definitions/it/nodes';
import { editors } from './definitions/it/editors';
import { dialogs } from './definitions/it/dialogs';
import { library } from './definitions/it/library';

export const it = {
    ...common,
    ...ui,
    ...nodes,
    ...editors,
    ...dialogs,
    ...library,
};
