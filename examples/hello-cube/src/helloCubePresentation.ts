export interface HelloCubeSceneCopy {
  sceneName: string;
  displayName: string;
  menuLabel: string;
  eyebrow: string;
  summary: string;
  controlHint: string;
  hotkeyCodes: readonly string[];
  hotkeyLabel: string;
  badges: readonly string[];
  recommended?: boolean;
}

export interface CreateHelloCubePanelOptions {
  eyebrow?: string;
  title: string;
  body: string;
  footer?: string;
  badges?: readonly string[];
  titleLevel?: 1 | 2 | 3;
}

export interface HelloCubePanelElements {
  root: HTMLDivElement;
  title: HTMLHeadingElement;
  body: HTMLParagraphElement;
  footer?: HTMLParagraphElement;
}

const HELLO_CUBE_SCENE_COPIES: Record<string, HelloCubeSceneCopy> = {
  title: {
    sceneName: 'title',
    displayName: 'Command Deck',
    menuLabel: 'Title',
    eyebrow: 'Arcane Engine',
    summary:
      'A small teaching vertical slice that walks from polished environment setup into first-person combat and relay multiplayer.',
    controlHint:
      'Choose a route with Enter, P, F, or M. Click any card to jump straight into that scene.',
    hotkeyCodes: [],
    hotkeyLabel: '',
    badges: ['Vertical Slice', 'ECS', 'Three.js'],
  },
  gameplay: {
    sceneName: 'gameplay',
    displayName: 'Sanctum Walkthrough',
    menuLabel: 'Play',
    eyebrow: 'Start Here',
    summary:
      'Learn the Stage 15-19 path in one room: textured walls, imported crystals, a live animated beacon, and explicit scene preload before setup.',
    controlHint:
      'Move with WASD or arrows. Walk the room, inspect the imported props, and step near the center beacon to switch from Idle to Activate. Esc returns to the command deck.',
    hotkeyCodes: ['Enter', 'NumpadEnter'],
    hotkeyLabel: 'Enter',
    badges: ['Textures', 'Models', 'Animation', 'Preload'],
    recommended: true,
  },
  physics: {
    sceneName: 'physics',
    displayName: 'Physics Sandbox',
    menuLabel: 'Physics',
    eyebrow: 'System Focus',
    summary:
      'A clean Rapier slice with fixed colliders, dynamic bodies, and a readable camera that lets the simulation speak for itself.',
    controlHint: 'Watch the stack settle and bounce. Esc returns to the command deck.',
    hotkeyCodes: ['KeyP'],
    hotkeyLabel: 'P',
    badges: ['Rapier', 'Rigid Bodies'],
  },
  'fps-test': {
    sceneName: 'fps-test',
    displayName: 'Target Range',
    menuLabel: 'FPS',
    eyebrow: 'First Person',
    summary:
      'The shared FPS arena proves local movement, jump, combat, HUD, damage zones, and respawn flow without leaving the teaching slice.',
    controlHint:
      'Click the canvas to capture the mouse. WASD moves, Space jumps, left click fires, R respawns after death, and Esc returns to the command deck.',
    hotkeyCodes: ['KeyF'],
    hotkeyLabel: 'F',
    badges: ['FPS', 'Combat', 'HUD'],
  },
  multiplayer: {
    sceneName: 'multiplayer',
    displayName: 'Relay Arena',
    menuLabel: 'Multi',
    eyebrow: 'Play Together',
    summary:
      'The same FPS slice, now with a tiny relay: smoothed remote ghosts, HUD relay health, ping, and bounded reconnect behavior.',
    controlHint:
      'Run the relay with pnpm --filter @arcane-engine/server start. Click the canvas to capture the mouse, then play like Target Range. Esc returns to the command deck.',
    hotkeyCodes: ['KeyM'],
    hotkeyLabel: 'M',
    badges: ['Multiplayer', 'Ghost Smoothing', 'Ping'],
  },
};

