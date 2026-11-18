import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const store = readFileSync(new URL('../src/state/store.ts', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
const sceneBar = readFileSync(new URL('../src/components/SceneBar.tsx', import.meta.url), 'utf8');
const canvas = readFileSync(new URL('../src/components/Canvas.tsx', import.meta.url), 'utf8');
const tl = readFileSync(new URL('../src/components/Timeline.tsx', import.meta.url), 'utf8');
const ic = readFileSync(new URL('../src/components/Icon.tsx', import.meta.url), 'utf8');
const factory = readFileSync(new URL('../src/model/factory.ts', import.meta.url), 'utf8');
const actions = readFileSync(new URL('../src/state/actions.ts', import.meta.url), 'utf8');
const types = readFileSync(new URL('../src/model/types.ts', import.meta.url), 'utf8');
const scenes = readFileSync(new URL('../src/state/scenes.ts', import.meta.url), 'utf8');
const files = readFileSync(new URL('../src/io/files.ts', import.meta.url), 'utf8');
const assets = readFileSync(new URL('../src/model/assets.ts', import.meta.url), 'utf8');
const sceneState = readFileSync(new URL('../src/state/scenes.ts', import.meta.url), 'utf8');
const mediaImport = readFileSync(new URL('../src/components/MediaImportButton.tsx', import.meta.url), 'utf8');
const mediaLibrary = readFileSync(new URL('../src/io/mediaLibrary.ts', import.meta.url), 'utf8');
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
  ['scene model defines independent video, audio and overlay timeline lanes', types.includes("export type TimelineTrackKind = 'video' | 'audio' | 'overlay'") && types.includes('export interface TimelineTrack') && types.includes('export interface TimelineClip')],
  ['new and migrated projects receive normalized independent media lanes', factory.includes('createDefaultTimelineTracks()') && factory.includes('normalizeTimelineTracks(d.timelineTracks') && factory.includes('timelineTracks: doc.timelineTracks ?? createDefaultTimelineTracks()')],
  ['media lanes persist with scene snapshots and restore on scene switch', factory.includes('timelineTracks: doc.timelineTracks ?? createDefaultTimelineTracks()') && scenes.includes('timelineTracks: scene.timelineTracks ?? []')],
  ['duplicating scenes regenerates track and clip identities', scenes.includes('timelineTracks: (source.timelineTracks ?? []).map((track) => ({') && scenes.includes('clips: track.clips.map((clip) => ({ ...clip, id: uid() }))')],
  ['timeline exposes independent video, audio and overlay lane creation controls', tl.includes("addMediaTrack('video')") && tl.includes("addMediaTrack('audio')") && tl.includes("addMediaTrack('overlay')")],
  ['media lane names, visibility, mute state and lock state are editable', tl.includes('onBlur={(e) => { const name = e.currentTarget.value.trim().slice(0, 60)') && tl.includes('visible: !track.visible') && tl.includes('muted: !track.muted') && tl.includes('locked: !track.locked')],
  ['media track icons are defined instead of falling back to the generic help icon', ic.includes("film: '") && ic.includes("'volume-2': '") && ic.includes("'volume-x': '")],
  ['media clips are positioned in the timeline using start and duration', tl.includes('clip.start * pps') && tl.includes('clip.duration * pps')],
  ['timeline exposes the media import control', tl.includes('MediaImportButton') && mediaImport.includes('Import media')],
  ['media import accepts audio, video and image files with a bounded size', mediaImport.includes('audio/*,video/*,image/*') && mediaImport.includes('250 * 1024 * 1024')],
  ['original media blobs are stored in IndexedDB outside project JSON', mediaLibrary.includes("indexedDB.open(DB_NAME, DB_VERSION)") && mediaImport.includes('storeMediaAsset(file)') && !mediaImport.includes('readAsDataURL')],
  ['media imports create typed clips at the playhead in compatible tracks', mediaImport.includes('start: Math.max(0, state.time)') && mediaImport.includes("kind: isAudio ? 'audio' : isVideo ? 'video' : 'image'") && mediaImport.includes('compatibleTrack(tracks, kind)')],
  ['media import does not mutate the existing timeline track array', mediaImport.includes('const tracks = [...(state.doc.timelineTracks ?? [])]')],
  ['media clips support pointer dragging with snap increments', tl.includes("mode: 'move' | 'trim-start' | 'trim-end'") && tl.includes('const rawDelta = (ev.clientX - x0) / pps') && tl.includes('Math.round(rawDelta / step) * step')],
  ['media clip movement and trimming respect locked tracks', tl.includes('if (!track || !clip || track.locked) return')],
  ['media clip movement never starts before timeline zero', tl.includes("start = Math.max(0, Math.round((start0 + delta) * 1000) / 1000)")],
  ['media clip trims preserve a minimum duration and non-negative source offset', tl.includes('duration0 - 0.1, delta') && tl.includes('Math.max(0.1') && tl.includes('sourceStart = Math.max(0')],
  ['media clips expose independent start and end trim handles', tl.includes("startClipEdit(e, track.id, clip.id, 'trim-start')") && tl.includes("startClipEdit(e, track.id, clip.id, 'trim-end')")],
  ['media clips are keyboard focusable and expose accessible labels', tl.includes('role="button" tabIndex={track.locked ? -1 : 0}') && tl.includes('aria-label={`${clip.name}, starts at')],
  ['keyboard arrows nudge media clips and delete removes the selected clip', tl.includes("e.key === 'Delete' || e.key === 'Backspace'") && tl.includes("e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0") && tl.includes('clips: item.clips.filter((entry) => entry.id !== clip.id)')],
  ['selected media clips and keyboard focus are visually indicated', css.includes('.media-clip.selected') && css.includes('.media-clip:focus-visible')],
  ['media clip editing is touch-safe and provides visible trim handles', css.includes('.media-clip-handle') && css.includes('cursor: ew-resize') && css.includes('.media-clip {') && css.includes('touch-action: none')],
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
  ['live preview resolves the previous and incoming scenes from the active scene index', canvas.includes('const outgoingScene = sceneIndex > 0 ? doc.scenes?.[sceneIndex - 1] : undefined') && canvas.includes('const incomingScene = sceneIndex > 0 ? doc.scenes?.[sceneIndex] : undefined')],
  ['live preview renders the outgoing scene final frame without intercepting pointer input', canvas.includes('editorMarkup(outgoingScene.elements, outgoingScene.duration)') && canvas.includes('pointerEvents="none"')],
  ['live preview applies scene entrance transforms and fade/zoom opacity', canvas.includes('const transitionTransform = transitionProgress === null') && canvas.includes('transform={transitionProgress !== null ? transitionTransform : undefined}') && canvas.includes('transition.type.startsWith(\'zoom-\')')],
  ['live preview supports wipe clipping on the incoming scene', canvas.includes('__scene-preview-wipe') && canvas.includes("clipPath={transitionProgress !== null && transition?.type === 'wipe'")],
  ['live preview applies inverse outgoing motion for directional slides and zooms', canvas.includes('const outgoingTransform = transitionProgress === null') && canvas.includes("scale(' + fmt(1 + 0.18 * progress)") && canvas.includes("scale(' + fmt(1 - 0.18 * progress)")],
  ['live preview reveals dissolve cells through a bounded SVG mask', canvas.includes('__scene-preview-dissolve') && canvas.includes('dissolveCells.map') && canvas.includes("mask={transitionProgress !== null && transition?.type === 'dissolve'")],
  ['transition duration is contained within the incoming scene timeline', files.includes('Math.round(Math.max(0.1, transition.duration) * fps)') && files.includes('Math.min(times.length')],
  ['transition controls have responsive touch-sized fields', css.includes('.scene-transition-controls') && css.includes('@media (max-width: 700px)')],
  ['scene bar exposes duplicate and ordering controls', sceneBar.includes('aria-label="Duplicate active scene"') && sceneBar.includes('aria-label="Move scene earlier"') && sceneBar.includes('aria-label="Move scene later"')],
  ['scene strip exposes accessible scene controls', sceneBar.includes('aria-label="Scenes"') && sceneBar.includes('aria-label="Add scene"') && sceneBar.includes('aria-pressed={scene.id === activeId}')],
  ['sequential playback advances to the next scene when preview looping is off', scenes.includes('export function advanceSceneForPlayback(): boolean') && scenes.includes('const next = scenes[index + 1]') && scenes.includes('time: 0')],
  ['scene sequence playback keeps transport running across a scene boundary', app.includes('advanceSceneForPlayback()') && app.includes('raf = requestAnimationFrame(tick)')],
  ['scene sequence playback carries delayed-frame overflow into following scenes', app.includes('let overflow = t - D') && app.includes('overflow -= nextDuration') && app.includes('if (!advanced)')],
  ['playback clamps malformed scene durations before modulo arithmetic', app.includes('Number.isFinite(s.doc.duration) ? Math.max(0.01, s.doc.duration) : 0.01')],
  ['scene strip has mobile touch targets', css.includes('.scene-bar') && css.includes('.scene-add, .scene-delete, .scene-rename, .scene-duplicate, .scene-order { min-width: 36px')],
];
for (const [name, ok] of checks) {
  assert.equal(ok, true, `Mobile regression check failed: ${name}`);
  process.stdout.write(`PASS ${name}\n`);
}
process.stdout.write(`\n${checks.length} mobile regression checks passed.\n`);
