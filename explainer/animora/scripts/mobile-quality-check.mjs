import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const store = readFileSync(new URL('../src/state/store.ts', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
const sceneBar = readFileSync(new URL('../src/components/SceneBar.tsx', import.meta.url), 'utf8');
const factory = readFileSync(new URL('../src/model/factory.ts', import.meta.url), 'utf8');
const actions = readFileSync(new URL('../src/state/actions.ts', import.meta.url), 'utf8');
const types = readFileSync(new URL('../src/model/types.ts', import.meta.url), 'utf8');
const scenes = readFileSync(new URL('../src/state/scenes.ts', import.meta.url), 'utf8');
const files = readFileSync(new URL('../src/io/files.ts', import.meta.url), 'utf8');
const assets = readFileSync(new URL('../src/model/assets.ts', import.meta.url), 'utf8');
const sceneState = readFileSync(new URL('../src/state/scenes.ts', import.meta.url), 'utf8');
const dialogs = readFileSync(new URL('../src/components/Dialogs.tsx', import.meta.url), 'utf8');
const boundary = readFileSync(new URL('../src/components/AppErrorBoundary.tsx', import.meta.url), 'utf8');
const checks = [
  ['phone breakpoint exists', css.includes('@media (max-width: 700px)')],
  ['narrow phone breakpoint exists', css.includes('@media (max-width: 380px)')],
  ['timeline resizer disables browser gesture stealing', css.includes('.tl-resizer') && css.includes('touch-action: none')],
  ['keyframe handles are touch-safe', css.includes('.kf,') && css.includes('touch-action: none')],
  ['safe-area inset support exists', css.includes('env(safe-area-inset-bottom)')],
  ['keyboard focus indicator exists', css.includes(':focus-visible')],
  ['reduced motion preference is respected', css.includes('prefers-reduced-motion: reduce')],
  ['viewport fits device safe areas', html.includes('viewport-fit=cover')],
  ['mobile drawer backdrop closes panels', app.includes('className="panel-scrim"') && css.includes('.panel-scrim')],
  ['Escape closes open mobile panels', app.includes("else if (s.leftOpen || s.rightOpen) setState({ leftOpen: false, rightOpen: false });")],
  ['panel expanders expose accessible labels and state', app.includes('aria-label="Show Elements / Library"') && app.includes('aria-label="Show Properties"') && app.includes('aria-expanded={leftOpen}') && app.includes('aria-expanded={rightOpen}')],
  ['editor is protected by a React error boundary', main.includes('<AppErrorBoundary>') && main.includes('</AppErrorBoundary>')],
  ['crash fallback offers reload and error details', boundary.includes('role="alert"') && boundary.includes('window.location.reload()') && boundary.includes('<details>')],
  ['browser title follows the active project name', app.includes('document.title = documentName ? `${documentName} — Animora`') && app.includes('[documentName]')],
  ['autosave recovery snapshot is stored separately', store.includes("AUTOSAVE_BACKUP_KEY = 'animora.autosave.backup.v1'") && app.includes('localStorage.setItem(AUTOSAVE_BACKUP_KEY, previous)')],
  ['startup tries primary and backup autosaves', store.includes('for (const key of [AUTOSAVE_KEY, AUTOSAVE_BACKUP_KEY])')],
  ['damaged primary snapshot does not replace backup', app.includes('migrateDoc(JSON.parse(previous))') && app.includes('Never replace a known-good recovery snapshot')],
  ['scene model is backward-compatible with single-scene projects', types.includes('export interface Scene') && types.includes('scenes?: Scene[]') && factory.includes('if (!out.scenes?.length)')],
  ['new projects start with a named scene', factory.includes("sceneSnapshot(doc, id, 'Scene 1')") && factory.includes('doc.activeSceneId = id')],
  ['demo project scene snapshot includes its initial artwork', factory.includes('return syncActiveScene(doc);')],
  ['scene rename is available through a dedicated touch control', sceneBar.includes('aria-label="Rename active scene"')],
  ['document edits keep the active scene snapshot synchronized', actions.includes('syncActiveScene(changed)')],
  ['scene switching preserves per-scene content and resets transient editing state', scenes.includes('syncActiveScene(state.doc)') && scenes.includes('applyScene(current, target)') && scenes.includes('selectedKfs: [], scope: null, time: 0')],
  ['scene creation and deletion preserve at least one scene', scenes.includes('export function addScene()') && scenes.includes('export function deleteScene(id: string)') && scenes.includes('scenes.length <= 1')],
  ['scene duplication gives the scene and its content fresh identities', scenes.includes('export function duplicateScene(id: string)') && scenes.includes('elements: source.elements.map(cloneElement)') && scenes.includes('comments: source.comments.map((comment) => ({ ...comment, id: uid() }))')],
  ['scene ordering moves a scene without changing its identity', scenes.includes('export function moveScene(id: string, direction: -1 | 1)') && scenes.includes('[reordered[index], reordered[target]] = [reordered[target], reordered[index]]')],
  ['video export can render all scenes in project order', files.includes('export async function exportWebmScenes') && files.includes('const sceneDocs = scenes.map((scene) => sceneDocument(doc, scene))') && files.includes('for (let sceneIndex = 0; sceneIndex < sceneDocs.length; sceneIndex++)')],
  ['export dialog offers an explicit all-scenes option', dialogs.includes('Include all scenes in order') && dialogs.includes('exportWebmScenes(getState().doc, setProgress, fps)')],
  ['built-in asset library excludes living-character artwork', !assets.includes("id: 'characters'") && !assets.includes('const CHARACTERS: Asset[]')],
  ['scene transition types include all planned entrance styles', types.includes("'slide-left'") && types.includes("'slide-right'") && types.includes("'slide-up'") && types.includes("'slide-down'") && types.includes("'zoom-in'") && types.includes("'zoom-out'") && types.includes("'wipe'") && types.includes("'dissolve'")],
  ['older scene data receives a safe default transition', factory.includes('normalizeSceneTransition(scene.transitionIn)') && factory.includes('DEFAULT_SCENE_TRANSITION')],
  ['transition settings are editable and saved per scene', sceneBar.includes('aria-label="Transition into active scene"') && sceneBar.includes('aria-label="Transition duration in seconds"') && sceneState.includes('export function setSceneTransition')],
  ['transition durations are constrained to a safe 0.1–5 second range', factory.includes('Math.min(5, Math.max(0.1, Number(candidate.duration)))')],
  ['video export composites all transition families', files.includes("type === 'slide-left'") && files.includes("type === 'wipe'") && files.includes("type === 'dissolve'") && files.includes("type === 'fade'") && files.includes("type === 'zoom-in'") && files.includes("type === 'zoom-out'")],
  ['scene transitions use the previous final frame and incoming scene frames', files.includes('previousSceneStill') && files.includes('transitionFrames') && files.includes('drawSceneTransition(')],
  ['transition duration is contained within the incoming scene timeline', files.includes('Math.round(Math.max(0.1, transition.duration) * fps)') && files.includes('Math.min(times.length')],
  ['transition controls have responsive touch-sized fields', css.includes('.scene-transition-controls') && css.includes('@media (max-width: 700px)')],
  ['scene bar exposes duplicate and ordering controls', sceneBar.includes('aria-label="Duplicate active scene"') && sceneBar.includes('aria-label="Move scene earlier"') && sceneBar.includes('aria-label="Move scene later"')],
  ['scene strip exposes accessible scene controls', sceneBar.includes('aria-label="Scenes"') && sceneBar.includes('aria-label="Add scene"') && sceneBar.includes('aria-pressed={scene.id === activeId}')],
  ['sequential playback advances to the next scene when preview looping is off', scenes.includes('export function advanceSceneForPlayback(): boolean') && scenes.includes('const next = scenes[index + 1]') && scenes.includes('time: 0')],
  ['scene sequence playback keeps transport running across a scene boundary', app.includes('advanceSceneForPlayback()') && app.includes('raf = requestAnimationFrame(tick)')],
  ['playback clamps malformed scene durations before modulo arithmetic', app.includes('Number.isFinite(s.doc.duration) ? Math.max(0.01, s.doc.duration) : 0.01')],
  ['scene strip has mobile touch targets', css.includes('.scene-bar') && css.includes('.scene-add, .scene-delete, .scene-rename, .scene-duplicate, .scene-order { min-width: 36px')],
];
for (const [name, ok] of checks) {
  assert.equal(ok, true, `Mobile regression check failed: ${name}`);
  process.stdout.write(`PASS ${name}\n`);
}
process.stdout.write(`\n${checks.length} mobile regression checks passed.\n`);
