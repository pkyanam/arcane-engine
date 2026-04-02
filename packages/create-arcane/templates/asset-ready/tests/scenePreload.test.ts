import { afterEach, describe, expect, it } from 'vitest';
import { createScenePreloadOverlay } from '../src/runtime/scenePreload.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('createScenePreloadOverlay', () => {
  it('shows progress for the active scene and removes the overlay when finished', () => {
    const overlay = createScenePreloadOverlay();

    const preloadContext = overlay.begin('gameplay');
    preloadContext.reportProgress?.({
      loaded: 2,
      total: 4,
      label: 'Loaded model "beacon".',
    });

    expect(document.body.textContent).toContain('Loading Gameplay');
    expect(document.body.textContent).toContain('Loaded model "beacon".');
    expect(document.body.textContent).toContain('2/4 assets');

    overlay.finish();

    expect(document.body.textContent ?? '').toBe('');
  });
});
