
import { Point } from '../../../types';

export interface Joint {
    id: number;
    name: string;
    x: number;
    y: number;
    color: string;
    parent?: number;
    isFixed?: boolean;
}

export interface Bone {
    from: number;
    to: number;
    color: string;
}

// Initial Keypoints based on OpenPose
export const INITIAL_JOINTS: Joint[] = [
    { id: 0, name: 'Nose', x: 0.5, y: 0.15, color: '#ff0000' },
    { id: 1, name: 'Neck', x: 0.5, y: 0.25, color: '#ff5500', isFixed: true },
    { id: 2, name: 'RShoulder', x: 0.4, y: 0.25, color: '#ffaa00', parent: 1 },
    { id: 3, name: 'RElbow', x: 0.35, y: 0.4, color: '#ffff00', parent: 2 },
    { id: 4, name: 'RWrist', x: 0.3, y: 0.55, color: '#aaff00', parent: 3 },
    { id: 5, name: 'LShoulder', x: 0.6, y: 0.25, color: '#55ff00', parent: 1 },
    { id: 6, name: 'LElbow', x: 0.65, y: 0.4, color: '#00ff00', parent: 5 },
    { id: 7, name: 'LWrist', x: 0.7, y: 0.55, color: '#00ff55', parent: 6 },
    { id: 8, name: 'RHip', x: 0.45, y: 0.55, color: '#00ffaa', parent: 1 },
    { id: 9, name: 'RKnee', x: 0.45, y: 0.75, color: '#00ffff', parent: 8 },
    { id: 10, name: 'RAnkle', x: 0.45, y: 0.95, color: '#00aaff', parent: 9 },
    { id: 11, name: 'LHip', x: 0.55, y: 0.55, color: '#0055ff', parent: 1 },
    { id: 12, name: 'LKnee', x: 0.55, y: 0.75, color: '#0000ff', parent: 11 },
    { id: 13, name: 'LAnkle', x: 0.55, y: 0.95, color: '#5500ff', parent: 12 },
    { id: 14, name: 'REye', x: 0.48, y: 0.13, color: '#aa00ff', parent: 0 },
    { id: 15, name: 'LEye', x: 0.52, y: 0.13, color: '#ff00ff', parent: 0 },
    { id: 16, name: 'REar', x: 0.45, y: 0.14, color: '#ff00aa', parent: 14 },
    { id: 17, name: 'LEar', x: 0.55, y: 0.14, color: '#ff0055', parent: 15 },
];

export const BONES: Bone[] = [
    { from: 1, to: 2, color: '#ffaa00' }, { from: 2, to: 3, color: '#ffff00' }, { from: 3, to: 4, color: '#aaff00' }, // R Arm
    { from: 1, to: 5, color: '#55ff00' }, { from: 5, to: 6, color: '#00ff00' }, { from: 6, to: 7, color: '#00ff55' }, // L Arm
    { from: 1, to: 8, color: '#00ffaa' }, { from: 8, to: 9, color: '#00ffff' }, { from: 9, to: 10, color: '#00aaff' }, // R Leg
    { from: 1, to: 11, color: '#0055ff' }, { from: 11, to: 12, color: '#0000ff' }, { from: 12, to: 13, color: '#5500ff' }, // L Leg
    { from: 1, to: 0, color: '#ff5500' }, // Neck to Nose
    { from: 0, to: 14, color: '#aa00ff' }, { from: 14, to: 16, color: '#ff00aa' }, // R Eye
    { from: 0, to: 15, color: '#ff00ff' }, { from: 15, to: 17, color: '#ff0055' }, // L Eye
];

// Inverse Kinematics helper (simplified FABRIK for 2D limbs)
export const solveIK = (
    chain: Joint[], 
    target: Point, 
    iterations: number = 5
) => {
    if (chain.length < 2) return chain;

    const lengths: number[] = [];
    for (let i = 0; i < chain.length - 1; i++) {
        lengths.push(Math.hypot(chain[i+1].x - chain[i].x, chain[i+1].y - chain[i].y));
    }

    const rootPos = { x: chain[0].x, y: chain[0].y };
    const totalLength = lengths.reduce((a, b) => a + b, 0);
    const distToTarget = Math.hypot(target.x - rootPos.x, target.y - rootPos.y);

    // Case: Target unreachable
    if (distToTarget > totalLength) {
        for (let i = 0; i < chain.length - 1; i++) {
            const dx = target.x - chain[i].x;
            const dy = target.y - chain[i].y;
            const d = Math.hypot(dx, dy);
            const ratio = lengths[i] / d;
            chain[i+1].x = chain[i].x + dx * ratio;
            chain[i+1].y = chain[i].y + dy * ratio;
        }
        return chain;
    }

    // Case: Target reachable (FABRIK loop)
    for (let it = 0; it < iterations; it++) {
        // Backward pass
        chain[chain.length - 1].x = target.x;
        chain[chain.length - 1].y = target.y;
        for (let i = chain.length - 2; i >= 0; i--) {
            const dx = chain[i].x - chain[i+1].x;
            const dy = chain[i].y - chain[i+1].y;
            const d = Math.hypot(dx, dy);
            const ratio = lengths[i] / d;
            chain[i].x = chain[i+1].x + dx * ratio;
            chain[i].y = chain[i+1].y + dy * ratio;
        }

        // Forward pass
        chain[0].x = rootPos.x;
        chain[0].y = rootPos.y;
        for (let i = 0; i < chain.length - 1; i++) {
            const dx = chain[i+1].x - chain[i].x;
            const dy = chain[i+1].y - chain[i].y;
            const d = Math.hypot(dx, dy);
            const ratio = lengths[i] / d;
            chain[i+1].x = chain[i].x + dx * ratio;
            chain[i+1].y = chain[i].y + dy * ratio;
        }
    }

    return chain;
};
