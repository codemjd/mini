import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { NabraTTS } from "../vendor/nabra-tts/dist/index.js";

const outputDirectory = resolve("out");
const outputPath = resolve(outputDirectory, "nabra-arabic-voice-smoke.wav");
const metadataPath = resolve(outputDirectory, "nabra-arabic-voice-smoke.json");
const modelBase = "https://huggingface.co/oddadmix/Nabra-7M-Distill-ONNX/resolve/main";
const sampleText = "مَرْحَبًا بِكُمْ. هَذَا اِخْتِبَارٌ لِلتَّعْلِيقِ الصَّوْتِيِّ العَرَبِيِّ فِي إكسبلينر ستوديو.";

const require = createRequire(import.meta.url);
const onnxRuntimeDirectory = dirname(require.resolve("onnxruntime-web"));
const wasmPaths = pathToFileURL(onnxRuntimeDirectory + "/").href;

await mkdir(outputDirectory, { recursive: true });

console.log("Loading the Nabra FP16 Arabic model with the WASM backend...");
const tts = await NabraTTS.load({
  worker: false,
  dtype: "fp16",
  device: "wasm",
  cache: false,
  modelUrl: `${modelBase}/onnx/model_fp16.onnx`,
  voiceUrl: `${modelBase}/voices/af_msa.bin`,
  wasmPaths,
  onProgress: ({ file, loaded, total }) => {
    const percentage = total > 0 ? ` ${Math.round((loaded / total) * 100)}%` : "";
    process.stdout.write(`\rDownloading ${file}: ${loaded} / ${total} bytes${percentage}   `);
  }
});

try {
  console.log("\nSynthesizing a short Arabic MSA voice sample...");
  const startedAt = performance.now();
  const { audio, sampleRate } = await tts.generate(sampleText);
  const synthesisMilliseconds = Math.round(performance.now() - startedAt);

  if (!(audio instanceof Float32Array) || audio.length < sampleRate / 2) {
    throw new Error("Nabra returned an empty or implausibly short audio buffer.");
  }
  if (!audio.every(Number.isFinite)) {
    throw new Error("Nabra returned non-finite PCM samples.");
  }

  let peak = 0;
  let sumSquares = 0;
  for (const sample of audio) {
    const absolute = Math.abs(sample);
    peak = Math.max(peak, absolute);
    sumSquares += sample * sample;
  }
  const rms = Math.sqrt(sumSquares / audio.length);
  const durationSeconds = audio.length / sampleRate;
  if (peak < 0.002 || rms < 0.0001) {
    throw new Error(`Generated audio appears silent (peak=${peak}, rms=${rms}).`);
  }

  const wav = tts.toWav(audio);
  const bytes = Buffer.from(await wav.arrayBuffer());
  if (bytes.length < 44 || bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Nabra did not produce a valid WAV container.");
  }

  await writeFile(outputPath, bytes);
  const metadata = {
    text: sampleText,
    backend: tts.device,
    sampleRate,
    channels: 1,
    durationSeconds,
    synthesisMilliseconds,
    peak,
    rms,
    bytes: bytes.length,
    format: "PCM WAV"
  };
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2) + "\n");
  console.log("Verified non-silent Arabic WAV:", metadata);
} finally {
  await tts.dispose();
}
