import type { Doc, Scene, SceneTransitionType, TimelineTrack } from '../model/types';
import { exportSvg } from '../engine/render';
import { zip, unzipStored } from './zip';
import { deleteMediaAsset, readMediaAsset, storeMediaAssetBlob } from './mediaLibrary';

export function download(data: Blob | string, filename: string, type = 'application/octet-stream') {
  const blob = typeof data === 'string' ? new Blob([data], { type }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const safeName = (doc: Doc) => (doc.name || 'animation').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'animation';

type BundleAsset = { source: string; path: string; name: string; type: string };
type AnimoraBundle = { app: 'animora-bundle'; version: 1; project: Doc; assets: BundleAsset[] };

function projectTracks(project: Doc): TimelineTrack[][] {
  return [
    project.timelineTracks ?? [],
    ...(project.scenes ?? []).map((scene) => scene.timelineTracks ?? []),
  ];
}

/** Export project JSON and all referenced IndexedDB media into one portable ZIP. */
export async function exportProjectBundle(doc: Doc, onProgress: (progress: number) => void = () => undefined): Promise<void> {
  const project = JSON.parse(JSON.stringify(doc)) as Doc;
  const references = new Map<string, string>();
  for (const tracks of projectTracks(project)) {
    for (const track of tracks) for (const clip of track.clips) {
      if (!references.has(clip.source)) references.set(clip.source, clip.name);
    }
  }
  const seen = new Map<string, BundleAsset>();
  const files: { name: string; data: Uint8Array<ArrayBuffer> }[] = [];
  let completed = 0;
  let totalBytes = 0;
  const maxBundleBytes = 550 * 1024 * 1024;
  for (const [source, clipName] of references) {
    const asset = await readMediaAsset(source);
    if (!asset) throw new Error(`Missing media asset: ${clipName}. Re-import it before bundling this project.`);
    const ext = (asset.name.match(/\.([a-z0-9]{1,8})$/i)?.[1] ?? 'bin').toLowerCase();
    if (totalBytes + asset.blob.size > maxBundleBytes) throw new Error('The portable project exceeds the 550 MB media bundle limit. Remove unused or large media before exporting.');
    totalBytes += asset.blob.size;
    const path = `assets/media-${seen.size + 1}.${ext}`;
    seen.set(source, { source, path, name: asset.name, type: asset.type });
    files.push({ name: path, data: new Uint8Array(await asset.blob.arrayBuffer()) });
    completed++;
    onProgress(references.size ? completed / references.size : 1);
  }
  if (references.size === 0) onProgress(1);
  const manifest: AnimoraBundle = {
    app: 'animora-bundle',
    version: 1,
    project,
    assets: [...seen.values()],
  };
  files.unshift({ name: 'manifest.json', data: new TextEncoder().encode(JSON.stringify(manifest)) });
  download(zip(files), `${safeName(doc)}.animora.zip`, 'application/zip');
}

/** Restore a portable Animora bundle into this browser's media library and return project JSON. */
export async function importProjectBundle(file: Blob): Promise<string> {
  const entries = await unzipStored(file);
  const manifestFile = entries.get('manifest.json');
  if (!manifestFile) throw new Error('This ZIP is not an Animora project bundle (manifest.json is missing).');
  let manifest: AnimoraBundle;
  try {
    manifest = JSON.parse(new TextDecoder().decode(manifestFile)) as AnimoraBundle;
  } catch {
    throw new Error('The Animora project manifest is invalid.');
  }
  if (manifest.app !== 'animora-bundle' || manifest.version !== 1 || !manifest.project || !Array.isArray(manifest.assets)) {
    throw new Error('Unsupported or invalid Animora project bundle.');
  }
  const sourceMap = new Map<string, string>();
  const restoredKeys: string[] = [];
  const assetPaths = new Set<string>();
  for (const item of manifest.assets) {
    if (!item || typeof item.source !== 'string' || !item.source || typeof item.path !== 'string'
      || !item.path.startsWith('assets/') || assetPaths.has(item.path)) {
      throw new Error('The project bundle contains an invalid media asset reference.');
    }
    assetPaths.add(item.path);
    if (!entries.has(item.path)) throw new Error(`The project bundle is missing ${item.path}.`);
  }
  try {
    for (const item of manifest.assets) {
      const data = entries.get(item.path)!;
      const blob = new Blob([data], { type: item.type || 'application/octet-stream' });
      const key = await storeMediaAssetBlob(blob, item.name || item.path, item.type || blob.type);
      restoredKeys.push(key);
      sourceMap.set(item.source, key);
    }
    const project = manifest.project;
    for (const tracks of projectTracks(project)) {
      for (const track of tracks) {
        for (const clip of track.clips) {
          const restored = sourceMap.get(clip.source);
          if (!restored) throw new Error(`No bundled media was found for “${clip.name}”.`);
          clip.source = restored;
        }
      }
    }
  return JSON.stringify(project);
  } catch (error) {
    await Promise.all(restoredKeys.map((key) => deleteMediaAsset(key).catch(() => undefined)));
    throw error;
  }
}

export function saveProject(doc: Doc) {
  download(JSON.stringify({ app: 'animora', ...doc }, null, 1), `${safeName(doc)}.animora.json`, 'application/json');
}

export function exportAnimatedSvg(doc: Doc) {
  download(exportSvg(doc, { animated: true }), `${safeName(doc)}.svg`, 'image/svg+xml');
}

export function exportStaticSvg(doc: Doc, time: number) {
  download(exportSvg(doc, { animated: false, time }), `${safeName(doc)}-${time.toFixed(2)}s.svg`, 'image/svg+xml');
}

export const svgDataUrl = (svg: string) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Frame failed to render'));
    img.src = src;
  });
}

