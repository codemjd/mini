import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store';
import { readMediaAsset } from '../io/mediaLibrary';
import type { TimelineClip, TimelineTrack } from '../model/types';

const EMPTY_TRACKS: TimelineTrack[] = [];

type ResolvedAsset = { source: string; url: string };

/** Renders active image/video timeline clips in artboard coordinates, below vector layers. */
export function VisualMediaPreview() {
  const tracksValue = useStore((s) => s.doc.timelineTracks);
  const tracks = tracksValue ?? EMPTY_TRACKS;
  const width = useStore((s) => s.doc.width);
  const height = useStore((s) => s.doc.height);
  const time = useStore((s) => s.time);
  const playing = useStore((s) => s.playing);
  const assetsRef = useRef(new Map<string, ResolvedAsset>());
  const videoRefs = useRef(new Map<string, HTMLVideoElement>());
  const [assets, setAssets] = useState<Record<string, ResolvedAsset>>({});

  useEffect(() => {
    let cancelled = false;
    const wanted = new Map<string, TimelineClip>();
    for (const track of tracks) {
      if (track.kind !== 'video') continue;
      for (const clip of track.clips) {
        if (clip.kind === 'video' || clip.kind === 'image') wanted.set(clip.id, clip);
      }
    }

    for (const [id, asset] of assetsRef.current) {
      const clip = wanted.get(id);
      if (!clip || clip.source !== asset.source) {
        URL.revokeObjectURL(asset.url);
        assetsRef.current.delete(id);
        videoRefs.current.get(id)?.pause();
        videoRefs.current.delete(id);
      }
    }
    setAssets(Object.fromEntries(assetsRef.current.entries()));

    void Promise.all([...wanted.values()].map(async (clip) => {
      if (assetsRef.current.has(clip.id)) return;
      try {
        const asset = await readMediaAsset(clip.source);
        if (!asset) throw new Error('Media asset is missing from this browser');
        const url = URL.createObjectURL(asset.blob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        const resolved = { source: clip.source, url };
        assetsRef.current.set(clip.id, resolved);
        setAssets((previous) => ({ ...previous, [clip.id]: resolved }));
      } catch {
        // Missing or unsupported media stays represented by its timeline clip.
      }
    }));

    return () => { cancelled = true; };
  }, [tracks]);

  useEffect(() => () => {
    for (const asset of assetsRef.current.values()) URL.revokeObjectURL(asset.url);
    assetsRef.current.clear();
    videoRefs.current.clear();
  }, []);

  useEffect(() => {
    for (const track of tracks) {
      if (track.kind !== 'video') continue;
      for (const clip of track.clips) {
        if (clip.kind !== 'video') continue;
        const video = videoRefs.current.get(clip.id);
        if (!video) continue;
        const active = track.visible && time >= clip.start && time < clip.start + clip.duration;
        if (!active) {
          video.pause();
          continue;
        }
        const sourceTime = Math.max(0, clip.sourceStart + time - clip.start);
        video.muted = track.muted || clip.muted;
        video.volume = Math.max(0, Math.min(1, Number.isFinite(clip.volume) ? clip.volume : 1));
        if (Number.isFinite(video.currentTime) && Math.abs(video.currentTime - sourceTime) > 0.3) {
          try { video.currentTime = sourceTime; } catch { /* Wait for metadata. */ }
        }
        if (playing) {
          if (video.paused) void video.play().catch(() => undefined);
        } else if (!video.paused) {
          video.pause();
        }
      }
    }
  }, [tracks, time, playing, assets]);

  return (
    <g className="timeline-media-preview" pointerEvents="none">
      {tracks.flatMap((track) => track.kind !== 'video' || !track.visible ? [] : track.clips.map((clip) => {
        const asset = assets[clip.id];
        const active = time >= clip.start && time < clip.start + clip.duration;
        if (!asset || !active || (clip.kind !== 'video' && clip.kind !== 'image')) return null;
        if (clip.kind === 'image') {
          return <image key={clip.id} href={asset.url} x={0} y={0} width={width} height={height} preserveAspectRatio="xMidYMid meet" />;
        }
        return (
          <foreignObject key={clip.id} x={0} y={0} width={width} height={height}>
            <div style={{ width: '100%', height: '100%', overflow: 'hidden', pointerEvents: 'none' }}>
              <video
                ref={(node) => {
                  if (node) videoRefs.current.set(clip.id, node);
                  else videoRefs.current.delete(clip.id);
                }}
                src={asset.url}
                playsInline
                preload="auto"
                onLoadedMetadata={(event) => {
                  const video = event.currentTarget;
                  const sourceTime = Math.max(0, clip.sourceStart + time - clip.start);
                  try { video.currentTime = sourceTime; } catch { /* Browser may defer seeking. */ }
                  if (playing) void video.play().catch(() => undefined);
                }}
                style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain', background: 'transparent' }}
              />
            </div>
          </foreignObject>
        );
      }))}
    </g>
  );
}
