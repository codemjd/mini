import type { CameraKeyframe, SceneCamera } from './types';

export const DEFAULT_SCENE_CAMERA: SceneCamera = {
  enabled: false,
  keyframes: [],
};

const MAX_CAMERA_KEYFRAMES = 500;
const MAX_CAMERA_TIME = 24 * 60 * 60;
const MAX_CAMERA_OFFSET = 100_000;
const MIN_CAMERA_ZOOM = 0.1;
const MAX_CAMERA_ZOOM = 8;

/** Normalize persisted camera settings without mutating the project source. */
export function normalizeSceneCamera(value: unknown): SceneCamera {
  const candidate = value && typeof value === 'object' ? value as Partial<SceneCamera> : {};
  const rawKeys = Array.isArray(candidate.keyframes) ? candidate.keyframes.slice(0, MAX_CAMERA_KEYFRAMES) : [];
  const keyframes: CameraKeyframe[] = rawKeys
    .filter((raw) => Boolean(raw) && typeof raw === 'object')
    .map((raw, index) => {
      const key = raw as Partial<CameraKeyframe>;
      const rawTime = Number(key.time);
      return {
        id: typeof key.id === 'string' && key.id.trim() ? key.id.slice(0, 80) : `camera-${index + 1}`,
        time: Number.isFinite(rawTime) ? Math.max(0, Math.min(MAX_CAMERA_TIME, rawTime)) : 0,
        x: Number.isFinite(key.x) ? Math.max(-MAX_CAMERA_OFFSET, Math.min(MAX_CAMERA_OFFSET, Number(key.x))) : 0,
        y: Number.isFinite(key.y) ? Math.max(-MAX_CAMERA_OFFSET, Math.min(MAX_CAMERA_OFFSET, Number(key.y))) : 0,
        zoom: Number.isFinite(key.zoom) ? Math.max(MIN_CAMERA_ZOOM, Math.min(MAX_CAMERA_ZOOM, Number(key.zoom))) : 1,
        easing: typeof key.easing === 'string' && key.easing.trim() ? key.easing.slice(0, 40) : 'easeInOut',
      };
    })
    .sort((a, b) => a.time - b.time || a.id.localeCompare(b.id));
  return { enabled: candidate.enabled === true, keyframes };
}
