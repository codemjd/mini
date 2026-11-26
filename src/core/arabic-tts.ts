import type { NabraTTS, ProgressInfo } from "nabra-tts";

export interface ArabicTtsProgress {
  phase: "downloading" | "synthesizing";
  loadedBytes?: number;
  totalBytes?: number;
  completedChunks?: number;
  totalChunks?: number;
}

export interface ArabicSpeechResult {
  audio: Blob;
  durationSeconds: number;
  sampleRate: number;
  device: "webgpu" | "wasm";
}

let enginePromise: Promise<NabraTTS> | null = null;
let activeProgress: ((progress: ArabicTtsProgress) => void) | undefined;

function reportDownload(progress: ProgressInfo): void {
  activeProgress?.({
    phase: "downloading",
    loadedBytes: progress.loaded,
    totalBytes: progress.total
  });
}

async function getEngine(
  onProgress?: (progress: ArabicTtsProgress) => void
): Promise<NabraTTS> {
  activeProgress = onProgress;
  if (!enginePromise) {
    enginePromise = import("nabra-tts").then(({ NabraTTS: Engine }) =>
      Engine.load({
        dtype: "fp16",
        device: "auto",
        worker: true,
        cache: true,
        onProgress: reportDownload
      })
    ).catch((error: unknown) => {
      enginePromise = null;
      throw error;
    });
  }
  return enginePromise;
}

/** Split at word boundaries so each local TTS request stays comfortably below Nabra's chunk limit. */
export function splitArabicNarration(text: string, maxCharacters = 280): string[] {
  const normalized = text.replace(/\s+/gu, " ").trim();
  if (!normalized) return [];
  const words = normalized.split(" ");
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    if (word.length > maxCharacters) {
      if (current) chunks.push(current);
      current = "";
      for (let offset = 0; offset < word.length; offset += maxCharacters) {
        chunks.push(word.slice(offset, offset + maxCharacters));
      }
      continue;
    }

    const candidate = current ? current + " " + word : word;
    if (candidate.length > maxCharacters && current) {
      chunks.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

export async function generateArabicNarration(
  text: string,
  onProgress?: (progress: ArabicTtsProgress) => void
): Promise<ArabicSpeechResult> {
  const chunks = splitArabicNarration(text);
  if (chunks.length === 0) throw new Error("اكتب نص التعليق الصوتي أولًا.");
  if (text.length > 12_000) throw new Error("نص المشهد أطول من الحد المدعوم لتوليد الصوت.");

  const engine = await getEngine(onProgress);
  const audioParts: Float32Array[] = [];
  let totalSamples = 0;

  for (let index = 0; index < chunks.length; index += 1) {
    activeProgress?.({
      phase: "synthesizing",
      completedChunks: index,
      totalChunks: chunks.length
    });
    const generated = await engine.generate(chunks[index]);
    audioParts.push(generated.audio);
    totalSamples += generated.audio.length;
  }

  const combined = new Float32Array(totalSamples);
  let offset = 0;
  for (const part of audioParts) {
    combined.set(part, offset);
    offset += part.length;
  }

  const audio = engine.toWav(combined);
  if (audio.size === 0) throw new Error("لم ينتج محرك الصوت ملفًا صالحًا.");
  const durationSeconds = totalSamples / engine.sampleRate;

  activeProgress = undefined;
  return {
    audio,
    durationSeconds,
    sampleRate: engine.sampleRate,
    device: engine.device
  };
}

/** Release the ONNX model and worker when the user explicitly leaves audio generation. */
export async function disposeArabicNarrationEngine(): Promise<void> {
  const pending = enginePromise;
  enginePromise = null;
  activeProgress = undefined;
  if (pending) {
    try {
      const engine = await pending;
      await engine.dispose();
    } catch {
      // The cache remains intact; a later generation can retry model initialization.
    }
  }
}