const ROUTE_ENTRY_ORDER = ['gameplay', 'physics', 'fps-test', 'multiplayer'] as const;
const UI_STYLE_ID = 'arcane-hello-cube-ui';

/**
 * Returns the ordered routes shown on the hello-cube title screen and touch menu.
 */
export function listHelloCubeRouteEntries(): readonly HelloCubeSceneCopy[] {
  return ROUTE_ENTRY_ORDER.map((sceneName) => HELLO_CUBE_SCENE_COPIES[sceneName]);
}

/**
 * Returns scene-facing copy used across title, preload, and in-scene overlays.
 */
export function getHelloCubeSceneCopy(sceneName: string): HelloCubeSceneCopy {
  const known = HELLO_CUBE_SCENE_COPIES[sceneName];
  if (known) {
    return known;
  }

  const fallbackLabel = sceneName
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return {
    sceneName,
    displayName: fallbackLabel,
    menuLabel: fallbackLabel,
    eyebrow: 'Arcane Engine',
    summary: `${fallbackLabel} is part of the hello-cube teaching slice.`,
    controlHint: `${fallbackLabel} is active.`,
    hotkeyCodes: [],
    hotkeyLabel: '',
    badges: ['Scene'],
  };
}

/**
 * Injects the shared hello-cube presentation styles once.
 */
