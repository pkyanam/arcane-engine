import { defineComponent } from '@arcane-engine/core';
import type { Entity } from '@arcane-engine/core';

/**
 * Internal component mirrors used to interoperate with other Arcane packages
 * without creating hard runtime dependencies. The core ECS matches components
 * by name, so these shapes are compatible with the exported components from
 * `@arcane-engine/input`, `@arcane-engine/renderer`, and `@arcane-engine/physics`.
 */

export const InputStateRef = defineComponent<{
  keys: Set<string>;
}>('InputState', () => ({
  keys: new Set<string>(),
}));

export const FPSCameraRef = defineComponent<{
  yaw: number;
  pitch: number;
  height: number;
}>('FPSCamera', () => ({ yaw: 0, pitch: 0, height: 1.6 }));

export const PositionRef = defineComponent<{
  x: number;
  y: number;
  z: number;
}>('Position', () => ({ x: 0, y: 0, z: 0 }));

export const RotationRef = defineComponent<{
  x: number;
  y: number;
  z: number;
}>('Rotation', () => ({ x: 0, y: 0, z: 0 }));

export const TriggerVolumeRef = defineComponent<{
  shape: 'box' | 'sphere';
  hx: number;
  hy: number;
  hz: number;
  radius: number;
  entities: Set<Entity>;
  entered: Set<Entity>;
  exited: Set<Entity>;
}>('TriggerVolume', () => ({
  shape: 'box',
  hx: 0.5,
  hy: 0.5,
  hz: 0.5,
  radius: 0.5,
  entities: new Set<Entity>(),
  entered: new Set<Entity>(),
  exited: new Set<Entity>(),
}));
