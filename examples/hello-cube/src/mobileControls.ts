import { getComponent, query } from '@arcane-engine/core';
import type { World } from '@arcane-engine/core';
import { InputState } from '@arcane-engine/input';
import { listHelloCubeRouteEntries } from './helloCubePresentation.js';
import { getGameContext } from './runtime/gameContext.js';
import { requestSceneChange } from './runtime/sceneTransitions.js';

const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD'] as const;

let worldRef: World | null = null;

function wantsTouchUi(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

function currentScene(): string | undefined {
  try {
    return getGameContext().getCurrentSceneName();
  } catch {
    return undefined;
  }
}

function isFpsScene(name: string | undefined): boolean {
  return name === 'fps-test' || name === 'multiplayer';
}

function getInput(world: World) {
  const ent = query(world, [InputState])[0];
  if (ent === undefined) return undefined;
  return getComponent(world, ent, InputState);
}

const stick = {
  touchId: null as number | null,
  nx: 0,
  ny: 0,
  maxR: 52,
};

const look = {
  touchId: null as number | null,
  lastX: 0,
  lastY: 0,
  /** Pixel deltas; applied to {@link InputState.mouse} like real mouse movement. */
  accDx: 0,
  accDy: 0,
};

let root: HTMLDivElement | null = null;
let panelTitle: HTMLDivElement | null = null;
let panelPlay: HTMLDivElement | null = null;
let stickKnob: HTMLDivElement | null = null;
let lookZone: HTMLDivElement | null = null;
let btnJump: HTMLButtonElement | null = null;
let btnFire: HTMLButtonElement | null = null;
let btnRespawn: HTMLButtonElement | null = null;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

function updatePanels(): void {
  const scene = currentScene();
  const title = scene === 'title' || scene === undefined;
  const fps = isFpsScene(scene);

  if (panelTitle) panelTitle.style.display = title ? 'flex' : 'none';
  if (panelPlay) panelPlay.style.display = title ? 'none' : 'flex';
  if (lookZone) lookZone.style.display = fps ? 'flex' : 'none';
  if (btnJump) btnJump.style.display = fps ? 'flex' : 'none';
  if (btnFire) btnFire.style.display = fps ? 'flex' : 'none';
  if (btnRespawn) btnRespawn.style.display = fps ? 'flex' : 'none';
}

function bindStick(zone: HTMLElement, knob: HTMLElement): void {
  const rect = () => zone.getBoundingClientRect();

  const placeKnob = (clientX: number, clientY: number): void => {
    const r = rect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const len = Math.hypot(dx, dy) || 1;
    if (len > stick.maxR) {
      dx = (dx / len) * stick.maxR;
      dy = (dy / len) * stick.maxR;
    }
    stick.nx = dx / stick.maxR;
    stick.ny = dy / stick.maxR;
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  };

  const resetKnob = (): void => {
    stick.nx = 0;
    stick.ny = 0;
    stick.touchId = null;
    knob.style.transform = 'translate(-50%, -50%)';
  };

  zone.addEventListener(
    'touchstart',
    (e) => {
      if (stick.touchId !== null) return;
      e.preventDefault();
      const t = e.changedTouches[0];
      if (!t) return;
      stick.touchId = t.identifier;
      placeKnob(t.clientX, t.clientY);
    },
    { passive: false },
  );

  zone.addEventListener(
    'touchmove',
    (e) => {
      if (stick.touchId === null) return;
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t && t.identifier === stick.touchId) {
          placeKnob(t.clientX, t.clientY);
          break;
        }
      }
    },
    { passive: false },
  );

  const endStick = (e: TouchEvent): void => {
    if (stick.touchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t && t.identifier === stick.touchId) {
        resetKnob();
        break;
      }
    }
  };

  zone.addEventListener('touchend', endStick);
  zone.addEventListener('touchcancel', endStick);
}

