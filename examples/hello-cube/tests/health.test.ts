import { describe, expect, it } from 'vitest';
import { Damage } from '../src/components/damage.js';
import { Health } from '../src/components/health.js';
import { HitFlash } from '../src/components/hitFlash.js';

describe('Health', () => {
  it('defaults to 3 / 3', () => {
    expect(Health.default()).toEqual({ current: 3, max: 3 });
  });
});

describe('Damage', () => {
  it('defaults amount to 1', () => {
    expect(Damage.default()).toEqual({ amount: 1 });
  });
});

describe('HitFlash', () => {
  it('stores restore hex', () => {
    expect(HitFlash.default()).toEqual({ restoreColorHex: 0xffffff });
  });
});
