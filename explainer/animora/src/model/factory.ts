import type { Doc, ElementType, Keyframe, PropKey, SvgEl, TimelineTrack, TimelineTrackKind, Value } from './types';
import { DEFAULT_SCENE_CAMERA, DEFAULT_SCENE_TRANSITION, SCENE_TRANSITION_TYPES } from './types';
import { ellipsePath, rectPath, starPath } from '../engine/path';

export const uid = () => Math.random().toString(36).slice(2, 10);

export function createDefaultTimelineTracks(): TimelineTrack[] {
  return [
    { id: uid(), name: 'Video 1', kind: 'video', visible: true, muted: false, locked: false, clips: [] },
    { id: uid(), name: 'Audio 1', kind: 'audio', visible: true, muted: false, locked: false, clips: [] },
    { id: uid(), name: 'Overlay 1', kind: 'overlay', visible: true, muted: false, locked: false, clips: [] },
  ];
}

const TRACK_KINDS: TimelineTrackKind[] = ['video', 'audio', 'overlay'];

export function normalizeTimelineTracks(value: unknown): TimelineTrack[] {
  if (!Array.isArray(value)) return createDefaultTimelineTracks();
  return value.slice(0, 64).map((raw, index) => {
    const track = raw && typeof raw === 'object' ? raw as Partial<TimelineTrack> : {};
    const kind = TRACK_KINDS.includes(track.kind as TimelineTrackKind) ? track.kind as TimelineTrackKind : 'overlay';
    const clips = Array.isArray(track.clips) ? track.clips.slice(0, 500).filter((clip) => clip && typeof clip === 'object').map((rawClip, clipIndex) => {
      const clip = rawClip as Partial<import('./types').TimelineClip>;
      const rawDuration = Number.isFinite(clip.duration) ? Math.max(0, Number(clip.duration)) : 0;
      const start = Number.isFinite(clip.start) ? Math.max(0, Number(clip.start)) : 0;
      const sourceStart = Number.isFinite(clip.sourceStart) ? Math.max(0, Number(clip.sourceStart)) : 0;
      const sourceDuration = Number.isFinite(clip.sourceDuration)
        ? Math.max(sourceStart, Number(clip.sourceDuration))
        : sourceStart + rawDuration;
      const duration = Math.min(rawDuration, Math.max(0, sourceDuration - sourceStart));
      const clipKind = ['video', 'audio', 'image', 'text'].includes(String(clip.kind)) ? clip.kind! : (kind === 'audio' ? 'audio' : 'video');
      return {
        id: typeof clip.id === 'string' && clip.id ? clip.id : uid(),
        name: typeof clip.name === 'string' && clip.name.trim() ? clip.name.slice(0, 100) : 'Clip ' + (clipIndex + 1),
        kind: clipKind,
        source: typeof clip.source === 'string' ? clip.source : '',
        start, duration, sourceStart, sourceDuration,
        volume: Number.isFinite(clip.volume) ? Math.max(0, Math.min(2, Number(clip.volume))) : 1,
        muted: Boolean(clip.muted),
      };
    }) : [];
    return {
      id: typeof track.id === 'string' && track.id ? track.id : uid(),
      name: typeof track.name === 'string' && track.name.trim() ? track.name.slice(0, 60) : (kind[0].toUpperCase() + kind.slice(1) + ' ' + (index + 1)),
      kind,
      visible: track.visible !== false,
      muted: Boolean(track.muted),
      locked: Boolean(track.locked),
      clips,
    };
  });
}

export function normalizeSceneTransition(value: unknown): import('./types').SceneTransition {
  const candidate = value && typeof value === 'object' ? value as Partial<import('./types').SceneTransition> : {};
  const type = SCENE_TRANSITION_TYPES.includes(candidate.type as import('./types').SceneTransitionType)
    ? candidate.type as import('./types').SceneTransitionType
    : 'none';
  const duration = Number.isFinite(candidate.duration)
    ? Math.min(5, Math.max(0.1, Number(candidate.duration)))
    : DEFAULT_SCENE_TRANSITION.duration;
  return { type, duration };
}

