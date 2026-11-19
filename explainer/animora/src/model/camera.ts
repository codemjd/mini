import type { SceneCamera, SceneCameraKeyframe } from './types';

/** Normalize persisted scene-camera data without mutating project or element transforms. */
export function normalizeSceneCamera(value: unknown): SceneCamera {
  const candidate = value && typeof value === 'object' ? value as Partial<SceneCamera> : {};
  const finite = (input: unknown, fallback: number, min: number, max: number) =>
    Number.isFinite(input) ? Math.max(min, Math.min(max, Number(input))) : fallback;
  const keyframes = Array.isArray(candidate.keyframes) ? candidate.keyframes.slice(0, 500).flatMap((raw, index) => {
    if (!raw || typeof raw !== 'object') return [];
    const frame = raw as Partial<SceneCameraKeyframe>;
    if (![frame.time, frame.x, frame.y, frame.zoom].every(Number.isFinite) || Number(frame.time) < 0) return [];
    return [{
      id: typeof frame.id === 'string' && frame.id ? frame.id : 'camera-' + index,
      time: finite(frame.time, 0, 0, 86400),
      x: finite(frame.x, 0, -100000, 100000),
      y: finite(frame.y, 0, -100000, 100000),
      zoom: finite(frame.zoom, 1, 0.1, 8),
      easing: typeof frame.easing === 'string' && frame.easing ? frame.easing.slice(0, 40) : 'easeInOut',
    }];
  }).sort((a, b) => a.time - b.time || a.id.localeCompare(b.id)) : [];
  return {
    x: finite(candidate.x, 0, -100000, 100000),
    y: finite(candidate.y, 0, -100000, 100000),
    zoom: finite(candidate.zoom, 1, 0.1, 8),
    keyframes,
  };
}
