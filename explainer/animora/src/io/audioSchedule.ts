import type { TimelineTrack } from '../model/types';

export interface AudioScheduleItem {
  clipId: string;
  source: string;
  start: number;
  duration: number;
  sourceStart: number;
  sourceEnd: number;
  volume: number;
}

/**
 * Build a deterministic audio render plan for one scene.
 * Muted lanes/clips are omitted; invalid or zero-length clips are ignored.
 * Scene offsets and playback rates let the multi-scene exporter place clips
 * on one continuous output clock without mutating the editable project.
 */
export function buildAudioSchedule(
  tracks: TimelineTrack[] | undefined,
  sceneOffset = 0,
  playbackRate = 1,
): AudioScheduleItem[] {
  if (!Number.isFinite(sceneOffset) || sceneOffset < 0) {
    throw new RangeError('Audio scene offset must be a finite non-negative number.');
  }
  if (!Number.isFinite(playbackRate) || playbackRate <= 0) {
    throw new RangeError('Audio playback rate must be a finite positive number.');
  }

  const schedule: AudioScheduleItem[] = [];
  for (const track of tracks ?? []) {
    if (track.kind !== 'audio' || track.muted) continue;
    for (const clip of track.clips) {
      if (clip.muted) continue;
      const values = [clip.start, clip.duration, clip.sourceStart, clip.sourceDuration, clip.volume];
      if (!values.every(Number.isFinite) || clip.start < 0 || clip.duration <= 0
        || clip.sourceStart < 0 || clip.sourceDuration <= 0) continue;
      const sourceEnd = Math.min(clip.sourceDuration, clip.sourceStart + clip.duration);
      const duration = sourceEnd - clip.sourceStart;
      if (duration <= 0) continue;
      schedule.push({
        clipId: clip.id,
        source: clip.source,
        start: sceneOffset + clip.start / playbackRate,
        duration: duration / playbackRate,
        sourceStart: clip.sourceStart,
        sourceEnd,
        volume: Math.max(0, Math.min(1, clip.volume)),
      });
    }
  }
  return schedule.sort((a, b) => a.start - b.start || a.clipId.localeCompare(b.clipId));
}
