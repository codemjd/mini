import type { ProgressInfo } from "../../vendor/nabra-tts/dist/index.js";

export interface ArabicTtsProgress {
  phase: "download" | "synthesis";
  progress: number | null;
  detail: string;
}

export interface ArabicNarrationResult {
  blob: Blob;
  sampleRate: number;
  durationSeconds: number;
  device: "webgpu" | "wasm";
  segments: number;
}

interface NabraEngine {
  generate(text: string): Promise<{ audio: Float32Array; sampleRate: number }>;
  toWav(audio: Float32Array): Blob;
  dispose(): Promise<void>;
  readonly device: "webgpu" | "wasm";
}

let enginePromise: Promise<NabraEngine> | null = null;

export const MAX_SCENE_CHARACTERS = 2400;
export const MAX_SEGMENT_CHARACTERS = 160;
const PAUSE_MILLISECONDS = 140;

export function splitArabicSpeechText(text: string): string[] {
  const sentenceParts = text
    .replace(/\r/g, "")
    .split(/(?<=[.!?؟؛。])\s+|\n+/u)
    .map((part) => part.trim())
    .filter(Boolean);

  const output: string[] = [];
  for (const sentence of sentenceParts) {
    const words = sentence.split(/\s+/u);
    let current = "";

    const pushOversizedWord = (word: string) => {
      const chars = Array.from(word);
      for (let index = 0; index < chars.length; index += MAX_SEGMENT_CHARACTERS) {
        output.push(chars.slice(index, index + MAX_SEGMENT_CHARACTERS).join(""));
      }
    };

    for (const word of words) {
      const candidate = current ? current + " " + word : word;
      if (Array.from(candidate).length <= MAX_SEGMENT_CHARACTERS) {
        current = candidate;
        continue;
      }

      if (current) output.push(current);
      current = "";

      if (Array.from(word).length > MAX_SEGMENT_CHARACTERS) {
        pushOversizedWord(word);
      } else {
        current = word;
      }
    }

    if (current) output.push(current);
  }
  return output;
}

async function loadEngine(onProgress?: (progress: ArabicTtsProgress) => void): Promise<NabraEngine> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const { NabraTTS } = await import("../../vendor/nabra-tts/dist/index.js");
      return NabraTTS.load({
        dtype: "fp16",
        device: "auto",
        cache: true,
        onProgress: (progress: ProgressInfo) => {
          const percentage = progress.total > 0
            ? Math.max(0, Math.min(100, (progress.loaded / progress.total) * 100))
            : null;
          onProgress?.({
            phase: "download",
            progress: percentage,
            detail: progress.file === "model" ? "تحميل نموذج الصوت العربي" : "تحميل ملف الصوت"
          });
        }
      });
    })();
  }

  try {
    return await enginePromise;
  } catch (error) {
    enginePromise = null;
    throw error;
  }
}

/**
 * Generate an Arabic MSA narration locally. Model weights are fetched only
 * after the user requests speech, then cached by the provider in the browser.
 */
export async function generateArabicNarration(
  rawText: string,
  onProgress?: (progress: ArabicTtsProgress) => void,
  signal?: AbortSignal
): Promise<ArabicNarrationResult> {
  const text = rawText.trim();
  if (!text) throw new Error("أضف نص التعليق أولًا.");
  if (Array.from(text).length > MAX_SCENE_CHARACTERS) {
    throw new Error("النص طويل جدًا للتوليد المحلي في مشهد واحد. قسّمه إلى مشهدين أو أكثر.");
  }

  if (signal?.aborted) throw new DOMException("تم إلغاء توليد الصوت.", "AbortError");
  onProgress?.({ phase: "download", progress: null, detail: "تهيئة محرك الصوت العربي" });
  const engine = await loadEngine(onProgress);
  if (signal?.aborted) throw new DOMException("تم إلغاء توليد الصوت.", "AbortError");

  const segments = splitArabicSpeechText(text);
  if (segments.length === 0) throw new Error("لم يتم العثور على نص صالح للتوليد.");

  const audioParts: Float32Array[] = [];
  let sampleRate = 24000;
  let totalSamples = 0;
  const pauseSamples = Math.round((sampleRate * PAUSE_MILLISECONDS) / 1000);

  for (let index = 0; index < segments.length; index += 1) {
    if (signal?.aborted) throw new DOMException("تم إلغاء توليد الصوت.", "AbortError");
    onProgress?.({
      phase: "synthesis",
      progress: (index / segments.length) * 100,
      detail: `توليد المقطع ${index + 1} من ${segments.length}`
    });

    const result = await engine.generate(segments[index]);
    if (!(result.audio instanceof Float32Array) || result.audio.length === 0) {
      throw new Error("أعاد محرك الصوت مقطعًا فارغًا.");
    }
    sampleRate = result.sampleRate;
    audioParts.push(result.audio);
    totalSamples += result.audio.length;
    if (index < segments.length - 1) totalSamples += pauseSamples;
  }

  const joined = new Float32Array(totalSamples);
  let offset = 0;
  audioParts.forEach((part, index) => {
    joined.set(part, offset);
    offset += part.length;
    if (index < audioParts.length - 1) offset += pauseSamples;
  });

  const blob = engine.toWav(joined);
  if (blob.size < 44) throw new Error("تعذر إنشاء ملف WAV صالح.");
  onProgress?.({ phase: "synthesis", progress: 100, detail: "اكتمل توليد التعليق الصوتي" });

  return { blob, sampleRate, durationSeconds: joined.length / sampleRate, device: engine.device, segments: segments.length };
}


/**
 * Release the ONNX session and terminate the inline worker when the app page
 * is leaving. The model/voice cache remains in browser storage for next use.
 */
export async function disposeArabicNarrationEngine(): Promise<void> {
  const pending = enginePromise;
  if (!pending) return;
  enginePromise = null;

  try {
    const engine = await pending;
    await engine.dispose();
  } catch {
    // The app may be leaving while the model is still loading or initialization failed.
  }
}
