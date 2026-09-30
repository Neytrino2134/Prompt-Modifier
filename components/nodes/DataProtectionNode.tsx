import React from 'react';
import type { NodeContentProps } from '../../types';
import { MiniGamesNode } from './mini-games/MiniGamesNode';

export const DataProtectionNode: React.FC<NodeContentProps> = (props) => {
    return <MiniGamesNode {...props} />;
};

export { MiniGamesNode };
