import { describe, expect, it, vi } from 'vitest';
import { defineComponent } from '../src/component.js';
import { createSceneManager } from '../src/scene.js';
import { createWorld, createEntity, addComponent, getComponent } from '../src/world.js';
import { registerSystem } from '../src/system.js';

const Marker = defineComponent('Marker', () => ({ value: 'unset' }));

describe('createSceneManager', () => {
  it('loads a scene by name and runs its setup', () => {
    const world = createWorld();
    const setup = vi.fn((currentWorld) => {
      const entity = createEntity(currentWorld);
      addComponent(currentWorld, entity, Marker, { value: 'title' });
    });

    const manager = createSceneManager(world, {
      title: { setup },
    });

    manager.loadScene('title');

    expect(setup).toHaveBeenCalledWith(world);
    expect(manager.getCurrentSceneName()).toBe('title');
    expect(world.entities.size).toBe(1);
  });

  it('runs teardown on the previous scene before loading the next one', () => {
    const world = createWorld();
    const teardown = vi.fn();

    const manager = createSceneManager(world, {
      title: {
        setup: () => {},
        teardown,
      },
      gameplay: {
        setup: () => {},
      },
    });

    manager.loadScene('title');
    manager.loadScene('gameplay');

    expect(teardown).toHaveBeenCalledTimes(1);
    expect(teardown).toHaveBeenCalledWith(world);
  });

  it('clears entities and systems before running the next scene setup', () => {
    const world = createWorld();
    const setupStates: Array<{ entities: number; systems: number }> = [];

    const manager = createSceneManager(world, {
      title: {
        setup: (currentWorld) => {
          setupStates.push({
            entities: currentWorld.entities.size,
            systems: currentWorld.systems.length,
          });
          createEntity(currentWorld);
          registerSystem(currentWorld, () => {});
        },
      },
      gameplay: {
        setup: (currentWorld) => {
          setupStates.push({
            entities: currentWorld.entities.size,
            systems: currentWorld.systems.length,
          });
          const entity = createEntity(currentWorld);
          addComponent(currentWorld, entity, Marker, { value: 'gameplay' });
        },
      },
    });

    manager.loadScene('title');
    manager.loadScene('gameplay');

    expect(setupStates).toEqual([
      { entities: 0, systems: 0 },
      { entities: 0, systems: 0 },
    ]);
    expect(world.entities.size).toBe(1);
    expect(world.systems).toHaveLength(0);
  });

  it('leaves the newly loaded scene state in the world after setup completes', () => {
    const world = createWorld();

    const manager = createSceneManager(world, {
      gameplay: {
        setup: (currentWorld) => {
          const entity = createEntity(currentWorld);
          addComponent(currentWorld, entity, Marker, { value: 'gameplay' });
        },
      },
    });

    manager.loadScene('gameplay');

    const [entity] = [...world.entities];
    expect(getComponent(world, entity, Marker)?.value).toBe('gameplay');
  });

  it('throws when loading an unknown scene name', () => {
    const world = createWorld();
    const manager = createSceneManager(world, {});

    expect(() => manager.loadScene('missing')).toThrow(
      'loadScene: scene "missing" is not registered',
    );
  });
});
