import { getState, setState, notify } from './store';
import { cloneElement, createDefaultTimelineTracks, normalizeSceneTransition, syncActiveScene, uid } from '../model/factory';
import { DEFAULT_SCENE_TRANSITION } from '../model/types';
import { DEFAULT_SCENE_CAMERA, createDefaultSceneCamera, normalizeSceneCamera } from '../model/camera';
import type { Scene, SceneTransition } from '../model/types';

function applyScene(doc: ReturnType<typeof getState>['doc'], scene: Scene) {
  return {
    ...doc,
    activeSceneId: scene.id,
    width: scene.width,
    height: scene.height,
    background: scene.background,
    duration: scene.duration,
    loop: scene.loop,
    iterations: scene.iterations,
    direction: scene.direction,
    trigger: scene.trigger,
    fillMode: scene.fillMode,
    speed: scene.speed,
    elements: scene.elements,
    defs: scene.defs,
    guides: scene.guides,
    comments: scene.comments,
    timelineTracks: scene.timelineTracks ?? [],
    camera: normalizeSceneCamera(scene.camera ?? DEFAULT_SCENE_CAMERA),
  };
}

export function switchScene(id: string) {
  const state = getState();
  const current = syncActiveScene(state.doc);
  const target = current.scenes?.find((scene) => scene.id === id);
  if (!target || id === current.activeSceneId) return;
  setState({
    doc: applyScene(current, target),
    selection: [], selectedKfs: [], scope: null, time: 0, playing: false,
    past: [], future: [], histKey: null,
  });
}

/** Advance sequential preview playback to the next scene without stopping transport. */
export function advanceSceneForPlayback(): boolean {
  const state = getState();
  const doc = syncActiveScene(state.doc);
  const scenes = doc.scenes ?? [];
  const index = scenes.findIndex((scene) => scene.id === doc.activeSceneId);
  if (index < 0 || index >= scenes.length - 1) return false;

  const next = scenes[index + 1];
  setState({
    doc: applyScene(doc, next),
    selection: [], selectedKfs: [], scope: null, time: 0,
    past: [], future: [], histKey: null,
  });
  return true;
}

export function addScene() {
  const state = getState();
  const current = syncActiveScene(state.doc);
  const id = uid();
  const scene: Scene = {
    id, name: `Scene ${(current.scenes?.length ?? 0) + 1}`,
    width: current.width, height: current.height, background: current.background,
    duration: 3, loop: true, iterations: 1, direction: 'normal', trigger: 'load',
    fillMode: 'freeze', speed: 100, elements: [], defs: '', guides: { x: [], y: [] }, comments: [],
    transitionIn: { ...DEFAULT_SCENE_TRANSITION },
    timelineTracks: createDefaultTimelineTracks(),
    camera: createDefaultSceneCamera(),
  };
  const doc = { ...current, scenes: [...(current.scenes ?? []), scene] };
  setState({
    doc: applyScene(doc, scene),
    selection: [], selectedKfs: [], scope: null, time: 0, playing: false,
    past: [], future: [], histKey: null,
  });
  notify('تم إنشاء مشهد جديد');
}

export function renameScene(id: string, name: string) {
  const clean = name.trim().slice(0, 60);
  if (!clean) return;
  const state = getState();
  const doc = syncActiveScene(state.doc);
  if (!doc.scenes?.some((scene) => scene.id === id)) return;
  setState({ doc: { ...doc, scenes: doc.scenes.map((scene) => scene.id === id ? { ...scene, name: clean } : scene) } });
}

export function deleteScene(id: string) {
  const state = getState();
  const doc = syncActiveScene(state.doc);
  const scenes = doc.scenes ?? [];
  if (scenes.length <= 1) {
    notify('يجب أن يحتوي المشروع على مشهد واحد على الأقل');
    return;
  }
  const index = scenes.findIndex((scene) => scene.id === id);
  if (index < 0) return;
  const remaining = scenes.filter((scene) => scene.id !== id);
  if (doc.activeSceneId !== id) {
    setState({ doc: { ...doc, scenes: remaining } });
    return;
  }
  const target = remaining[Math.min(index, remaining.length - 1)];
  setState({ doc: applyScene({ ...doc, scenes: remaining }, target), selection: [], selectedKfs: [], scope: null, time: 0, playing: false, past: [], future: [], histKey: null });
  notify('تم حذف المشهد');
}

/** Duplicate a scene with fresh ids for the scene, layers, keyframes and comments. */
export function duplicateScene(id: string) {
  const state = getState();
  const doc = syncActiveScene(state.doc);
  const source = doc.scenes?.find((scene) => scene.id === id);
  if (!source || !doc.scenes) return;
  const copy: Scene = {
    ...source,
    id: uid(),
    name: `${source.name} copy`.slice(0, 60),
    elements: source.elements.map(cloneElement),
    guides: { x: [...source.guides.x], y: [...source.guides.y] },
    comments: source.comments.map((comment) => ({ ...comment, id: uid() })),
    timelineTracks: (source.timelineTracks ?? []).map((track) => ({
      ...track, id: uid(), clips: track.clips.map((clip) => ({ ...clip, id: uid() })),
    })),
  };
  const index = doc.scenes.findIndex((scene) => scene.id === id);
  const scenes = [...doc.scenes];
  scenes.splice(index + 1, 0, copy);
  setState({
    doc: applyScene({ ...doc, scenes }, copy),
    selection: [], selectedKfs: [], scope: null, time: 0, playing: false,
    past: [], future: [], histKey: null,
  });
  notify('تم تكرار المشهد');
}

/** Change how this scene enters from the previous scene. */
export function setSceneTransition(id: string, transition: Partial<SceneTransition>) {
  const state = getState();
  const doc = syncActiveScene(state.doc);
  const scenes = doc.scenes ?? [];
  const current = scenes.find((scene) => scene.id === id);
  if (!current) return;
  const next = normalizeSceneTransition({ ...(current.transitionIn ?? DEFAULT_SCENE_TRANSITION), ...transition });
  setState({ doc: { ...doc, scenes: scenes.map((scene) => scene.id === id ? { ...scene, transitionIn: next } : scene) } });
}

/** Move a scene one position: direction -1 moves earlier, +1 moves later. */
export function moveScene(id: string, direction: -1 | 1) {
  const state = getState();
  const doc = syncActiveScene(state.doc);
  const scenes = doc.scenes ?? [];
  const index = scenes.findIndex((scene) => scene.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= scenes.length) return;
  const reordered = [...scenes];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  setState({ doc: { ...doc, scenes: reordered } });
}
