/** Concatenate PCM chunks. */
export function concat(chunks: Float32Array[]): Float32Array {
  const out = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/** Encode mono float PCM as a 16-bit WAV file. */
export function encodeWav(audio: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + audio.length * 2);
  const view = new DataView(buffer);
  const str = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  view.setUint32(4, 36 + audio.length * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, 'data');
  view.setUint32(40, audio.length * 2, true);
  for (let i = 0; i < audio.length; i++) {
    const s = Math.max(-1, Math.min(1, audio[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

/** WAV Blob, e.g. for `<audio src={URL.createObjectURL(blob)}>` or downloads. */
export function toWavBlob(audio: Float32Array, sampleRate: number): Blob {
  return new Blob([encodeWav(audio, sampleRate)], { type: 'audio/wav' });
}

let sharedContext: AudioContext | null = null;

/** Play PCM through Web Audio. Resolves when playback ends. */
export async function playAudio(audio: Float32Array, sampleRate: number, ctx?: AudioContext): Promise<void> {
  ctx ??= sharedContext ??= new AudioContext();
  if (ctx.state === 'suspended') await ctx.resume();
  const buf = ctx.createBuffer(1, audio.length, sampleRate);
  buf.copyToChannel(audio as Float32Array<ArrayBuffer>, 0);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  await new Promise<void>((resolve) => {
    src.onended = () => resolve();
    src.start();
  });
}
