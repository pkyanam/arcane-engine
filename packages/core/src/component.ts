/** Describes a component type: its unique name and a factory for default values. */
export interface ComponentType<T> {
  readonly name: string;
  readonly default: () => T;
}

/**
 * Define a new component type.
 *
 * @param name    Unique string identifier (PascalCase by convention).
 * @param defaultFn  Factory that returns a fresh default value for this component.
 *
 * @example
 * const Position = defineComponent('Position', () => ({ x: 0, y: 0, z: 0 }));
 */
export function defineComponent<T>(
  name: string,
  defaultFn: () => T,
): ComponentType<T> {
  return { name, default: defaultFn };
}
