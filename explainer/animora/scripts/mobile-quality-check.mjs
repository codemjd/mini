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
const mediaImportFlow = readFileSync(new URL('../src/io/mediaImport.ts', import.meta.url), 'utf8');
const mediaLibrary = readFileSync(new URL('../src/io/mediaLibrary.ts', import.meta.url), 'utf8');
const audioPreview = readFileSync(new URL('../src/components/AudioPreview.tsx', import.meta.url), 'utf8');
const visualPreview = readFileSync(new URL('../src/components/VisualMediaPreview.tsx', import.meta.url), 'utf8');
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
  ['locked media tracks disable selected clip audio controls', tl.includes('disabled={selectedMedia.track.locked}')],
  ['selected media clips expose touch-friendly mute and volume controls', tl.includes('aria-label="Selected media clip controls"') && tl.includes('aria-label="Selected clip volume"') && tl.includes('updateMediaClip(selectedMedia.track.id')],
  ['selected clip audio controls receive responsive phone styling', css.includes('.media-clip-controls') && css.includes('@media (max-width: 700px)') && css.includes('.media-clip-control-name')],
  ['media clips expose keyboard mute and bounded gain controls', tl.includes("e.key.toLowerCase() === 'm'") && tl.includes("e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_'") && tl.includes('Math.max(0, Math.min(1, Math.round(((entry.volume ?? 1) + delta) * 10) / 10))')],
  ['clip accessibility labels announce mute state and volume', tl.includes("clip.muted ? 'muted' : 'unmuted'") && tl.includes('volume ${Math.round((clip.volume ?? 1) * 100)} percent')],
  ['media clips are positioned in the timeline using start and duration', tl.includes('clip.start * pps') && tl.includes('clip.duration * pps')],
  ['timeline exposes the media import control', tl.includes('MediaImportButton') && mediaImport.includes('Import media')],
  ['media import accepts audio, video and image files with a bounded size', mediaImport.includes('audio/*,video/*,image/*') && mediaImportFlow.includes('250 * 1024 * 1024')],
  ['original media blobs are stored in IndexedDB outside project JSON', mediaLibrary.includes("indexedDB.open(DB_NAME, DB_VERSION)") && mediaImportFlow.includes('storeMediaAsset(file)') && !mediaImportFlow.includes('readAsDataURL')],
  ['visual media preview is integrated into the SVG artboard below vector layers', canvas.includes("import { VisualMediaPreview } from './VisualMediaPreview'") && canvas.includes('<VisualMediaPreview />') && canvas.includes('className="artboard"')],
  ['visual media preview resolves image and video blobs from the local media library', visualPreview.includes('readMediaAsset(clip.source)') && visualPreview.includes("clip.kind === 'video' || clip.kind === 'image'") && visualPreview.includes('URL.createObjectURL(asset.blob)')],
  ['image clips render as aspect-preserving artboard images', visualPreview.includes('<image key={clip.id}') && visualPreview.includes('preserveAspectRatio="xMidYMid meet"')],
  ['video clips render in a muted inline SVG foreignObject layer', visualPreview.includes('<foreignObject key={clip.id}') && visualPreview.includes('<video') && visualPreview.includes('video.muted = track.muted || clip.muted') && visualPreview.includes('playsInline')],
  ['video preview follows clip source offsets, playhead and transport state', visualPreview.includes('clip.sourceStart + time - clip.start') && visualPreview.includes('video.currentTime = sourceTime') && visualPreview.includes('if (playing)')],
  ['visual media preview hides inactive or invisible tracks and releases object URLs', visualPreview.includes('!track.visible') && visualPreview.includes('video.pause()') && visualPreview.includes('URL.revokeObjectURL(asset.url)')],
  ['audio preview is mounted in the editor transport', app.includes("import { AudioPreview } from './components/AudioPreview'") && app.includes('<AudioPreview />')],
  ['audio preview resolves stored media blobs into revocable object URLs', audioPreview.includes('readMediaAsset(clip.source)') && audioPreview.includes('URL.createObjectURL(asset.blob)') && audioPreview.includes('URL.revokeObjectURL(item.url)')],
  ['transport starts audio in the direct user gesture to satisfy mobile playback policies', tl.includes("window.dispatchEvent(new Event('animora:media-play'))") && audioPreview.includes("window.addEventListener('animora:media-play', startFromGesture)")],
  ['transport starts video in the direct user gesture and handles blocked playback', visualPreview.includes("window.addEventListener('animora:media-play', startFromGesture)") && visualPreview.includes('video.play().catch')],
  ['audio preview synchronizes active clips to source time and transport state', audioPreview.includes('clip.sourceStart + time - clip.start') && audioPreview.includes('playing && !track.muted && !clip.muted') && audioPreview.includes('audio.currentTime = target')],
  ['audio preview respects per-track mute and per-clip volume', audioPreview.includes('audio.muted = track.muted || clip.muted') && audioPreview.includes('audio.volume = Math.max(0, Math.min(1')],
  ['audio preview pauses inactive clips and releases decoders on unmount', audioPreview.includes('audio.pause()') && audioPreview.includes('mediaRef.current.clear()')],
  ['media importer recognizes common audio/video/image extensions without MIME metadata', mediaImportFlow.includes('/\\\\.(mp3|wav|ogg|oga|m4a|aac|flac|opus)$/i') && mediaImportFlow.includes('/\\\\.(mp4|m4v|webm|mov|mkv|avi|ogv)$/i') && mediaImportFlow.includes('/\\\\.(png|jpe?g|gif|webp|bmp|avif)$/i')],
  ['main import and drag-drop flow routes audio/video files to the timeline', app.includes("importMediaFilesToTimeline([file])") && app.includes('audio/*,video/*') && app.includes('Drop an SVG, image, audio, video or Animora project')],
  ['timeline and main import share one media-to-timeline importer', mediaImport.includes('importMediaFilesToTimeline(files)') && mediaImportFlow.includes('export async function importMediaFilesToTimeline')],
  ['media imports create typed clips at the playhead in compatible tracks', mediaImportFlow.includes('start: Math.max(0, state.time)') && mediaImportFlow.includes("kind: isAudio ? 'audio' : isVideo ? 'video' : 'image'") && mediaImportFlow.includes('compatibleTrack(tracks, kind)')],
  ['importing media extends the active scene to cover the full imported clip', mediaImportFlow.includes('duration: Math.max(state.doc.duration, clip.start + clip.duration)')],
  ['moving or trimming clips extends scene duration instead of truncating media playback', tl.includes('duration: Math.max(getState().doc.duration, start + duration)') && tl.includes('duration: Math.max(getState().doc.duration, nextStart + clip.duration)')],
  ['media import does not mutate the existing timeline track array', mediaImportFlow.includes('const tracks = [...(state.doc.timelineTracks ?? [])]')],
  ['media clips support pointer dragging with snap increments', tl.includes("mode: 'move' | 'trim-start' | 'trim-end'") && tl.includes('const rawDelta = (ev.clientX - x0) / pps') && tl.includes('Math.round(rawDelta / step) * step')],
  ['media clip move and trim edges magnetically snap to playhead and neighboring clip edges, with Alt bypass', tl.includes('const snapMediaTime = (time: number') && tl.includes('candidates = [0, state.time]') && tl.includes('snapMediaTime(start0 + delta') && tl.includes("snapMediaTime(proposed, trackId, clipId, 'start', ev.altKey)") && tl.includes("snapMediaTime(proposedEnd, trackId, clipId, 'end', ev.altKey)") && tl.includes('hold Alt to disable snapping')],
  ['media clip movement and trimming respect locked tracks', tl.includes('if (!track || !clip || track.locked) return')],
  ['media clip movement never starts before timeline zero', tl.includes("start = Math.max(0, target)") && tl.includes("const target = snapMediaTime(start0 + delta")],
  ['media clip trims preserve a minimum duration and non-negative source offset', tl.includes('start0 + duration0 - 0.1') && tl.includes('Math.max(0.1') && tl.includes('sourceStart = Math.max(0')],
  ['media clips retain original source duration for safe trim bounds', types.includes('sourceDuration: number') && mediaImportFlow.includes('sourceDuration: duration') && factory.includes('sourceStart + rawDuration')],
  ['legacy media clips are normalized without exceeding their source duration', factory.includes('Math.min(rawDuration, Math.max(0, sourceDuration - sourceStart))')],
  ['trim-end cannot extend a clip beyond the remaining source media', tl.includes('const availableSource = Math.max(0, clip.sourceDuration - sourceStart0)') && tl.includes('const maxEnd = start0 + availableSource') && tl.includes('Math.min(availableSource, Math.max(0.1')],
  ['media clips can be duplicated after the source clip with a fresh identity', tl.includes('const duplicateMediaClip = (trackId: string, clipId: string)') && tl.includes("name: clip.name + ' (copy)'") && tl.includes('start: Math.round((clip.start + clip.duration) * 1000) / 1000') && tl.includes("e.key.toLowerCase() === 'd'")],
  ['media clips can split at the playhead without breaking source-time continuity', tl.includes('const splitMediaClip = (trackId: string, clipId: string)') && tl.includes('sourceStart: Math.round((clip.sourceStart + offset) * 1000) / 1000') && tl.includes('e.key.toLowerCase() === \'s\'')],
  ['media clip splitting enforces a minimum 0.1 second segment', tl.includes('if (offset < 0.1 || offset > clip.duration - 0.1) return')],
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
  ['single-scene WebM export falls back when no preferred MIME type is reported and always releases capture tracks', files.includes("...(mime ? { mimeType: mime } : {})") && files.includes("finally {\n    stream.getTracks().forEach((track) => track.stop());") && files.includes("if (started && rec.state !== 'inactive') rec.stop();")],
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
