import { afterEach, describe, expect, it } from 'vitest';
import {
  createHelloCubePanel,
  ensureHelloCubeUiStyles,
  getHelloCubeSceneCopy,
  listHelloCubeRouteEntries,
} from '../src/helloCubePresentation.js';

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('listHelloCubeRouteEntries', () => {
  it('returns the shipped scene order for the title flow', () => {
    expect(listHelloCubeRouteEntries().map((entry) => entry.sceneName)).toEqual([
      'gameplay',
      'physics',
      'fps-test',
      'multiplayer',
    ]);
  });
});

describe('getHelloCubeSceneCopy', () => {
  it('returns the shared Stage 21 metadata for known scenes', () => {
    const gameplay = getHelloCubeSceneCopy('gameplay');

    expect(gameplay.displayName).toBe('Sanctum Walkthrough');
    expect(gameplay.recommended).toBe(true);
    expect(gameplay.hotkeyCodes).toEqual(['Enter', 'NumpadEnter']);
    expect(gameplay.badges).toContain('Preload');
  });

  it('falls back to a readable label for unknown scenes', () => {
    expect(getHelloCubeSceneCopy('boss-rush')).toMatchObject({
      displayName: 'Boss Rush',
      menuLabel: 'Boss Rush',
      badges: ['Scene'],
    });
  });
});

describe('ensureHelloCubeUiStyles', () => {
  it('injects the shared style tag only once', () => {
    ensureHelloCubeUiStyles();
    ensureHelloCubeUiStyles();

    expect(document.head.querySelectorAll('#arcane-hello-cube-ui')).toHaveLength(1);
  });
});

describe('createHelloCubePanel', () => {
  it('creates a reusable scene panel with optional footer and badges', () => {
    const panel = createHelloCubePanel({
      eyebrow: 'Start Here',
      title: 'Sanctum Walkthrough',
      body: 'Walk the room and wake the beacon.',
      footer: 'Esc returns to the command deck.',
      badges: ['Textures', 'Animation'],
    });

    expect(panel.root.className).toContain('arcane-ui-panel');
    expect(panel.title.textContent).toBe('Sanctum Walkthrough');
    expect(panel.body.textContent).toBe('Walk the room and wake the beacon.');
    expect(panel.footer?.textContent).toBe('Esc returns to the command deck.');
    expect(panel.root.textContent).toContain('Textures');
    expect(panel.root.textContent).toContain('Animation');
  });
});
