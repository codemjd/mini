export const SAMPLE_RATE = 24000;
export const STYLE_DIM = 256;
export const DEFAULT_REPO = 'oddadmix/Nabra-7M-Distill-ONNX';

export type Device = 'auto' | 'webgpu' | 'wasm';
export type DType = 'fp32' | 'fp16';

export interface ProgressInfo {
  file: 'model' | 'voice';
  loaded: number;
  /** 0 when the server sent no Content-Length. */
  total: number;
}

export interface LoadOptions {
  /** 'fp32' (30 MB, default) or 'fp16' (16 MB, same quality). */
  dtype?: DType;
  /** 'auto' (default) picks WebGPU when available, else WASM. */
  device?: Device;
  /** Run in a Web Worker so synthesis never blocks the UI. Default true when Worker exists. */
  worker?: boolean;
  /** Hugging Face repo holding the ONNX export. Default 'oddadmix/Nabra-7M-Distill-ONNX'. */
  repo?: string;
  /** Branch, tag or commit of `repo`. Default 'main'. */
  revision?: string;
  /** Self-host the model instead of fetching from Hugging Face. */
  modelUrl?: string;
  /** Self-host the voice pack (raw float32 [510, 256]). */
  voiceUrl?: string;
  /** Where onnxruntime-web loads its .wasm files from. Default: jsDelivr CDN. */
  wasmPaths?: string;
  /** WASM threads (needs a cross-origin isolated page). Default 1; the model is tiny. */
  numThreads?: number;
  /** Cache model + voice with the Cache Storage API. Default true. */
  cache?: boolean;
  /**
   * Add tashkeel to un-diacritized text before G2P (e.g. call your own diacritizer model
   * or API). Text that is already diacritized is passed through unchanged.
   */
  diacritize?: (text: string) => string | Promise<string>;
  /** Drop [citations] and Latin-script words before G2P. Default false. */
  normalize?: boolean;
  /** Download progress callback. */
  onProgress?: (p: ProgressInfo) => void;
}

export interface GenerateOptions {
  /** Speaking rate, 1 = normal. */
  speed?: number;
}

export interface AudioChunk {
  /** Text of this chunk. */
  text: string;
  /** IPA phonemes that were synthesized. */
  phonemes: string;
  /** Mono PCM, 24 kHz. */
  audio: Float32Array;
  sampleRate: number;
}

export interface GeneratedAudio {
  audio: Float32Array;
  sampleRate: number;
}

/** @internal Resolved options passed to the engine (must be structured-cloneable). */
export interface EngineConfig {
  repo: string;
  revision: string;
  dtype: DType;
  device: Device;
  modelUrl?: string;
  voiceUrl?: string;
  wasmPaths?: string;
  numThreads?: number;
  cache: boolean;
  normalize: boolean;
}

/** @internal */
export interface ChunkAudio {
  graphemes: string;
  phonemes: string;
  audio: Float32Array;
}
