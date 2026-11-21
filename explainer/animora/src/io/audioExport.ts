import type { TimelineTrack } from '../model/types';
import { buildAudioSchedule } from './audioSchedule';
import { readMediaAsset } from './mediaLibrary';

interface SceneAudioInput {
  tracks?: TimelineTrack[];
  offset: number;
  playbackRate: number;
}

interface PreparedAudioExport {
  /** Schedule every source against the same wall-clock start used by the video recorder. */
  startAt: (wallClockStart: number) => void;
  stream: MediaStream;
  close: () => Promise<void>;
}

/**
 * Decode project audio and expose one mixed MediaStream audio track for MediaRecorder.
 * Missing/corrupt assets fail loudly: silently exporting a supposedly complete silent
 * video is worse than stopping with an actionable error.
 */
export async function prepareAudioExport(scenes: SceneAudioInput[]): Promise<PreparedAudioExport | null> {
  const schedules = scenes.flatMap((scene) =>
    buildAudioSchedule(scene.tracks, scene.offset, scene.playbackRate).map((item) => ({
      ...item,
      playbackRate: scene.playbackRate,
    })),
  );
  if (!schedules.length) return null;
  if (typeof AudioContext === 'undefined' || typeof MediaStreamAudioDestinationNode === 'undefined') {
    throw new Error('Audio export is unavailable in this browser. Use a browser with Web Audio support.');
  }

  const context = new AudioContext();
  let destination: MediaStreamAudioDestinationNode | null = null;
  try {
    await context.resume();
    destination = context.createMediaStreamDestination();
    const decoded = new Map<string, AudioBuffer>();
    for (const item of schedules) {
      if (decoded.has(item.source)) continue;
      const asset = await readMediaAsset(item.source);
      if (!asset) throw new Error(`Audio file “${item.clipId}” is missing from the media library. Re-import it before exporting.`);
      let buffer: AudioBuffer;
      try {
        buffer = await context.decodeAudioData(await asset.blob.arrayBuffer());
      } catch {
        throw new Error(`Audio file “${asset.name}” could not be decoded. Use a supported audio format and re-import it.`);
      }
      decoded.set(item.source, buffer);
    }

    const sources: AudioBufferSourceNode[] = [];
    const gains: GainNode[] = [];
    const startAt = (wallClockStart: number) => {
      const delay = Math.max(0, wallClockStart - performance.now()) / 1000;
      const audioStart = context.currentTime + delay;
      for (const item of schedules) {
        const buffer = decoded.get(item.source);
        if (!buffer) continue;
        const sourceStart = Math.min(item.sourceStart, buffer.duration);
        const sourceDuration = Math.min(item.sourceEnd - sourceStart, buffer.duration - sourceStart);
        if (sourceDuration <= 0) continue;
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffer;
        source.playbackRate.value = item.playbackRate;
        gain.gain.value = item.volume;
        source.connect(gain);
        gain.connect(destination!);
        sources.push(source);
        gains.push(gain);
        source.start(audioStart + item.start, sourceStart, sourceDuration);
      }
    };
    return {
      startAt,
      stream: destination.stream,
      close: async () => {
        sources.forEach((source) => { try { source.stop(); } catch { /* already ended */ } });
        sources.forEach((source) => source.disconnect());
        gains.forEach((gain) => gain.disconnect());
        destination?.stream.getTracks().forEach((track) => track.stop());
        if (context.state !== 'closed') await context.close();
      },
    };
  } catch (error) {
    destination?.stream.getTracks().forEach((track) => track.stop());
    if (context.state !== 'closed') await context.close();
    throw error;
  }
}
