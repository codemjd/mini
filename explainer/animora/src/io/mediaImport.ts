import { patchDoc } from '../state/actions';
import { getState, notify } from '../state/store';
import { uid } from '../model/factory';
import type { TimelineClip, TimelineTrack, TimelineTrackKind } from '../model/types';
import { storeMediaAsset } from './mediaLibrary';

function mediaDuration(file: File): Promise<number> {
  if (file.type.startsWith('image/')) return Promise.resolve(5);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const media = document.createElement(file.type.startsWith('audio/') ? 'audio' : 'video');
    media.preload = 'metadata';
    media.onloadedmetadata = () => {
      const duration = Number.isFinite(media.duration) && media.duration > 0 ? media.duration : 5;
      URL.revokeObjectURL(url);
      resolve(Math.min(3600, Math.max(0.1, duration)));
    };
    media.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(5);
    };
    media.src = url;
  });
}

function compatibleTrack(tracks: TimelineTrack[], kind: TimelineTrackKind) {
  return tracks.find((track) => track.kind === kind && !track.locked);
}

/** Imports media blobs to IndexedDB and creates clips in the active scene timeline. */
export async function importMediaFilesToTimeline(files: FileList | File[]) {
  for (const file of Array.from(files)) {
    const isAudio = file.type.startsWith('audio/');
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isAudio && !isVideo && !isImage) {
      notify(`نوع الملف غير مدعوم: ${file.name}`);
      continue;
    }
    if (file.size > 250 * 1024 * 1024) {
      notify(`الملف أكبر من الحد المسموح (250 MB): ${file.name}`);
      continue;
    }
    try {
      const kind: TimelineTrackKind = isAudio ? 'audio' : 'video';
      const duration = await mediaDuration(file);
      const source = await storeMediaAsset(file);
      const state = getState();
      const tracks = [...(state.doc.timelineTracks ?? [])];
      let target = compatibleTrack(tracks, kind);
      if (!target) {
        target = {
          id: uid(),
          name: `${kind === 'audio' ? 'Audio' : 'Video'} ${tracks.filter((track) => track.kind === kind).length + 1}`,
          kind, visible: true, muted: false, locked: false, clips: [],
        };
        tracks.push(target);
      }
      const clip: TimelineClip = {
        id: uid(),
        name: file.name.slice(0, 100),
        kind: isAudio ? 'audio' : isVideo ? 'video' : 'image',
        source,
        start: Math.max(0, state.time),
        duration,
        sourceStart: 0,
        sourceDuration: duration,
        volume: 1,
        muted: false,
      };
      const nextTracks = tracks.map((track) => track.id === target!.id
        ? { ...track, clips: [...track.clips, clip].sort((a, b) => a.start - b.start) }
        : track);
      patchDoc({ timelineTracks: nextTracks, duration: Math.max(state.doc.duration, clip.start + clip.duration) });
      notify(`تمت إضافة ${file.name} إلى ${target.name}`);
    } catch (error) {
      notify((error as Error)?.message || `تعذّر استيراد ${file.name}`);
    }
  }
}