function bindLook(zone: HTMLElement): void {
  zone.addEventListener(
    'touchstart',
    (e) => {
      if (look.touchId !== null) return;
      e.preventDefault();
      const t = e.changedTouches[0];
      if (!t) return;
      look.touchId = t.identifier;
      look.lastX = t.clientX;
      look.lastY = t.clientY;
    },
    { passive: false },
  );

  zone.addEventListener(
    'touchmove',
    (e) => {
      if (look.touchId === null) return;
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t && t.identifier === look.touchId) {
          look.accDx += t.clientX - look.lastX;
          look.accDy += t.clientY - look.lastY;
          look.lastX = t.clientX;
          look.lastY = t.clientY;
          break;
        }
      }
    },
    { passive: false },
  );

  const endLook = (e: TouchEvent): void => {
    if (look.touchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t && t.identifier === look.touchId) {
        look.touchId = null;
        break;
      }
    }
  };

  zone.addEventListener('touchend', endLook);
  zone.addEventListener('touchcancel', endLook);
}

function bindHoldKey(btn: HTMLButtonElement, code: string): void {
  const apply = (add: boolean): void => {
    const w = worldRef;
    if (!w) return;
    const st = getInput(w);
    if (!st) return;
    if (add) st.keys.add(code);
    else st.keys.delete(code);
  };
  btn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    apply(true);
  }, { passive: false });
  btn.addEventListener('touchend', (e) => {
    e.preventDefault();
    apply(false);
  });
  btn.addEventListener('touchcancel', () => apply(false));
}

function bindFire(btn: HTMLButtonElement): void {
  const apply = (down: boolean): void => {
    const w = worldRef;
    if (!w) return;
    const st = getInput(w);
    if (!st) return;
    if (down) st.mouseButtons.add(0);
    else st.mouseButtons.delete(0);
  };
  btn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    apply(true);
  }, { passive: false });
  btn.addEventListener('touchend', (e) => {
    e.preventDefault();
    apply(false);
  });
  btn.addEventListener('touchcancel', () => apply(false));
}

function injectStyles(): void {
  if (document.getElementById('arcane-mobile-styles')) return;
  const s = document.createElement('style');
  s.id = 'arcane-mobile-styles';
  s.textContent = `
#arcane-mobile {
  position: fixed;
  inset: 0;
  z-index: 120;
  pointer-events: none;
  font-family: system-ui, -apple-system, sans-serif;
  -webkit-tap-highlight-color: transparent;
}
.arcane-mobile__menu-top {
  pointer-events: auto;
  position: absolute;
  top: max(12px, env(safe-area-inset-top));
  right: max(12px, env(safe-area-inset-right));
  min-width: 72px;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(148,163,184,0.5);
  background: rgba(15,23,42,0.82);
  color: #e2e8f0;
  font-size: 14px;
  font-weight: 600;
  display: none;
}
#arcane-mobile[data-show-menu="1"] .arcane-mobile__menu-top { display: block; }
.arcane-mobile__panel {
  pointer-events: auto;
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 12px max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
  box-sizing: border-box;
  gap: 10px;
}
.arcane-mobile__panel--title {
  display: none;
  flex-wrap: wrap;
  justify-content: center;
  align-items: stretch;
}
.arcane-mobile__big-btn {
  flex: 1 1 40%;
  min-width: 140px;
  min-height: 52px;
  border-radius: 12px;
  border: 1px solid rgba(125,211,252,0.45);
  background: rgba(15,23,42,0.88);
  color: #e2e8f0;
  font-size: 15px;
  font-weight: 600;
}
.arcane-mobile__panel--play {
  display: none;
  flex-direction: row;
  align-items: flex-end;
  gap: 8px;
}
.arcane-mobile__stick-zone {
  width: 132px;
  height: 132px;
  flex-shrink: 0;
  touch-action: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
.arcane-mobile__stick-base {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: rgba(15,23,42,0.75);
  border: 2px solid rgba(148,163,184,0.45);
  position: relative;
  touch-action: none;
}
.arcane-mobile__stick-knob {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(56,189,248,0.55);
  border: 2px solid rgba(125,211,252,0.7);
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.arcane-mobile__look {
  display: none;
  flex: 1;
  min-height: 120px;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px dashed rgba(148,163,184,0.35);
  background: rgba(15,23,42,0.35);
  color: rgba(226,232,240,0.55);
  font-size: 13px;
  touch-action: none;
  user-select: none;
}
.arcane-mobile__actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}
.arcane-mobile__btn {
  min-width: 88px;
  min-height: 48px;
  border-radius: 10px;
  border: 1px solid rgba(148,163,184,0.5);
  background: rgba(30,41,59,0.9);
  color: #f1f5f9;
  font-size: 14px;
  font-weight: 600;
  touch-action: manipulation;
  display: none;
  align-items: center;
  justify-content: center;
}
.arcane-mobile__btn--sm { font-size: 12px; min-height: 44px; }
`;
  document.head.appendChild(s);
}

