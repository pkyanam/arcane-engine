export interface ScenePreloadProgress {
  loaded: number;
  total: number;
  label?: string;
}

export interface ScenePreloadContext {
  reportProgress?: (progress: ScenePreloadProgress) => void;
}

export interface ScenePreloadOverlayHandle {
  begin: (sceneName: string) => ScenePreloadContext;
  finish: () => void;
}

function formatSceneLabel(sceneName: string): string {
  return sceneName
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Create a tiny DOM overlay that reports scene preload progress.
 */
export function createScenePreloadOverlay(): ScenePreloadOverlayHandle {
  if (typeof document === 'undefined') {
    return {
      begin: () => ({}),
      finish: () => {},
    };
  }

  const root = document.createElement('div');
  root.style.position = 'fixed';
  root.style.inset = '0';
  root.style.display = 'grid';
  root.style.placeItems = 'center';
  root.style.pointerEvents = 'none';
  root.style.zIndex = '20';
  root.style.background =
    'radial-gradient(circle at top, rgba(45, 212, 191, 0.16), transparent 32%), rgba(2, 6, 23, 0.78)';
  root.style.backdropFilter = 'blur(12px)';

  const panel = document.createElement('div');
  panel.style.width = 'min(420px, calc(100vw - 32px))';
  panel.style.padding = '20px 22px';
  panel.style.borderRadius = '24px';
  panel.style.border = '1px solid rgba(94, 234, 212, 0.22)';
  panel.style.background = 'rgba(15, 23, 42, 0.88)';
  panel.style.boxShadow = '0 22px 56px rgba(2, 6, 23, 0.4)';
  panel.style.fontFamily = '"Avenir Next", "Segoe UI", sans-serif';
  panel.style.color = '#e2e8f0';

  const eyebrow = document.createElement('p');
  eyebrow.textContent = 'Arcane Engine';
  eyebrow.style.margin = '0 0 8px';
  eyebrow.style.fontSize = '12px';
  eyebrow.style.fontWeight = '700';
  eyebrow.style.letterSpacing = '0.24em';
  eyebrow.style.textTransform = 'uppercase';
  eyebrow.style.color = '#5eead4';

  const title = document.createElement('h2');
  title.style.margin = '0';
  title.style.fontSize = '30px';
  title.style.lineHeight = '1.1';

  const body = document.createElement('p');
  body.style.margin = '10px 0 0';
  body.style.fontSize = '14px';
  body.style.lineHeight = '1.6';
  body.style.color = '#cbd5e1';

  const meter = document.createElement('p');
  meter.style.margin = '10px 0 0';
  meter.style.fontSize = '12px';
  meter.style.letterSpacing = '0.06em';
  meter.style.textTransform = 'uppercase';
  meter.style.color = '#99f6e4';

  panel.append(eyebrow, title, body, meter);
  root.appendChild(panel);

  const mount = (): void => {
    if (!root.parentElement) {
      document.body.appendChild(root);
    }
  };

  const unmount = (): void => {
    root.remove();
  };

  return {
    begin(sceneName: string): ScenePreloadContext {
      title.textContent = `Loading ${formatSceneLabel(sceneName)}`;
      body.textContent = 'Preparing scene assets before setup runs.';
      meter.textContent = 'Ready to preload';
      mount();

      return {
        reportProgress(progress) {
          const total = Math.max(progress.total, 1);
          body.textContent = progress.label ?? 'Preparing scene assets.';
          meter.textContent = `${progress.loaded}/${total} assets`;
        },
      };
    },
    finish() {
      unmount();
    },
  };
}