export function ensureHelloCubeUiStyles(): void {
  if (typeof document === 'undefined') {
    return;
  }

  if (document.getElementById(UI_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = UI_STYLE_ID;
  style.textContent = `
:root {
  --arcane-ui-font: "Avenir Next", "Segoe UI", system-ui, sans-serif;
  --arcane-ui-text: #e2e8f0;
  --arcane-ui-muted: #cbd5e1;
  --arcane-ui-soft: rgba(226, 232, 240, 0.72);
  --arcane-ui-accent: #7dd3fc;
  --arcane-ui-accent-strong: #38bdf8;
  --arcane-ui-shell: rgba(15, 23, 42, 0.8);
  --arcane-ui-shell-strong: rgba(15, 23, 42, 0.92);
  --arcane-ui-shell-soft: rgba(15, 118, 110, 0.18);
  --arcane-ui-border: rgba(125, 211, 252, 0.24);
  --arcane-ui-shadow: 0 18px 48px rgba(2, 6, 23, 0.42);
}

.arcane-ui-overlay {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: clamp(20px, 3vw, 32px);
  background:
    radial-gradient(circle at top, rgba(34, 211, 238, 0.18), transparent 32%),
    radial-gradient(circle at 20% 20%, rgba(56, 189, 248, 0.12), transparent 26%),
    linear-gradient(180deg, rgba(8, 47, 73, 0.5), rgba(15, 23, 42, 0.9) 58%, rgba(2, 6, 23, 0.98));
  backdrop-filter: blur(16px);
  color: var(--arcane-ui-text);
  font-family: var(--arcane-ui-font);
}

.arcane-ui-overlay__stack {
  display: grid;
  gap: 18px;
  width: min(1080px, 100%);
}

.arcane-ui-panel {
  display: grid;
  gap: 10px;
  padding: 20px 22px;
  border-radius: 24px;
  border: 1px solid var(--arcane-ui-border);
  background:
    linear-gradient(145deg, rgba(15, 23, 42, 0.86), rgba(15, 118, 110, 0.2)),
    rgba(15, 23, 42, 0.86);
  box-shadow: var(--arcane-ui-shadow);
  backdrop-filter: blur(14px);
  color: var(--arcane-ui-text);
}

.arcane-ui-panel__eyebrow {
  margin: 0;
  color: var(--arcane-ui-accent);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.26em;
  text-transform: uppercase;
}

.arcane-ui-panel__title {
  margin: 0;
  font-size: clamp(24px, 3vw, 34px);
  line-height: 1.06;
}

.arcane-ui-panel__body,
.arcane-ui-panel__footer,
.arcane-ui-panel__meta {
  margin: 0;
  color: var(--arcane-ui-muted);
  font-size: 14px;
  line-height: 1.6;
}

.arcane-ui-panel__meta {
  color: var(--arcane-ui-soft);
  font-size: 12px;
  letter-spacing: 0.04em;
}

.arcane-ui-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.arcane-ui-badge {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(125, 211, 252, 0.26);
  background: rgba(15, 23, 42, 0.48);
  color: #e0f2fe;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.arcane-ui-badge[data-emphasis="true"] {
  background: rgba(56, 189, 248, 0.18);
  border-color: rgba(125, 211, 252, 0.4);
  color: #bae6fd;
}

.arcane-ui-scene-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.arcane-ui-scene-button {
  appearance: none;
  display: grid;
  gap: 10px;
  align-content: start;
  min-height: 196px;
  padding: 18px;
  border-radius: 22px;
  border: 1px solid rgba(125, 211, 252, 0.18);
  background:
    linear-gradient(155deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.78)),
    rgba(15, 23, 42, 0.88);
  color: var(--arcane-ui-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 16px 40px rgba(2, 6, 23, 0.32);
  transition:
    transform 120ms ease,
    border-color 120ms ease,
    background 120ms ease;
}

.arcane-ui-scene-button:hover,
.arcane-ui-scene-button:focus-visible {
  transform: translateY(-2px);
  border-color: rgba(125, 211, 252, 0.38);
  background:
    linear-gradient(155deg, rgba(15, 23, 42, 0.96), rgba(8, 47, 73, 0.72)),
    rgba(15, 23, 42, 0.9);
}

.arcane-ui-scene-button__topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.arcane-ui-scene-button__eyebrow {
  margin: 0;
  color: var(--arcane-ui-accent);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.arcane-ui-scene-button__key {
  padding: 5px 8px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.36);
  color: #f8fafc;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.arcane-ui-scene-button__title {
  margin: 0;
  font-size: 22px;
  line-height: 1.08;
}

.arcane-ui-scene-button__summary {
  margin: 0;
  color: var(--arcane-ui-muted);
  font-size: 13px;
  line-height: 1.6;
}
`;
  document.head.appendChild(style);
}

/**
 * Creates a shared glass-panel shell used by the Stage 21 title and in-scene overlays.
 */
export function createHelloCubePanel(
  options: CreateHelloCubePanelOptions,
): HelloCubePanelElements {
  ensureHelloCubeUiStyles();

  const root = document.createElement('div');
  root.className = 'arcane-ui-panel';

  if (options.eyebrow) {
    const eyebrow = document.createElement('p');
    eyebrow.className = 'arcane-ui-panel__eyebrow';
    eyebrow.textContent = options.eyebrow;
    root.appendChild(eyebrow);
  }

  const titleTag = `h${options.titleLevel ?? 2}` as keyof HTMLElementTagNameMap;
  const title = document.createElement(titleTag) as HTMLHeadingElement;
  title.className = 'arcane-ui-panel__title';
  title.textContent = options.title;
  root.appendChild(title);

  const body = document.createElement('p');
  body.className = 'arcane-ui-panel__body';
  body.textContent = options.body;
  root.appendChild(body);

  if (options.badges?.length) {
    const badges = document.createElement('div');
    badges.className = 'arcane-ui-badges';

    for (const label of options.badges) {
      const badge = document.createElement('span');
      badge.className = 'arcane-ui-badge';
      badge.textContent = label;
      badges.appendChild(badge);
    }

    root.appendChild(badges);
  }

  let footer: HTMLParagraphElement | undefined;
  if (options.footer) {
    footer = document.createElement('p');
    footer.className = 'arcane-ui-panel__footer';
    footer.textContent = options.footer;
    root.appendChild(footer);
  }

  return { root, title, body, footer };
}
