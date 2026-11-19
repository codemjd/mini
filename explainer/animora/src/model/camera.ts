import type { CameraKeyframe, SceneCamera } from './types';
import { getEasing } from '../engine/easing';

export const DEFAULT_SCENE_CAMERA: SceneCamera = {
  enabled: false,
  keyframes: [],
};

export function createDefaultSceneCamera(): SceneCamera {
  return { enabled: false, keyframes: [] };
}

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
    .filter((raw) => Boolean(raw) && typeof raw === 'object' && Number.isFinite(Number(raw.time)) && Number(raw.time) >= 0)
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


export interface CameraFrame {
  x: number;
  y: number;
  zoom: number;
}

/** Evaluate a scene camera at a timeline time. Keyframe easing controls the segment to the next keyframe. */
export function evaluateSceneCamera(value: unknown, time: number): CameraFrame {
  const camera = normalizeSceneCamera(value);
  if (!camera.enabled || camera.keyframes.length === 0) return { x: 0, y: 0, zoom: 1 };
  const keys = camera.keyframes;
  const t = Number.isFinite(time) ? Math.max(0, Math.min(MAX_CAMERA_TIME, time)) : 0;
  if (t <= keys[0].time) return { x: keys[0].x, y: keys[0].y, zoom: keys[0].zoom };
  const last = keys[keys.length - 1];
  if (t >= last.time) return { x: last.x, y: last.y, zoom: last.zoom };

  const index = keys.findIndex((key, i) => i < keys.length - 1 && t >= key.time && t <= keys[i + 1].time);
  if (index < 0) return { x: last.x, y: last.y, zoom: last.zoom };
  const from = keys[index];
  const to = keys[index + 1];
  const span = to.time - from.time;
  if (span <= 0) return { x: to.x, y: to.y, zoom: to.zoom };
  const progress = Math.max(0, Math.min(1, (t - from.time) / span));
  const eased = Math.max(0, Math.min(1, getEasing(from.easing).fn(progress)));
  return {
    x: from.x + (to.x - from.x) * eased,
    y: from.y + (to.y - from.y) * eased,
    zoom: Math.max(MIN_CAMERA_ZOOM, Math.min(MAX_CAMERA_ZOOM, from.zoom + (to.zoom - from.zoom) * eased)),
  };
}
