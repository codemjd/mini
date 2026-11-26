import { concat, playAudio, toWavBlob } from './audio';
import type { FromWorker, ToWorker } from './protocol';
import {
  DEFAULT_REPO,
  SAMPLE_RATE,
  type AudioChunk,
  type ChunkAudio,
  type EngineConfig,
  type GeneratedAudio,
  type GenerateOptions,
  type LoadOptions,
} from './types';

interface Backend {
  device: 'webgpu' | 'wasm';
  stream(text: string, speed: number): AsyncGenerator<ChunkAudio>;
  phonemize(text: string): Promise<string[]>;
  dispose(): Promise<void>;
}

/** Runs the engine on the calling thread (Node, or `worker: false`). */
async function directBackend(config: EngineConfig, opts: LoadOptions): Promise<Backend> {
  const { Engine } = await import('./engine');
  const engine = await Engine.create(config, opts.onProgress);
  const diacritize = opts.diacritize && (async (t: string) => opts.diacritize!(t));
  let lock: Promise<unknown> = Promise.resolve();
  // ORT sessions can't run concurrently: serialize whole generations.
  const exclusive = async function* <T>(gen: () => AsyncGenerator<T>): AsyncGenerator<T> {
    let release!: () => void;
    const prev = lock;
    lock = new Promise<void>((r) => (release = r));
    await prev;
    try {
      yield* gen();
    } finally {
      release();
    }
  };
  return {
    device: engine.device,
    stream: (text, speed) => exclusive(() => engine.stream(text, speed, diacritize)),
    phonemize: async (text) => (await engine.prepare(text, diacritize)).map((c) => c.phonemes),
    dispose: () => engine.dispose(),
  };
}

/** Runs the engine in an inline module Web Worker. */
async function workerBackend(config: EngineConfig, opts: LoadOptions): Promise<Backend> {
  const { default: code } = await import('inline-worker:./worker');
  const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
  const worker = new Worker(url, { type: 'module', name: 'nabra-tts' });
  const send = (msg: ToWorker) => worker.postMessage(msg);

  type Listener = (msg: FromWorker) => void;
  const listeners = new Map<number, Listener>();
  let nextId = 0;

  const ready = new Promise<'webgpu' | 'wasm'>((resolve, reject) => {
    worker.onerror = (e) => reject(new Error(`nabra-tts worker failed: ${e.message}`));
    worker.onmessage = async (e: MessageEvent<FromWorker>) => {
      const msg = e.data;
      if (msg.type === 'progress') opts.onProgress?.(msg.progress);
      else if (msg.type === 'ready') resolve(msg.device);
      else if (msg.type === 'error' && msg.id === undefined) reject(new Error(msg.message));
      else if (msg.type === 'diacritize') {
        try {
          send({ type: 'diacritized', rid: msg.rid, text: await opts.diacritize!(msg.text) });
        } catch (err) {
          send({ type: 'diacritized', rid: msg.rid, error: String((err as Error)?.message ?? err) });
        }
      } else if ('id' in msg && msg.id !== undefined) listeners.get(msg.id)?.(msg);
    };
  });
  send({ type: 'load', config });
  let device: 'webgpu' | 'wasm';
  try {
    device = await ready;
  } catch (err) {
    worker.terminate();
    URL.revokeObjectURL(url);
    throw err;
  }

  // Turn the message stream for one request id into an async generator.
  function request(msg: ToWorker & { id: number }): AsyncGenerator<FromWorker> {
    const buffered: FromWorker[] = [];
    let wake: (() => void) | null = null;
    listeners.set(msg.id, (m) => {
      buffered.push(m);
      wake?.();
    });
    send(msg);
    return (async function* () {
      try {
        for (;;) {
          if (!buffered.length) await new Promise<void>((r) => (wake = r));
          wake = null;
          const m = buffered.shift()!;
          if (m.type === 'error') throw new Error(m.message);
          yield m;
          if (m.type === 'done' || m.type === 'phonemes') return;
        }
      } finally {
        listeners.delete(msg.id);
      }
    })();
  }

  return {
    device,
    async *stream(text, speed) {
      const id = nextId++;
      let finished = false;
      try {
        for await (const m of request({ type: 'generate', id, text, speed, diacritize: !!opts.diacritize })) {
          if (m.type === 'chunk') yield { graphemes: m.text, phonemes: m.phonemes, audio: m.audio };
          if (m.type === 'done') finished = true;
        }
      } finally {
        if (!finished) send({ type: 'cancel', id });
      }
    },
    async phonemize(text) {
      for await (const m of request({ type: 'phonemize', id: nextId++, text, diacritize: !!opts.diacritize })) {
        if (m.type === 'phonemes') return m.phonemes;
      }
      return [];
    },
    async dispose() {
      send({ type: 'dispose' });
      URL.revokeObjectURL(url);
    },
  };
}

