import { useRef, useState } from 'react';
import { patchDoc } from '../state/actions';
import { getState, notify } from '../state/store';
import { uid } from '../model/factory';
import type { TimelineClip, TimelineTrack, TimelineTrackKind } from '../model/types';
import { storeMediaAsset } from '../io/mediaLibrary';
import { Icon } from './Icon';

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

export function MediaImportButton() {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const importFiles = async (files: FileList | null) => {
    if (!files?.length || busy) return;
    setBusy(true);
    try {
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
          volume: 1,
          muted: false,
        };
        const nextTracks = tracks.map((track) => track.id === target!.id
          ? { ...track, clips: [...track.clips, clip].sort((a, b) => a.start - b.start) }
          : track);
        patchDoc({ timelineTracks: nextTracks });
        notify(`تمت إضافة ${file.name} إلى ${target.name}`);
      }
    } catch (error) {
      notify((error as Error)?.message || 'تعذّر استيراد الوسائط');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <>
      <input ref={input} type="file" accept="audio/*,video/*,image/*" multiple hidden
        onChange={(event) => void importFiles(event.currentTarget.files)} />
      <button className="media-import-button" disabled={busy} onClick={() => input.current?.click()}
        title="Import audio, video or images into the timeline">
        <Icon name="upload" size={14} /> {busy ? 'Importing…' : 'Import media'}
      </button>
    </>
  );
}
