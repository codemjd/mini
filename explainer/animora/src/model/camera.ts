import type { SceneCamera } from './types';

export const DEFAULT_SCENE_CAMERA: SceneCamera = {
  x: 0,
  y: 0,
  zoom: 1,
  keyframes: [],
};

const MAX_CAMERA_OFFSET = 100_000;
const MIN_CAMERA_ZOOM = 0.1;
const MAX_CAMERA_ZOOM = 8;
const MAX_CAMERA_KEYFRAMES = 500;
const MAX_CAMERA_TIME = 24 * 60 * 60;

const finiteInRange = (value: unknown, fallback: number, min: number, max: number) => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

/**
 * Normalize persisted scene-camera data without mutating the source.
 * Camera coordinates are scene-space offsets and never alter element transforms.
 */
export function normalizeSceneCamera(value: unknown): SceneCamera {
  const raw = value && typeof value === 'object' ? value as Partial<SceneCamera> : {};
  const keyframes = Array.isArray(raw.keyframes)
    ? raw.keyframes.slice(0, MAX_CAMERA_KEYFRAMES)
      .map((frame, index) => {
        if (!frame || typeof frame !== 'object') return null;
        const candidate = frame as Partial<SceneCamera['keyframes'][number]>;
        const time = finiteInRange(candidate.time, -1, 0, MAX_CAMERA_TIME);
        if (time < 0) return null;
        return {
          id: typeof candidate.id === 'string' && candidate.id.trim()
            ? candidate.id.slice(0, 80)
            : `camera-keyframe-${index + 1}`,
          time,
          x: finiteInRange(candidate.x, 0, -MAX_CAMERA_OFFSET, MAX_CAMERA_OFFSET),
          y: finiteInRange(candidate.y, 0, -MAX_CAMERA_OFFSET, MAX_CAMERA_OFFSET),
          zoom: finiteInRange(candidate.zoom, 1, MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM),
          easing: typeof candidate.easing === 'string' && candidate.easing.trim()
            ? candidate.easing.slice(0, 40)
            : 'easeInOut',
        };
      })
      .filter((frame): frame is NonNullable<typeof frame> => frame !== null)
      .sort((a, b) => a.time - b.time || a.id.localeCompare(b.id))
    : [];

  return {
    x: finiteInRange(raw.x, 0, -MAX_CAMERA_OFFSET, MAX_CAMERA_OFFSET),
    y: finiteInRange(raw.y, 0, -MAX_CAMERA_OFFSET, MAX_CAMERA_OFFSET),
    zoom: finiteInRange(raw.zoom, 1, MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM),
    keyframes,
  };
}
