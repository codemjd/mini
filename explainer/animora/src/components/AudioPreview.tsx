import { useEffect, useRef } from 'react';
import { useStore, notify } from '../state/store';
import { readMediaAsset } from '../io/mediaLibrary';
import type { TimelineClip, TimelineTrack } from '../model/types';

const EMPTY_TRACKS: TimelineTrack[] = [];

/**
 * Keeps audio timeline clips synchronized with the editor transport.
 * One HTMLAudioElement is retained per clip so scrubbing does not recreate decoders.
 */
export function AudioPreview() {
  const storedTracks = useStore((s) => s.doc.timelineTracks);
  const tracks = storedTracks ?? EMPTY_TRACKS;
  const time = useStore((s) => s.time);
  const playing = useStore((s) => s.playing);
  const mediaRef = useRef(new Map<string, { audio: HTMLAudioElement; url: string }>());
  const warnedRef = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    const audioTracks = tracks.filter((track) => track.kind === 'audio');
    const wanted = new Map<string, TimelineClip>();
    for (const track of audioTracks) {
      for (const clip of track.clips) wanted.set(clip.id, clip);
    }

    // Dispose decoders and object URLs for clips removed from the active scene.
    for (const [id, item] of mediaRef.current) {
      if (!wanted.has(id)) {
        item.audio.pause();
        item.audio.removeAttribute('src');
        item.audio.load();
        URL.revokeObjectURL(item.url);
        mediaRef.current.delete(id);
      }
    }

    void Promise.all([...wanted.values()].map(async (clip) => {
      if (mediaRef.current.has(clip.id)) return;
      try {
        const asset = await readMediaAsset(clip.source);
        if (!asset) throw new Error('Media asset is missing from this browser');
        if (cancelled) return;
        const url = URL.createObjectURL(asset.blob);
        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = url;
        mediaRef.current.set(clip.id, { audio, url });
      } catch (error) {
        if (!cancelled && !warnedRef.current.has(clip.id)) {
          warnedRef.current.add(clip.id);
          notify(`تعذّر تحميل الصوت «${clip.name}»: ${(error as Error).message}`);
        }
      }
    }));

    return () => { cancelled = true; };
  }, [tracks]);

  useEffect(() => {
    const activeIds = new Set<string>();
    for (const track of tracks) {
      if (track.kind !== 'audio') continue;
      for (const clip of track.clips) {
        const item = mediaRef.current.get(clip.id);
        if (!item) continue;
        const audio = item.audio;
        const active = playing && !track.muted && !clip.muted
          && time >= clip.start && time < clip.start + clip.duration;
        if (!active) {
          if (!audio.paused) audio.pause();
          continue;
        }
        activeIds.add(clip.id);
        const target = Math.max(0, clip.sourceStart + time - clip.start);
        // Avoid fighting the media clock every animation frame; seek only after a
        // scrub, a clip boundary, or meaningful decoder drift.
        if (!Number.isFinite(audio.currentTime) || Math.abs(audio.currentTime - target) > 0.28) {
          try { audio.currentTime = target; } catch { /* Metadata may still be loading. */ }
        }
        audio.volume = Math.max(0, Math.min(1, Number.isFinite(clip.volume) ? clip.volume : 1));
        audio.muted = track.muted || clip.muted;
        if (audio.paused) {
          void audio.play().catch(() => {
            if (!warnedRef.current.has(`play:${clip.id}`)) {
              warnedRef.current.add(`play:${clip.id}`);
              notify('تعذّر تشغيل الصوت. اضغط تشغيل مرة أخرى أو تحقق من دعم المتصفح للملف.');
            }
          });
        }
      }
    }
    for (const [id, item] of mediaRef.current) {
      if (!activeIds.has(id) && !item.audio.paused) item.audio.pause();
    }
  }, [tracks, time, playing]);

  useEffect(() => () => {
    for (const item of mediaRef.current.values()) {
      item.audio.pause();
      item.audio.removeAttribute('src');
      item.audio.load();
      URL.revokeObjectURL(item.url);
    }
    mediaRef.current.clear();
  }, []);

  return null;
}