export function normalizeSceneCamera(value: unknown): import('./types').SceneCamera {
  const candidate = value && typeof value === 'object' ? value as Partial<import('./types').SceneCamera> : {};
  const finite = (input: unknown, fallback: number, min: number, max: number) =>
    Number.isFinite(input) ? Math.max(min, Math.min(max, Number(input))) : fallback;
  const keyframes = Array.isArray(candidate.keyframes) ? candidate.keyframes.slice(0, 500).flatMap((raw, index) => {
    if (!raw || typeof raw !== 'object') return [];
    const frame = raw as Partial<import('./types').SceneCameraKeyframe>;
    if (![frame.time, frame.x, frame.y, frame.zoom].every(Number.isFinite)) return [];
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
    x: finite(candidate.x, DEFAULT_SCENE_CAMERA.x, -100000, 100000),
    y: finite(candidate.y, DEFAULT_SCENE_CAMERA.y, -100000, 100000),
    zoom: finite(candidate.zoom, DEFAULT_SCENE_CAMERA.zoom, 0.1, 8),
    keyframes,
  };
}

const TYPE_NAMES: Record<ElementType, string> = {
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  path: 'Path',
  text: 'Text',
  image: 'Image',
  raw: 'Graphic',
  group: 'Group',
};

let counter = 1;
export const nextName = (base: string) => `${base} ${counter++}`;

export function createElement(type: ElementType, init: Partial<SvgEl> = {}, props: SvgEl['props'] = {}): SvgEl {
  return {
    id: uid(),
    type,
    name: init.name ?? nextName(TYPE_NAMES[type]),
    visible: true,
    locked: false,
    ax: 0,
    ay: 0,
    tracks: {},
    ...init,
    props: { ...props },
  };
}

function sceneSnapshot(doc: Doc, id: string, name: string): import('./types').Scene {
  return {
    id, name, width: doc.width, height: doc.height, background: doc.background,
    duration: doc.duration, loop: doc.loop, iterations: doc.iterations,
    direction: doc.direction, trigger: doc.trigger, fillMode: doc.fillMode, speed: doc.speed,
    elements: doc.elements, defs: doc.defs, guides: doc.guides, comments: doc.comments,
    timelineTracks: doc.timelineTracks ?? createDefaultTimelineTracks(),
    transitionIn: normalizeSceneTransition(doc.scenes?.find((scene) => scene.id === id)?.transitionIn),\n    camera: normalizeSceneCamera(doc.camera ?? doc.scenes?.find((scene) => scene.id === id)?.camera),
  };
}

export function syncActiveScene(doc: Doc): Doc {
  if (!doc.scenes?.length || !doc.activeSceneId) return doc;
  const snapshot = sceneSnapshot(doc, doc.activeSceneId,
    doc.scenes.find((scene) => scene.id === doc.activeSceneId)?.name ?? 'Scene 1');
  return { ...doc, scenes: doc.scenes.map((scene) => scene.id === doc.activeSceneId ? snapshot : scene) };
}

export function newDoc(): Doc {
  const doc: Doc = {
    version: 1,
    name: 'Untitled animation',
    width: 800,
    height: 500,
    background: '#ffffff',
    duration: 3,
    loop: true,
    iterations: 1,
    direction: 'normal',
    trigger: 'load',
    fillMode: 'freeze',
    speed: 100,
    elements: [],
    defs: '',
    guides: { x: [], y: [] },
    comments: [],
    timelineTracks: createDefaultTimelineTracks(),
  };
  const id = uid();
  doc.activeSceneId = id;
  doc.scenes = [sceneSnapshot(doc, id, 'Scene 1')];
  return doc;
}

/** Deep copy with fresh ids (for duplicate / paste). */
export function cloneElement(el: SvgEl): SvgEl {
  const c: SvgEl = JSON.parse(JSON.stringify(el));
  const reid = (e: SvgEl) => {
    e.id = uid();
    for (const tr of Object.values(e.tracks)) for (const k of tr!) k.id = uid();
    e.children?.forEach(reid);
  };
  reid(c);
  return c;
}

export function migrateDoc(raw: unknown): Doc {
  const d = raw as Partial<Doc>;
  if (!d || typeof d !== 'object' || !Array.isArray(d.elements)) throw new Error('Not an Animora project file');
  const base = newDoc();
  const out: Doc = {
    ...base,
    ...d,
    version: 1,
    defs: d.defs ?? '',
    guides: { x: d.guides?.x ?? [], y: d.guides?.y ?? [] },
    comments: Array.isArray(d.comments) ? d.comments : [],
    timelineTracks: normalizeTimelineTracks(d.timelineTracks ?? d.scenes?.find((scene) => scene.id === d.activeSceneId)?.timelineTracks ?? d.scenes?.[0]?.timelineTracks),\n    camera: normalizeSceneCamera(d.camera ?? d.scenes?.find((scene) => scene.id === d.activeSceneId)?.camera ?? d.scenes?.[0]?.camera),
    elements: d.elements.map(migrateEl),
    scenes: Array.isArray(d.scenes) && d.scenes.length
      ? d.scenes.map((scene, index) => ({
          ...scene,
          id: typeof scene.id === 'string' && scene.id ? scene.id : uid(),
          name: typeof scene.name === 'string' && scene.name.trim() ? scene.name : `Scene ${index + 1}`,
          elements: Array.isArray(scene.elements) ? scene.elements.map(migrateEl) : [],
          defs: scene.defs ?? '',
          guides: { x: scene.guides?.x ?? [], y: scene.guides?.y ?? [] },
          comments: Array.isArray(scene.comments) ? scene.comments : [],
          timelineTracks: normalizeTimelineTracks(scene.timelineTracks),
          transitionIn: normalizeSceneTransition(scene.transitionIn),\n          camera: normalizeSceneCamera(scene.camera),
        }))
      : [],
    activeSceneId: typeof d.activeSceneId === 'string' && d.activeSceneId
      ? d.activeSceneId
      : (Array.isArray(d.scenes) && d.scenes[0]?.id) || uid(),
  };
  if (!out.scenes?.length) {
    const id = out.activeSceneId || uid();
    out.activeSceneId = id;
    out.scenes = [sceneSnapshot(out, id, 'Scene 1')];
  } else if (!out.scenes.some((scene) => scene.id === out.activeSceneId)) {
    out.activeSceneId = out.scenes[0].id;
  }
  return syncActiveScene(out);
}

function migrateEl(e: SvgEl): SvgEl {
  const out: SvgEl = { ...createElement(e.type), ...e, props: e.props ?? {}, tracks: e.tracks ?? {} };
  if (e.type === 'group') out.children = (e.children ?? []).map(migrateEl);
  return out;
}

// ---------------------------------------------------------------------------
// Demo project shown on first launch.

export type K = [number, Value, string?];
export const track = (keys: K[]): Keyframe[] => keys.map(([time, value, easing]) => ({ id: uid(), time, value, easing: easing ?? 'easeInOut' }));

export function withTracks(el: SvgEl, t: Partial<Record<PropKey, K[]>>): SvgEl {
  for (const [p, keys] of Object.entries(t)) el.tracks[p as PropKey] = track(keys!);
  return el;
}

export function demoDoc(): Doc {
  const doc = newDoc();
  doc.name = 'Welcome to Animora';
  doc.duration = 4;
  doc.background = '#f4f5fb';

  const wave = withTracks(
    createElement('path', { name: 'Wave line', lineCap: 'round', lineJoin: 'round' }, {
      x: 400, y: 440, d: 'M-340 0 C-280 -40 -220 -40 -170 0 C-120 40 -60 40 0 0 C60 -40 120 -40 170 0 C220 40 280 40 340 0',
      fill: 'none', stroke: '#ff5d73', strokeWidth: 8,
    }),
    { trim: [[0, 0, 'easeInOutCubic'], [1.6, 100, 'linear'], [3.4, 100, 'easeInOutCubic'], [4, 0]] },
  );

  const beats = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];
  const shadow = createElement('ellipse', { name: 'Ball shadow' }, { x: 150, y: 392, width: 90, height: 14, fill: '#1b1d2a', opacity: 0.15 });
  shadow.tracks.scaleX = track(beats.map((t, i) => [t, i % 2 ? 1 : 0.45, i % 2 ? 'easeOutQuad' : 'easeInQuad'] as K));

  const ball = createElement('ellipse', { name: 'Bouncing ball' }, { x: 150, width: 80, height: 80, fill: '#5b6cff' });
  ball.tracks.y = track(beats.map((t, i) => [t, i % 2 ? 345 : 150, i % 2 ? 'easeOutQuad' : 'easeInQuad'] as K));

  const star = withTracks(
    createElement('path', { name: 'Spinning star', lineJoin: 'round' }, {
      x: 390, y: 240, d: starPath(170, 170, 5, 0.45), fill: '#ffc93c', stroke: '#f29f05', strokeWidth: 4,
    }),
    {
      rotation: [[0, 0, 'linear'], [4, 360]],
      scaleX: [[0, 1], [1, 1.2], [2, 1], [3, 1.2], [4, 1]],
      scaleY: [[0, 1], [1, 1.2], [2, 1], [3, 1.2], [4, 1]],
    },
  );

  const title = withTracks(
    createElement('text', { name: 'Title', text: 'Animora', fontWeight: '800', fontFamily: 'Inter, Arial, sans-serif' }, {
      x: 625, fontSize: 64, fill: '#1b1d2a',
    }),
    {
      opacity: [[0.3, 0, 'easeOutCubic'], [1.2, 1]],
      y: [[0.3, 210, 'easeOutBack'], [1.2, 170]],
    },
  );

  const subtitle = withTracks(
    createElement('text', { name: 'Subtitle', text: 'open-source SVG animator', fontWeight: '500' }, {
      x: 625, y: 222, fontSize: 22, fill: '#5d6178',
    }),
    { opacity: [[0.8, 0, 'easeOut'], [1.6, 1]] },
  );

  const morph = withTracks(
    createElement('path', { name: 'Morphing shape' }, { x: 625, y: 330, fill: '#2ec4b6' }),
    {
      d: [[0.4, rectPath(90, 90, 12)], [1.6, ellipsePath(100, 100)], [2.8, starPath(120, 120, 6, 0.6)], [4, rectPath(90, 90, 12)]],
      fill: [[0.4, '#2ec4b6'], [1.6, '#8b5cf6'], [2.8, '#ff8c42'], [4, '#2ec4b6']],
      rotation: [[0.4, 0], [4, 180]],
    },
  );

  doc.elements = [wave, shadow, ball, star, title, subtitle, morph];
  return syncActiveScene(doc);
}
