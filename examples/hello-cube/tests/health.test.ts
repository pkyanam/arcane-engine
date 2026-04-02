import { describe, expect, it } from 'vitest';
import { Damage, Health } from '@arcane-engine/gameplay';
import { HitFlash } from '../src/components/hitFlash.js';

describe('Health', () => {
  it('defaults to 10 / 10', () => {
    expect(Health.default()).toEqual({ current: 10, max: 10 });
  });
});

describe('Damage', () => {
  it('defaults amount to 1 with null source', () => {
    expect(Damage.default()).toEqual({ amount: 1, source: null });
  });
});

describe('HitFlash', () => {
  it('stores restore hex', () => {
    expect(HitFlash.default()).toEqual({ restoreColorHex: 0xffffff });
  });
});
