// Model runtime: downloads the ONNX model + voice pack, runs G2P and inference.
// Runs inside the inline Web Worker by default, or on the calling thread with `worker: false`.
import * as ort from 'onnxruntime-web';
import { prepare, initEspeak, type Chunk } from './g2p';
import { fetchCached } from './cache';
import { STYLE_DIM, type ChunkAudio, type Device, type EngineConfig, type ProgressInfo } from './types';

const hfUrl = (repo: string, revision: string, file: string) =>
  `https://huggingface.co/${repo}/resolve/${revision}/${file}`;

async function pickDevice(device: Device): Promise<'webgpu' | 'wasm'> {
  if (device !== 'auto') return device;
  const gpu = (globalThis.navigator as any)?.gpu;
  if (!gpu) return 'wasm';
  try {
    return (await gpu.requestAdapter()) ? 'webgpu' : 'wasm';
  } catch {
    return 'wasm';
  }
}

export class Engine {
  private constructor(
    private session: ort.InferenceSession,
    private voice: Float32Array,
    private config: EngineConfig,
    readonly device: 'webgpu' | 'wasm',
  ) {}

  static async create(config: EngineConfig, onProgress?: (p: ProgressInfo) => void): Promise<Engine> {
    const modelFile = config.dtype === 'fp16' ? 'onnx/model_fp16.onnx' : 'onnx/model.onnx';
    const modelUrl = config.modelUrl ?? hfUrl(config.repo, config.revision, modelFile);
    const voiceUrl = config.voiceUrl ?? hfUrl(config.repo, config.revision, 'voices/af_msa.bin');

    ort.env.wasm.wasmPaths =
      config.wasmPaths ?? `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ort.env.versions.web}/dist/`;
    ort.env.wasm.numThreads = config.numThreads ?? 1;

    const [modelBytes, voiceBytes, device] = await Promise.all([
      fetchCached(modelUrl, config.cache, (loaded, total) => onProgress?.({ file: 'model', loaded, total })),
      fetchCached(voiceUrl, config.cache, (loaded, total) => onProgress?.({ file: 'voice', loaded, total })),
      pickDevice(config.device),
      initEspeak(),
    ]);

    const voice = new Float32Array(voiceBytes.buffer, voiceBytes.byteOffset, voiceBytes.byteLength / 4);
    let session: ort.InferenceSession;
    let used = device;
    try {
      session = await ort.InferenceSession.create(modelBytes, { executionProviders: [device], logSeverityLevel: 3 });
    } catch (err) {
      if (device !== 'webgpu' || config.device === 'webgpu') throw err;
      session = await ort.InferenceSession.create(modelBytes, { executionProviders: ['wasm'], logSeverityLevel: 3 });
      used = 'wasm';
    }
    return new Engine(session, voice, config, used);
  }

  prepare(text: string, diacritize?: (text: string) => Promise<string>): Promise<Chunk[]> {
    return prepare(text, { diacritize, normalize: this.config.normalize });
  }

  async synthesize(chunk: Chunk, speed = 1): Promise<Float32Array> {
    const row = Math.min(chunk.styleIndex, this.voice.length / STYLE_DIM - 1);
    const style = this.voice.slice(row * STYLE_DIM, (row + 1) * STYLE_DIM);
    const feeds = {
      input_ids: new ort.Tensor('int64', BigInt64Array.from(chunk.inputIds, BigInt), [1, chunk.inputIds.length]),
      style: new ort.Tensor('float32', style, [1, STYLE_DIM]),
      speed: new ort.Tensor('float32', new Float32Array([speed]), [1]),
    };
    const out = await this.session.run(feeds);
    const audio = (out.waveform.data as Float32Array).slice();
    for (const t of Object.values(out)) t.dispose?.();
    return audio;
  }

  async *stream(
    text: string,
    speed = 1,
    diacritize?: (text: string) => Promise<string>,
  ): AsyncGenerator<ChunkAudio> {
    for (const chunk of await this.prepare(text, diacritize)) {
      yield { graphemes: chunk.graphemes, phonemes: chunk.phonemes, audio: await this.synthesize(chunk, speed) };
    }
  }

  async dispose(): Promise<void> {
    await this.session.release();
  }
}
