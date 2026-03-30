/** DOM nodes updated by {@link gameStateSystem} (create under `#arcane-hud`). */
export interface FpsHudHandles {
  healthFill: HTMLElement;
  healthLabel: HTMLElement;
  killsLabel: HTMLElement;
  overlay: HTMLElement;
}

export function createMuzzleLayer(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.position = 'fixed';
  el.style.inset = '0';
  el.style.pointerEvents = 'none';
  el.style.background = '#ffffff';
  el.style.opacity = '0';
  el.style.transition = 'opacity 45ms ease-out';
  el.style.zIndex = '6';
  return el;
}

export function createArcaneHud(hintText: string): { root: HTMLDivElement; handles: FpsHudHandles } {
  const root = document.createElement('div');
  root.id = 'arcane-hud';
  root.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:5;font-family:"Avenir Next","Segoe UI",system-ui,sans-serif;';

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
    'position:absolute;top:16px;right:20px;color:#e2e8f0;font-size:15px;font-weight:600;';
  killsLabel.textContent = '0';

  const healthWrap = document.createElement('div');
  healthWrap.style.cssText = 'position:absolute;left:20px;bottom:52px;width:200px;';
  const healthBarOuter = document.createElement('div');
  healthBarOuter.style.cssText =
    'height:12px;background:rgba(15,23,42,0.8);border-radius:8px;overflow:hidden;border:1px solid rgba(148,163,184,0.4);';
  const healthFill = document.createElement('div');
  healthFill.style.cssText =
    'height:100%;width:100%;background:linear-gradient(90deg,#16a34a,#4ade80);transform-origin:left center;transform:scaleX(1);transition:transform 80ms ease-out;';
  healthBarOuter.appendChild(healthFill);
  const healthLabel = document.createElement('div');
  healthLabel.style.cssText = 'margin-top:8px;color:#cbd5e1;font-size:12px;letter-spacing:0.04em;';
  healthLabel.textContent = '—';
  healthWrap.append(healthBarOuter, healthLabel);

  const overlay = document.createElement('div');
  overlay.id = 'arcane-game-overlay';
  overlay.style.cssText =
    'display:none;position:absolute;inset:0;align-items:center;justify-content:center;background:rgba(15,23,42,0.72);color:#f8fafc;font-size:clamp(18px,4vw,26px);font-weight:600;text-align:center;padding:32px;line-height:1.35;';

  const hint = document.createElement('div');
  hint.style.cssText =
    'position:absolute;left:50%;bottom:18px;transform:translateX(-50%);max-width:min(560px,92vw);text-align:center;color:rgba(226,232,240,0.78);font-size:11px;line-height:1.45;';
  hint.textContent = hintText;

  root.append(cross, killsLabel, healthWrap, overlay, hint);

  return {
    root,
    handles: { healthFill, healthLabel, killsLabel, overlay },
  };
}
