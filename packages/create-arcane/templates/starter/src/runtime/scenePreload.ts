export interface ScenePreloadProgress {
  loaded: number;
  total: number;
  label?: string;
}

export interface ScenePreloadContext {
  reportProgress?: (progress: ScenePreloadProgress) => void;
}
