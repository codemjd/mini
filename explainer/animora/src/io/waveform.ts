import { readMediaAsset } from './mediaLibrary';

const cache = new Map<string, Promise<number[] | null>>();
const MAX_DECODE_BYTES = 8 * 1024 * 1024;
const PEAK_COUNT = 256;

/** Decode small audio assets once and retain only a compact peak envelope. */
export function readAudioWaveform(source: string): Promise<number[] | null> {
  const cached = cache.get(source);
  if (cached) return cached;
  const pending = (async () => {
    const asset = await readMediaAsset(source);
    if (!asset || asset.blob.size > MAX_DECODE_BYTES) return null;
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return null;
    const context = new AudioContextClass();
    try {
      const buffer = await context.decodeAudioData(await asset.blob.arrayBuffer());
      const channel = buffer.getChannelData(0);
      if (!channel.length) return null;
      const peaks: number[] = [];
      for (let index = 0; index < PEAK_COUNT; index++) {
        const start = Math.floor(index * channel.length / PEAK_COUNT);
        const end = Math.max(start + 1, Math.floor((index + 1) * channel.length / PEAK_COUNT));
        let peak = 0;
        for (let sample = start; sample < Math.min(end, channel.length); sample++) {
          peak = Math.max(peak, Math.abs(channel[sample]));
        }
        peaks.push(peak);
      }
      return peaks;
    } finally {
      await context.close().catch(() => undefined);
    }
  })().catch(() => null);
  cache.set(source, pending);
  return pending;
}
