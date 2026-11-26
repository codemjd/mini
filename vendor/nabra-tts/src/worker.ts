// Inline Web Worker entry. Bundled with all dependencies into a string at build time
// (see tsup.config.ts) and started from a Blob URL, so consumers need no bundler config.
import { Engine } from './engine';
import type { FromWorker, ToWorker } from './protocol';

const post = (msg: FromWorker, transfer: Transferable[] = []) => (self as any).postMessage(msg, transfer);

let engine: Engine | null = null;
const cancelled = new Set<number>();
const pendingDiacritize = new Map<number, { resolve: (t: string) => void; reject: (e: Error) => void }>();
let nextRid = 0;
let queue: Promise<unknown> = Promise.resolve();

// Ask the main thread to run the user's diacritize() callback.
const diacritize = (text: string) =>
  new Promise<string>((resolve, reject) => {
    const rid = nextRid++;
    pendingDiacritize.set(rid, { resolve, reject });
    post({ type: 'diacritize', rid, text });
  });

async function generate(id: number, text: string, speed: number, useDiacritize: boolean) {
  for await (const chunk of engine!.stream(text, speed, useDiacritize ? diacritize : undefined)) {
    if (cancelled.has(id)) break;
    post({ type: 'chunk', id, text: chunk.graphemes, phonemes: chunk.phonemes, audio: chunk.audio }, [
      chunk.audio.buffer,
    ]);
  }
  cancelled.delete(id);
  post({ type: 'done', id });
}

self.onmessage = async (e: MessageEvent<ToWorker>) => {
  const msg = e.data;
  switch (msg.type) {
    case 'load':
      try {
        engine = await Engine.create(msg.config, (progress) => post({ type: 'progress', progress }));
        post({ type: 'ready', device: engine.device });
      } catch (err) {
        post({ type: 'error', message: String((err as Error)?.message ?? err) });
      }
      break;
    case 'generate':
    case 'phonemize': {
      const run =
        msg.type === 'generate'
          ? () => generate(msg.id, msg.text, msg.speed, msg.diacritize)
          : async () => {
              const chunks = await engine!.prepare(msg.text, msg.diacritize ? diacritize : undefined);
              post({ type: 'phonemes', id: msg.id, phonemes: chunks.map((c) => c.phonemes) });
            };
      queue = queue.then(run).catch((err) => post({ type: 'error', id: msg.id, message: String(err?.message ?? err) }));
      break;
    }
    case 'cancel':
      cancelled.add(msg.id);
      break;
    case 'diacritized': {
      const p = pendingDiacritize.get(msg.rid);
      pendingDiacritize.delete(msg.rid);
      if (msg.error !== undefined) p?.reject(new Error(msg.error));
      else p?.resolve(msg.text ?? '');
      break;
    }
    case 'dispose':
      await engine?.dispose();
      engine = null;
      self.close();
      break;
  }
};