async function drawFrame(ctx: CanvasRenderingContext2D, doc: Doc, time: number, scale: number, opaque: boolean) {
  const img = await loadImage(svgDataUrl(exportSvg(doc, { animated: false, time })));
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  if (opaque) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(img, 0, 0, doc.width * scale, doc.height * scale);
}

export async function exportPng(doc: Doc, time: number, scale = 2) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(doc.width * scale);
  canvas.height = Math.round(doc.height * scale);
  await drawFrame(canvas.getContext('2d')!, doc, time, scale, false);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  if (blob) download(blob, `${safeName(doc)}-${time.toFixed(2)}s.png`);
}

/** Records the animation into a WebM video in real time using MediaRecorder. */
export async function exportWebm(doc: Doc, onProgress: (p: number) => void, fps = 30): Promise<void> {
  if (typeof MediaRecorder === 'undefined') throw new Error('Video recording is not supported in this browser.');
  const canvas = document.createElement('canvas');
  const scale = Math.min(2, 1920 / Math.max(doc.width, doc.height)) || 1;
  canvas.width = Math.round((doc.width * scale) / 2) * 2;
  canvas.height = Math.round((doc.height * scale) / 2) * 2;
  const ctx = canvas.getContext('2d')!;
  const stream = canvas.captureStream(fps);
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
  const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  let started = false;
  let stopped: Promise<void> | null = null;

  try {
    await drawFrame(ctx, doc, 0, scale, true);
    stopped = new Promise<void>((resolve) => { rec.onstop = () => resolve(); });
    rec.start();
    started = true;
    const times = cycleTimes(doc, fps);
    const start = performance.now();
    for (let i = 0; i < times.length; i++) {
      await drawFrame(ctx, doc, times[i], scale, true);
      onProgress((i + 1) / times.length);
      const wait = start + ((i + 1) * 1000) / fps - performance.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    }
    rec.stop();
    await stopped;
    download(new Blob(chunks, { type: 'video/webm' }), `${safeName(doc)}.webm`);
  } catch (error) {
    if (started && rec.state !== 'inactive') rec.stop();
    if (started && stopped) await stopped;
    throw error;
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}


function sceneDocument(parent: Doc, scene: Scene): Doc {
  return {
    ...parent,
    ...scene,
    name: parent.name,
    scenes: undefined,
    activeSceneId: scene.id,
  };
}

async function drawSceneFrame(
  ctx: CanvasRenderingContext2D,
  doc: Doc,
  time: number,
  outputWidth: number,
  outputHeight: number,
) {
  const img = await loadImage(svgDataUrl(exportSvg(doc, { animated: false, time })));
  ctx.clearRect(0, 0, outputWidth, outputHeight);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outputWidth, outputHeight);
  const fit = Math.min(outputWidth / doc.width, outputHeight / doc.height);
  const width = doc.width * fit;
  const height = doc.height * fit;

  ctx.drawImage(img, (outputWidth - width) / 2, (outputHeight - height) / 2, width, height);
}

