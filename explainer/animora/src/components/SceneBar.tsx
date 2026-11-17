import { useStore } from '../state/store';
import { addScene, deleteScene, renameScene, switchScene } from '../state/scenes';

export function SceneBar() {
  const scenes = useStore((state) => state.doc.scenes ?? []);
  const activeId = useStore((state) => state.doc.activeSceneId);
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
      <button className="scene-rename" onClick={() => {
        const scene = scenes.find((item) => item.id === activeId);
        if (!scene) return;
        const name = window.prompt('اسم المشهد', scene.name);
        if (name !== null) renameScene(scene.id, name);
      }} title="Rename active scene" aria-label="Rename active scene">✎</button>
      <button className="scene-add" onClick={addScene} title="Add scene" aria-label="Add scene">+</button>
      <button className="scene-delete" onClick={() => activeId && deleteScene(activeId)} title="Delete active scene" aria-label="Delete active scene" disabled={scenes.length <= 1}>×</button>
    </div>
  );
}
