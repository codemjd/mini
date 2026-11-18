import { readMediaAsset } from './mediaLibrary';

const cache = new Map<string, Promise<number[] | null>>();
const MAX_DECODE_BYTES = 2 * 1024 * 1024;
const MAX_DECODE_SECONDS = 120;
const MAX_CACHE_ENTRIES = 64;
const PEAK_COUNT = 256;
const MAX_CONCURRENT_DECODERS = 2;
let activeDecoders = 0;
const decoderQueue: (() => void)[] = [];

async function withDecoderSlot<T>(work: () => Promise<T>): Promise<T> {
  if (activeDecoders >= MAX_CONCURRENT_DECODERS) {
    await new Promise<void>((resolve) => decoderQueue.push(resolve));
  } else {
    activeDecoders++;
  }
  try {
    return await work();
  } finally {
    const next = decoderQueue.shift();
    if (next) next();
    else activeDecoders--;
  }
}

function readDuration(blob: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(blob);
    let settled = false;
    const finish = (duration: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      audio.onloadedmetadata = null;
      audio.onerror = null;
      audio.removeAttribute('src');
      audio.load();
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    const timeout = window.setTimeout(() => finish(null), 5000);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => finish(Number.isFinite(audio.duration) ? audio.duration : null);
    audio.onerror = () => finish(null);
    audio.src = url;
  });
}

/** Decode small audio assets once and retain only a compact peak envelope. */
export function readAudioWaveform(source: string): Promise<number[] | null> {
  const cached = cache.get(source);
  if (cached) {
    cache.delete(source);
    cache.set(source, cached);
    return cached;
  }
  const pending = (async () => {
    const asset = await readMediaAsset(source);
    if (!asset || asset.blob.size > MAX_DECODE_BYTES) return null;
    const duration = await readDuration(asset.blob);
    if (duration === null || duration <= 0 || duration > MAX_DECODE_SECONDS) return null;
    return withDecoderSlot(async () => {
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
    });
  })().catch(() => null);
  cache.delete(source);
  cache.set(source, pending);
  while (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value!);
  return pending;
}
