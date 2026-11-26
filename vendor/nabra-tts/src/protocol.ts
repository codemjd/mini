// Messages between NabraTTS (main thread) and the inline worker.
import type { EngineConfig, ProgressInfo } from './types';

export type ToWorker =
  | { type: 'load'; config: EngineConfig }
  | { type: 'generate'; id: number; text: string; speed: number; diacritize: boolean }
  | { type: 'cancel'; id: number }
  | { type: 'diacritized'; rid: number; text?: string; error?: string }
  | { type: 'phonemize'; id: number; text: string; diacritize: boolean }
  | { type: 'dispose' };

export type FromWorker =
  | { type: 'progress'; progress: ProgressInfo }
  | { type: 'ready'; device: 'webgpu' | 'wasm' }
  | { type: 'chunk'; id: number; text: string; phonemes: string; audio: Float32Array }
  | { type: 'phonemes'; id: number; phonemes: string[] }
  | { type: 'done'; id: number }
  | { type: 'error'; id?: number; message: string }
  | { type: 'diacritize'; rid: number; text: string };