function fittedSceneRect(doc: Doc, outputWidth: number, outputHeight: number) {
  const fit = Math.min(outputWidth / doc.width, outputHeight / doc.height);
  const width = doc.width * fit;
  const height = doc.height * fit;
  return { x: (outputWidth - width) / 2, y: (outputHeight - height) / 2, width, height };
}

function paintSceneImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  doc: Doc,
  outputWidth: number,
  outputHeight: number,
  options: { alpha?: number; offsetX?: number; offsetY?: number; scale?: number } = {},
) {
  const rect = fittedSceneRect(doc, outputWidth, outputHeight);
  const scale = options.scale ?? 1;
  const width = rect.width * scale;
  const height = rect.height * scale;
  const x = (outputWidth - width) / 2 + (options.offsetX ?? 0);
  const y = (outputHeight - height) / 2 + (options.offsetY ?? 0);
  ctx.save();
  ctx.globalAlpha = options.alpha ?? 1;
  ctx.drawImage(image, x, y, width, height);
  ctx.restore();
}

/** Composite one incoming scene frame with the previous scene's final frame. */
function drawSceneTransition(
  ctx: CanvasRenderingContext2D,
  outgoing: HTMLImageElement,
  incoming: HTMLImageElement,
  outgoingDoc: Doc,
  incomingDoc: Doc,
  outputWidth: number,
  outputHeight: number,
  type: SceneTransitionType,
  progress: number,
) {
  const p = Math.max(0, Math.min(1, progress));
  ctx.clearRect(0, 0, outputWidth, outputHeight);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outputWidth, outputHeight);

  if (type === 'slide-left' || type === 'slide-right' || type === 'slide-up' || type === 'slide-down') {
    const horizontal = type === 'slide-left' || type === 'slide-right';
    const direction = type === 'slide-left' || type === 'slide-up' ? -1 : 1;
    const distance = horizontal ? outputWidth : outputHeight;
    const oldOffset = direction * p * distance;
    const newOffset = -direction * (1 - p) * distance;
    paintSceneImage(ctx, outgoing, outgoingDoc, outputWidth, outputHeight, horizontal
      ? { offsetX: oldOffset } : { offsetY: oldOffset });
    paintSceneImage(ctx, incoming, incomingDoc, outputWidth, outputHeight, horizontal
      ? { offsetX: newOffset } : { offsetY: newOffset });
    return;
  }

  if (type === 'wipe') {
    paintSceneImage(ctx, outgoing, outgoingDoc, outputWidth, outputHeight);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, outputWidth * p, outputHeight);
    ctx.clip();
    paintSceneImage(ctx, incoming, incomingDoc, outputWidth, outputHeight);
    ctx.restore();
    return;
  }

  if (type === 'dissolve') {
    paintSceneImage(ctx, outgoing, outgoingDoc, outputWidth, outputHeight);
    const columns = 24;
    const rows = 14;
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const index = row * columns + column;
        const noise = (Math.imul(index + 1, 2654435761) >>> 0) / 4294967296;
        if (noise >= p) continue;
        const left = Math.floor((column * outputWidth) / columns);
        const top = Math.floor((row * outputHeight) / rows);
        const right = Math.ceil(((column + 1) * outputWidth) / columns);
        const bottom = Math.ceil(((row + 1) * outputHeight) / rows);
        ctx.save();
        ctx.beginPath();
        ctx.rect(left, top, right - left, bottom - top);
        ctx.clip();
        paintSceneImage(ctx, incoming, incomingDoc, outputWidth, outputHeight);
        ctx.restore();
      }
    }
    return;
  }

  if (type === 'fade') {
    paintSceneImage(ctx, outgoing, outgoingDoc, outputWidth, outputHeight, { alpha: 1 - p });
    paintSceneImage(ctx, incoming, incomingDoc, outputWidth, outputHeight, { alpha: p });
    return;
  }

  if (type === 'zoom-in') {
    paintSceneImage(ctx, outgoing, outgoingDoc, outputWidth, outputHeight);
    paintSceneImage(ctx, incoming, incomingDoc, outputWidth, outputHeight, { alpha: p, scale: 0.86 + 0.14 * p });
    return;
  }

  if (type === 'zoom-out') {
    paintSceneImage(ctx, outgoing, outgoingDoc, outputWidth, outputHeight, { alpha: 1 - p, scale: 1 + 0.14 * p });
    paintSceneImage(ctx, incoming, incomingDoc, outputWidth, outputHeight, { alpha: p });
    return;
  }

  // A safe cross-fade is the fallback for unknown future transition values.
  paintSceneImage(ctx, outgoing, outgoingDoc, outputWidth, outputHeight, { alpha: 1 - p });
  paintSceneImage(ctx, incoming, incomingDoc, outputWidth, outputHeight, { alpha: p });
}

