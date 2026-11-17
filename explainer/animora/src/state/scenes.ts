import { getState, setState, notify } from './store';
import { syncActiveScene, uid } from '../model/factory';
import type { Scene } from '../model/types';

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

export function addScene() {
  const state = getState();
  const current = syncActiveScene(state.doc);
  const id = uid();
  const scene: Scene = {
    id, name: `Scene ${(current.scenes?.length ?? 0) + 1}`,
    width: current.width, height: current.height, background: current.background,
    duration: 3, loop: true, iterations: 1, direction: 'normal', trigger: 'load',
    fillMode: 'freeze', speed: 100, elements: [], defs: '', guides: { x: [], y: [] }, comments: [],
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
