let loadSceneHandler: ((name: string) => void | Promise<void>) | undefined;
let pendingSceneName: string | undefined;
let activeSceneLoad: Promise<void> | undefined;

export function configureSceneTransitions(
  loadScene: (name: string) => void | Promise<void>,
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

  if (activeSceneLoad) {
    return;
  }

  if (!loadSceneHandler) {
    throw new Error('flushSceneChange: scene transitions have not been configured');
  }

  const nextSceneName = pendingSceneName;
  pendingSceneName = undefined;
  const loadResult = loadSceneHandler(nextSceneName);
  activeSceneLoad = Promise.resolve(loadResult)
    .catch((error: unknown) => {
      console.error('Arcane Engine scene load failed.', error);
    })
    .finally(() => {
      activeSceneLoad = undefined;
    });
}

export function resetSceneTransitions(): void {
  loadSceneHandler = undefined;
  pendingSceneName = undefined;
  activeSceneLoad = undefined;
}
