import { createHelloCubePanel } from './helloCubePresentation.js';

/** DOM nodes updated by {@link gameStateSystem} (create under `#arcane-hud`). */
export interface FpsHudHandles {
  healthFill: HTMLElement;
  healthLabel: HTMLElement;
  killsLabel: HTMLElement;
  overlay: HTMLElement;
  networkBadge?: HTMLElement;
  networkLabel?: HTMLElement;
  networkDetail?: HTMLElement;
  networkNotice?: HTMLElement;
}

export function createMuzzleLayer(): HTMLDivElement {
  const el = document.createElement('div');
  el.id = 'arcane-muzzle-flash';
  el.style.position = 'fixed';
  el.style.inset = '0';
  el.style.pointerEvents = 'none';
  el.style.background = '#ffffff';
  el.style.opacity = '0';
  el.style.transition = 'opacity 45ms ease-out';
  el.style.zIndex = '6';
  return el;
}

export interface CreateArcaneHudOptions {
  showMultiplayerStatus?: boolean;
  sceneEyebrow?: string;
  sceneTitle?: string;
  sceneSummary?: string;
  sceneBadges?: readonly string[];
}

export function createArcaneHud(
  hintText: string,
  options?: CreateArcaneHudOptions,
): { root: HTMLDivElement; handles: FpsHudHandles } {
  const root = document.createElement('div');
  root.id = 'arcane-hud';
  root.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:5;font-family:"Avenir Next","Segoe UI",system-ui,sans-serif;';

  if (options?.sceneTitle) {
    const scenePanel = createHelloCubePanel({
      eyebrow: options.sceneEyebrow,
      title: options.sceneTitle,
      body: options.sceneSummary ?? hintText,
      badges: options.sceneBadges,
    });
    scenePanel.root.style.position = 'absolute';
    scenePanel.root.style.top = '16px';
    scenePanel.root.style.left = '50%';
    scenePanel.root.style.transform = 'translateX(-50%)';
    scenePanel.root.style.width = 'min(440px, calc(100vw - 40px))';
    scenePanel.root.style.pointerEvents = 'none';
    root.appendChild(scenePanel.root);
  }

  const cross = document.createElement('div');
  cross.id = 'arcane-crosshair';
  cross.style.cssText =
    'position:absolute;left:50%;top:50%;width:16px;height:16px;transform:translate(-50%,-50%);';
  const chV = document.createElement('div');
  chV.style.cssText =
    'position:absolute;left:50%;top:0;bottom:0;width:2px;margin-left:-1px;background:rgba(255,255,255,0.9);box-shadow:0 0 1px rgba(0,0,0,0.5);';
  const chH = document.createElement('div');
  chH.style.cssText =
    'position:absolute;top:50%;left:0;right:0;height:2px;margin-top:-1px;background:rgba(255,255,255,0.9);box-shadow:0 0 1px rgba(0,0,0,0.5);';
  cross.append(chV, chH);

  const killsLabel = document.createElement('div');
  killsLabel.id = 'arcane-kills';
  killsLabel.style.cssText =
    'position:absolute;top:18px;right:20px;padding:9px 12px;border-radius:999px;border:1px solid rgba(125,211,252,0.24);background:rgba(15,23,42,0.72);box-shadow:0 12px 30px rgba(2,6,23,0.24);color:#e2e8f0;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;';
  killsLabel.textContent = 'Kills 0';

  let networkBadge: HTMLElement | undefined;
  let networkLabel: HTMLElement | undefined;
  let networkDetail: HTMLElement | undefined;
  let networkNotice: HTMLElement | undefined;

  if (options?.showMultiplayerStatus) {
    const networkPanel = document.createElement('div');
    networkPanel.id = 'arcane-network-panel';
    networkPanel.style.cssText =
      'position:absolute;top:16px;left:20px;display:grid;gap:6px;min-width:min(300px,calc(100vw - 40px));padding:14px 16px;border-radius:18px;background:rgba(15,23,42,0.74);border:1px solid rgba(125,211,252,0.22);box-shadow:0 14px 32px rgba(2,6,23,0.26);backdrop-filter:blur(12px);';

    networkBadge = document.createElement('div');
    networkBadge.id = 'arcane-network-badge';
    networkBadge.style.cssText =
      'justify-self:start;padding:4px 10px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;background:rgba(125,211,252,0.18);color:#bae6fd;';
    networkBadge.textContent = 'CONNECTING';

    networkLabel = document.createElement('div');
    networkLabel.id = 'arcane-network-label';
    networkLabel.style.cssText = 'color:#f8fafc;font-size:15px;font-weight:600;';
    networkLabel.textContent = 'Connecting to relay...';

    networkDetail = document.createElement('div');
    networkDetail.id = 'arcane-network-detail';
    networkDetail.style.cssText = 'color:#cbd5e1;font-size:12px;line-height:1.45;';
    networkDetail.textContent = 'Waiting for multiplayer welcome...';

    networkNotice = document.createElement('div');
    networkNotice.id = 'arcane-network-notice';
    networkNotice.style.cssText = 'min-height:17px;color:#7dd3fc;font-size:12px;line-height:1.4;';

    networkPanel.append(networkBadge, networkLabel, networkDetail, networkNotice);
    root.appendChild(networkPanel);
  }

  const healthWrap = document.createElement('div');
  healthWrap.style.cssText =
    'position:absolute;left:20px;bottom:52px;width:220px;padding:14px 16px;border-radius:18px;border:1px solid rgba(125,211,252,0.22);background:rgba(15,23,42,0.72);box-shadow:0 14px 30px rgba(2,6,23,0.26);backdrop-filter:blur(12px);';
  const healthBarOuter = document.createElement('div');
  healthBarOuter.style.cssText =
    'height:12px;background:rgba(15,23,42,0.8);border-radius:8px;overflow:hidden;border:1px solid rgba(148,163,184,0.4);';
  const healthFill = document.createElement('div');
  healthFill.style.cssText =
    'height:100%;width:100%;background:linear-gradient(90deg,#16a34a,#4ade80);transform-origin:left center;transform:scaleX(1);transition:transform 80ms ease-out;';
  healthBarOuter.appendChild(healthFill);
  const healthLabel = document.createElement('div');
  healthLabel.style.cssText = 'margin-top:8px;color:#cbd5e1;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;';
  healthLabel.textContent = '—';
  healthWrap.append(healthBarOuter, healthLabel);

  const overlay = document.createElement('div');
  overlay.id = 'arcane-game-overlay';
  overlay.style.cssText =
    'display:none;position:absolute;inset:0;align-items:center;justify-content:center;background:linear-gradient(180deg, rgba(15,23,42,0.6), rgba(15,23,42,0.82));backdrop-filter:blur(8px);color:#f8fafc;font-size:clamp(18px,4vw,26px);font-weight:700;text-align:center;padding:32px;line-height:1.35;';

  const hint = document.createElement('div');
  hint.style.cssText =
    'position:absolute;left:50%;bottom:18px;transform:translateX(-50%);max-width:min(640px,92vw);padding:10px 14px;border-radius:999px;border:1px solid rgba(125,211,252,0.18);background:rgba(15,23,42,0.58);box-shadow:0 10px 24px rgba(2,6,23,0.18);text-align:center;color:rgba(226,232,240,0.82);font-size:11px;line-height:1.45;';
  hint.textContent = hintText;

  root.append(cross, killsLabel, healthWrap, overlay, hint);

  return {
    root,
    handles: {
      healthFill,
      healthLabel,
      killsLabel,
      overlay,
      networkBadge,
      networkLabel,
      networkDetail,
      networkNotice,
    },
  };
}
