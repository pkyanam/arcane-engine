import type { ComponentType } from './component.js';

/** An entity is just an integer ID. No class, no methods. */
export type Entity = number;

/** A system is a plain function that receives the world and the frame delta (seconds). */
export type SystemFn = (world: World, dt: number) => void;

/**
 * The central ECS container.
 * Stores all entities, their component data, registered systems,
 * and the bitmask bookkeeping used for fast queries.
 */
export interface World {
  /** All live entity IDs. */
  entities: Set<Entity>;
  /** Component stores keyed by component name → (entity → data). */
  components: Map<string, Map<Entity, unknown>>;
  /** Registered systems, run in order by runSystems(). */
  systems: SystemFn[];
  /** Next entity ID to hand out. */
  nextId: number;
  /** Per-entity bitmask tracking which components are attached. */
  entityMasks: Map<Entity, bigint>;
  /** Bit assigned to each component type name. */
  componentBits: Map<string, bigint>;
  /** Next power-of-two bit to assign to a new component type. */
  nextBit: bigint;
}

/** Create a new, empty World. */
export function createWorld(): World {
  return {
    entities: new Set(),
    components: new Map(),
    systems: [],
    nextId: 0,
    entityMasks: new Map(),
    componentBits: new Map(),
    nextBit: 1n,
  };
}

/** Reset an existing world back to its initial empty state. */
export function resetWorld(world: World): void {
  world.entities.clear();
  world.components.clear();
  world.systems.length = 0;
  world.nextId = 0;
  world.entityMasks.clear();
  world.componentBits.clear();
  world.nextBit = 1n;
}

/** Allocate a new entity and return its ID. */
export function createEntity(world: World): Entity {
  const id = world.nextId++;
  world.entities.add(id);
  world.entityMasks.set(id, 0n);
  return id;
}

/**
 * Remove an entity and all of its component data from the world.
 * Safe to call on a non-existent entity (no-op).
 */
export function destroyEntity(world: World, entity: Entity): void {
  if (!world.entities.has(entity)) return;
  world.entities.delete(entity);
  world.entityMasks.delete(entity);
  for (const store of world.components.values()) {
    store.delete(entity);
  }
}

/**
 * Attach a component to an entity.
 * If the entity already has this component, its data is replaced.
 *
 * @param data  Optional partial override of the component's default values.
 */
export function addComponent<T>(
  world: World,
  entity: Entity,
  type: ComponentType<T>,
  data?: Partial<T>,
): void {
  if (!world.entities.has(entity)) {
    throw new Error(`addComponent: entity ${entity} does not exist`);
  }

  // Ensure a store exists for this component type.
  let store = world.components.get(type.name);
  if (!store) {
    store = new Map<Entity, unknown>();
    world.components.set(type.name, store);
  }

  // Merge default values with any provided overrides.
  const value: T = data ? { ...type.default(), ...data } : type.default();
  store.set(entity, value);

  // Assign a bitmask bit to this component type on first encounter.
  if (!world.componentBits.has(type.name)) {
    world.componentBits.set(type.name, world.nextBit);
    world.nextBit <<= 1n;
  }

  const bit = world.componentBits.get(type.name)!;
  world.entityMasks.set(entity, (world.entityMasks.get(entity) ?? 0n) | bit);
}

/** Remove a component from an entity. No-op if the entity lacks that component. */
export function removeComponent<T>(
  world: World,
  entity: Entity,
  type: ComponentType<T>,
): void {
  const store = world.components.get(type.name);
  if (!store?.has(entity)) return;
  store.delete(entity);

  const bit = world.componentBits.get(type.name);
  if (bit !== undefined) {
    world.entityMasks.set(entity, (world.entityMasks.get(entity) ?? 0n) & ~bit);
  }
}

/**
 * Retrieve the component data attached to an entity.
 * Returns `undefined` if the entity does not have that component.
 */
export function getComponent<T>(
  world: World,
  entity: Entity,
  type: ComponentType<T>,
): T | undefined {
  return world.components.get(type.name)?.get(entity) as T | undefined;
}

/** Return true if the entity currently has the given component attached. */
export function hasComponent<T>(
  world: World,
  entity: Entity,
  type: ComponentType<T>,
): boolean {
  return (world.components.get(type.name)?.has(entity)) ?? false;
}
