import { useStore } from '../state/store';
import { addScene, deleteScene, duplicateScene, moveScene, renameScene, setSceneTransition, switchScene } from '../state/scenes';
import { DEFAULT_SCENE_TRANSITION, SCENE_TRANSITION_TYPES } from '../model/types';
import type { SceneTransitionType } from '../model/types';

const TRANSITION_LABELS: Record<SceneTransitionType, string> = {
  none: 'Cut', fade: 'Fade', 'slide-left': 'Slide left', 'slide-right': 'Slide right',
  'slide-up': 'Slide up', 'slide-down': 'Slide down', 'zoom-in': 'Zoom in',
  'zoom-out': 'Zoom out', wipe: 'Wipe', dissolve: 'Dissolve',
};

export function SceneBar() {
  const scenes = useStore((state) => state.doc.scenes ?? []);
  const activeId = useStore((state) => state.doc.activeSceneId);
  const activeScene = scenes.find((scene) => scene.id === activeId);
  const transition = activeScene?.transitionIn ?? DEFAULT_SCENE_TRANSITION;
  return (
    <div className="scene-bar" role="group" aria-label="Scenes">
      <div className="scene-tabs">
        {scenes.map((scene, index) => (
          <button
            key={scene.id}
            className={`scene-tab ${scene.id === activeId ? 'active' : ''}`}
            aria-pressed={scene.id === activeId}
            title="Double tap to rename"
            onClick={() => switchScene(scene.id)}
            onDoubleClick={() => {
              const name = window.prompt('اسم المشهد', scene.name);
              if (name !== null) renameScene(scene.id, name);
            }}
          >
            <span>{index + 1}. {scene.name}</span>
          </button>
        ))}
      </div>
      <button className="scene-order" onClick={() => activeId && moveScene(activeId, -1)} title="Move scene earlier" aria-label="Move scene earlier" disabled={scenes.findIndex((scene) => scene.id === activeId) <= 0}>↑</button>
      <button className="scene-order" onClick={() => activeId && moveScene(activeId, 1)} title="Move scene later" aria-label="Move scene later" disabled={scenes.findIndex((scene) => scene.id === activeId) < 0 || scenes.findIndex((scene) => scene.id === activeId) >= scenes.length - 1}>↓</button>
      <button className="scene-duplicate" onClick={() => activeId && duplicateScene(activeId)} title="Duplicate active scene" aria-label="Duplicate active scene">▣</button>
      <button className="scene-rename" onClick={() => {
        const scene = scenes.find((item) => item.id === activeId);
        if (!scene) return;
        const name = window.prompt('اسم المشهد', scene.name);
        if (name !== null) renameScene(scene.id, name);
      }} title="Rename active scene" aria-label="Rename active scene">✎</button>
      <button className="scene-add" onClick={addScene} title="Add scene" aria-label="Add scene">+</button>
      <button className="scene-delete" onClick={() => activeId && deleteScene(activeId)} title="Delete active scene" aria-label="Delete active scene" disabled={scenes.length <= 1}>×</button>
      <div className="scene-transition-controls">
        <label className="scene-transition-type">
          <span>Transition</span>
          <select
            aria-label="Transition into active scene"
            value={transition.type}
            disabled={!activeScene}
            onChange={(event) => activeId && setSceneTransition(activeId, { ...transition, type: event.target.value as SceneTransitionType })}
          >
            {SCENE_TRANSITION_TYPES.map((type) => <option key={type} value={type}>{TRANSITION_LABELS[type]}</option>)}
          </select>
        </label>
        <label className="scene-transition-duration">
          <span>Seconds</span>
          <input
            aria-label="Transition duration in seconds"
            type="number"
            min="0.1"
            max="5"
            step="0.1"
            value={transition.duration}
            disabled={!activeScene || transition.type === 'none'}
            onChange={(event) => activeId && setSceneTransition(activeId, { ...transition, duration: Number(event.target.value) })}
          />
        </label>
      </div>
    </div>
  );
}