/** Records every scene in project order into one continuous WebM video. */
export async function exportWebmScenes(doc: Doc, onProgress: (p: number) => void, fps = 30): Promise<void> {
  if (typeof MediaRecorder === 'undefined') throw new Error('Video recording is not supported in this browser.');
  const storedScenes = doc.scenes ?? [];
  if (storedScenes.length <= 1) return exportWebm(doc, onProgress, fps);
  const scenes = storedScenes.map((scene) =>
    scene.id === doc.activeSceneId
      ? { ...scene, width: doc.width, height: doc.height, background: doc.background, duration: doc.duration, loop: doc.loop, iterations: doc.iterations, direction: doc.direction, trigger: doc.trigger, fillMode: doc.fillMode, speed: doc.speed, elements: doc.elements, defs: doc.defs, guides: doc.guides, comments: doc.comments, camera: doc.camera }
      : scene,
  );
  const sceneDocs = scenes.map((scene) => sceneDocument(doc, scene));
  const frameLists = sceneDocs.map((sceneDoc) => cycleTimes(sceneDoc, fps));
  const totalFrames = frameLists.reduce((sum, frames) => sum + frames.length, 0);
  const scale = Math.min(2, 1920 / Math.max(doc.width, doc.height)) || 1;
  const width = Math.max(2, Math.round((doc.width * scale) / 2) * 2);
  const height = Math.max(2, Math.round((doc.height * scale) / 2) * 2);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create a video canvas.');
  const stream = canvas.captureStream(fps);
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((type) => MediaRecorder.isTypeSupported(type));
  const recorder = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  const stopped = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });
  let completed = 0;
  let started = false;
  try {
    await drawSceneFrame(ctx, sceneDocs[0], frameLists[0][0] ?? 0, width, height);
    recorder.start();
    started = true;
    const start = performance.now();
    let previousSceneStill: HTMLImageElement | null = null;
    for (let sceneIndex = 0; sceneIndex < sceneDocs.length; sceneIndex++) {
      const sceneDoc = sceneDocs[sceneIndex];
      const times = frameLists[sceneIndex];
      const transition = scenes[sceneIndex].transitionIn ?? { type: 'none' as const, duration: 0.6 };
      const transitionFrames = sceneIndex > 0 && transition.type !== 'none'
        ? Math.min(times.length, Math.max(1, Math.round(Math.max(0.1, transition.duration) * fps)))
        : 0;
      const previousDoc = sceneIndex > 0 ? sceneDocs[sceneIndex - 1] : null;

      for (let frameIndex = 0; frameIndex < times.length; frameIndex++) {
        const time = times[frameIndex];
        if (frameIndex < transitionFrames && previousSceneStill && previousDoc) {
          const incoming = await loadImage(svgDataUrl(exportSvg(sceneDoc, { animated: false, time })));
          const progress = transitionFrames <= 1 ? 1 : frameIndex / (transitionFrames - 1);
          drawSceneTransition(
            ctx, previousSceneStill, incoming, previousDoc, sceneDoc, width, height,
            transition.type, progress,
          );
        } else {
          await drawSceneFrame(ctx, sceneDoc, time, width, height);
        }
        completed++;
        onProgress(completed / totalFrames);
        const wait = start + (completed * 1000) / fps - performance.now();
        if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      }

      const finalTime = times.length ? times[times.length - 1] : 0;
      previousSceneStill = await loadImage(svgDataUrl(exportSvg(sceneDoc, { animated: false, time: finalTime })));
    }
    recorder.stop();
    await stopped;
    download(new Blob(chunks, { type: 'video/webm' }), `${safeName(doc)}-all-scenes.webm`);
  } catch (error) {
    if (started && recorder.state !== 'inactive') recorder.stop();
    if (started) await stopped;
    throw error;
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

/** Frame times for one exported cycle, honoring the playback direction and speed. */
export function cycleTimes(doc: Doc, fps: number): number[] {
  const D = Math.max(0.01, doc.duration);
  const speed = Math.max(1, doc.speed || 100) / 100;
  const n = Math.max(1, Math.round((D / speed) * fps));
  const forward = Array.from({ length: n }, (_, i) => (i / n) * D);
  const back = forward.map((t) => D - t);
  switch (doc.direction) {
    case 'reverse': return back;
    case 'alternate': return [...forward, ...back];
    case 'alternate-reverse': return [...back, ...forward];
    default: return forward;
  }
}

async function renderFrames(doc: Doc, times: number[], scale: number, opaque: boolean, onProgress: (p: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(doc.width * scale));
  canvas.height = Math.max(1, Math.round(doc.height * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const out: Uint8ClampedArray[] = [];
  for (let i = 0; i < times.length; i++) {
    await drawFrame(ctx, doc, times[i], scale, opaque);
    out.push(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
    onProgress((i + 1) / times.length);
  }
  return { frames: out, canvas, ctx };
}

export async function exportGif(doc: Doc, o: { fps: number; scale: number; transparent: boolean }, onProgress: (p: number) => void) {
  const { encodeGif } = await import('./gif');
  const times = cycleTimes(doc, o.fps);
  const { frames, canvas } = await renderFrames(doc, times, o.scale, !o.transparent, (p) => onProgress(p * 0.8));
  // Let the progress bar paint before the (synchronous) encode.
  await new Promise((r) => setTimeout(r, 30));
  const bytes = encodeGif(frames, {
    width: canvas.width, height: canvas.height, delay: 1 / o.fps, loops: doc.loop ? 0 : Math.max(1, doc.iterations) - 1, transparent: o.transparent,
  });
  onProgress(1);
  download(new Blob([bytes], { type: 'image/gif' }), `${safeName(doc)}.gif`);
}

export async function exportPngSequence(doc: Doc, o: { fps: number; scale: number }, onProgress: (p: number) => void) {
  const { zip } = await import('./zip');
  const times = cycleTimes(doc, o.fps);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(doc.width * o.scale));
  canvas.height = Math.max(1, Math.round(doc.height * o.scale));
  const ctx = canvas.getContext('2d')!;
  const files: { name: string; data: Uint8Array<ArrayBuffer> }[] = [];
  const pad = String(times.length).length;
  for (let i = 0; i < times.length; i++) {
    await drawFrame(ctx, doc, times[i], o.scale, false);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
    if (blob) files.push({ name: `${safeName(doc)}_${String(i).padStart(pad, '0')}.png`, data: new Uint8Array(await blob.arrayBuffer()) });
    onProgress((i + 1) / times.length);
  }
  download(zip(files), `${safeName(doc)}-frames.zip`);
}