/**
 * Arabic text-to-speech with Nabra-7M-Distill, running fully client-side.
 *
 * ```ts
 * const tts = await NabraTTS.load();
 * const { audio, sampleRate } = await tts.generate('مَرْحَبًا بِكُم');
 * ```
 */
export class NabraTTS {
  /** Output sample rate (Hz). */
  static readonly SAMPLE_RATE = SAMPLE_RATE;
  readonly sampleRate = SAMPLE_RATE;

  private constructor(private backend: Backend) {}

  /** Download (or read from cache) the model and get ready to synthesize. */
  static async load(options: LoadOptions = {}): Promise<NabraTTS> {
    const config: EngineConfig = {
      repo: options.repo ?? DEFAULT_REPO,
      revision: options.revision ?? 'main',
      dtype: options.dtype ?? 'fp32',
      device: options.device ?? 'auto',
      modelUrl: options.modelUrl && new URL(options.modelUrl, globalThis.location?.href).href,
      voiceUrl: options.voiceUrl && new URL(options.voiceUrl, globalThis.location?.href).href,
      wasmPaths: options.wasmPaths && new URL(options.wasmPaths, globalThis.location?.href).href,
      numThreads: options.numThreads,
      cache: options.cache ?? true,
      normalize: options.normalize ?? false,
    };
    const useWorker = options.worker ?? typeof Worker !== 'undefined';
    const backend = useWorker ? await workerBackend(config, options) : await directBackend(config, options);
    return new NabraTTS(backend);
  }

  /** Execution provider in use. */
  get device(): 'webgpu' | 'wasm' {
    return this.backend.device;
  }

  /** Synthesize chunk by chunk (sentences / lines) — start playing before the whole text is done. */
  async *stream(text: string, options: GenerateOptions = {}): AsyncGenerator<AudioChunk> {
    for await (const c of this.backend.stream(text, options.speed ?? 1)) {
      yield { text: c.graphemes, phonemes: c.phonemes, audio: c.audio, sampleRate: SAMPLE_RATE };
    }
  }

  /** Synthesize the whole text into one 24 kHz mono buffer. */
  async generate(text: string, options: GenerateOptions = {}): Promise<GeneratedAudio> {
    const parts: Float32Array[] = [];
    for await (const c of this.stream(text, options)) parts.push(c.audio);
    return { audio: concat(parts), sampleRate: SAMPLE_RATE };
  }

  /** Synthesize and play through Web Audio, chunk by chunk. Resolves when playback ends. */
  async speak(text: string, options: GenerateOptions & { audioContext?: AudioContext } = {}): Promise<void> {
    let playing: Promise<void> = Promise.resolve();
    for await (const c of this.stream(text, options)) {
      const prev = playing;
      playing = prev.then(() => playAudio(c.audio, SAMPLE_RATE, options.audioContext));
    }
    await playing;
  }

  /** Text -> IPA phonemes per chunk (what the model actually sees). */
  phonemize(text: string): Promise<string[]> {
    return this.backend.phonemize(text);
  }

  /** Encode audio as a WAV Blob. */
  toWav(audio: Float32Array): Blob {
    return toWavBlob(audio, SAMPLE_RATE);
  }

  /** Release the model and stop the worker. */
  dispose(): Promise<void> {
    return this.backend.dispose();
  }
}
