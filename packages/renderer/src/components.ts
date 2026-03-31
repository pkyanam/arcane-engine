import type { Object3D } from 'three';
import { defineComponent } from '@arcane-engine/core';

/** World-space position in metres. */
export const Position = defineComponent('Position', () => ({ x: 0, y: 0, z: 0 }));

/** Euler rotation in radians (XYZ order). */
export const Rotation = defineComponent('Rotation', () => ({ x: 0, y: 0, z: 0 }));

/** Uniform scale per axis (1 = no scaling). */
export const Scale = defineComponent('Scale', () => ({ x: 1, y: 1, z: 1 }));

/** Reference to the Three.js object root managed by the render system. */
export const MeshRef = defineComponent<{ mesh: Object3D | null }>('MeshRef', () => ({ mesh: null }));

/** Auto-rotation descriptor consumed by spinSystem. */
export const Spin = defineComponent<{ axis: 'x' | 'y' | 'z'; speed: number }>(
  'Spin',
  () => ({ axis: 'y' as const, speed: 1 }),
);