/** Call once at boot (no-op on non-touch devices). */
export function installMobileControls(world: World): void {
  if (!wantsTouchUi() || root) return;
  worldRef = world;
  injectStyles();

  root = el('div', '');
  root.id = 'arcane-mobile';

  const menuTop = el('button', 'arcane-mobile__menu-top', 'Title');
  menuTop.type = 'button';
  const toTitle = (): void => {
    requestSceneChange('title');
  };
  menuTop.addEventListener('click', toTitle);

  panelTitle = el('div', 'arcane-mobile__panel arcane-mobile__panel--title');
  const mkScene = (label: string, scene: string) => {
    const b = el('button', 'arcane-mobile__big-btn', label);
    b.type = 'button';
    const go = (): void => requestSceneChange(scene);
    b.addEventListener('click', go);
    return b;
  };
  panelTitle.append(
    ...listHelloCubeRouteEntries().map((entry) => mkScene(entry.menuLabel, entry.sceneName)),
  );

  panelPlay = el('div', 'arcane-mobile__panel arcane-mobile__panel--play');

  const stickZone = el('div', 'arcane-mobile__stick-zone');
  const stickBase = el('div', 'arcane-mobile__stick-base');
  stickKnob = el('div', 'arcane-mobile__stick-knob');
  stickBase.appendChild(stickKnob);
  stickZone.appendChild(stickBase);
  bindStick(stickZone, stickKnob);

  lookZone = el('div', 'arcane-mobile__look', 'Drag to look') as HTMLDivElement;

  const actions = el('div', 'arcane-mobile__actions');
  btnJump = el('button', 'arcane-mobile__btn', 'Jump') as HTMLButtonElement;
  btnJump.type = 'button';
  btnFire = el('button', 'arcane-mobile__btn', 'Fire') as HTMLButtonElement;
  btnFire.type = 'button';
  btnRespawn = el('button', 'arcane-mobile__btn arcane-mobile__btn--sm', 'Respawn') as HTMLButtonElement;
  btnRespawn.type = 'button';

  bindHoldKey(btnJump, 'Space');
  bindFire(btnFire);
  bindHoldKey(btnRespawn, 'KeyR');

  actions.append(btnJump, btnFire, btnRespawn);
  panelPlay.append(stickZone, lookZone, actions);
  bindLook(lookZone);

  root.append(menuTop, panelTitle, panelPlay);
  document.body.appendChild(root);

  updatePanels();
}

/** Run at the start of each tick, before {@link runSystems}. */
export function syncMobileControlsBeforeTick(world: World): void {
  worldRef = world;
  if (!root) return;

  const scene = currentScene();
  const onTitle = scene === 'title' || scene === undefined;
  root.dataset.showMenu = onTitle ? '0' : '1';
  updatePanels();

  const input = getInput(world);
  if (!input) return;

  if (scene !== 'title' && stick.touchId !== null) {
    for (const k of MOVE_KEYS) {
      input.keys.delete(k);
    }
    if (stick.ny < -0.22) input.keys.add('KeyW');
    if (stick.ny > 0.22) input.keys.add('KeyS');
    if (stick.nx < -0.22) input.keys.add('KeyA');
    if (stick.nx > 0.22) input.keys.add('KeyD');
  }

  if (look.accDx !== 0 || look.accDy !== 0) {
    input.mouse.dx += look.accDx;
    input.mouse.dy += look.accDy;
    look.accDx = 0;
    look.accDy = 0;
  }
}
