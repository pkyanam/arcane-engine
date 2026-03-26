import { defineComponent } from '@arcane-engine/core';

/** Applied by {@link weaponSystem}; consumed the same tick by {@link healthSystem}. */
export const Damage = defineComponent<{ amount: number }>('Damage', () => ({ amount: 1 }));
