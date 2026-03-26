let loadSceneHandler: ((name: string) => void) | undefined;
let pendingSceneName: string | undefined;

export function configureSceneTransitions(
  loadScene: (name: string) => void,
): void {
  loadSceneHandler = loadScene;
}

export function requestSceneChange(name: string): void {
  pendingSceneName = name;
}

export function flushSceneChange(): void {
  if (!pendingSceneName) {
    return;
  }

  if (!loadSceneHandler) {
    throw new Error('flushSceneChange: scene transitions have not been configured');
  }

  const nextSceneName = pendingSceneName;
  pendingSceneName = undefined;
  loadSceneHandler(nextSceneName);
}

export function resetSceneTransitions(): void {
  loadSceneHandler = undefined;
  pendingSceneName = undefined;
}
