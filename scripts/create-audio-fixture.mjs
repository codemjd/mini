import { copyFile, mkdir, readFile } from "node:fs/promises";

const sourcePath = "out/nabra-arabic-voice-smoke.wav";
const destinationPath = "public/demo-audio-fixture.wav";
const metadataPath = "out/nabra-arabic-voice-smoke.json";

const [wav, metadataText] = await Promise.all([
  readFile(sourcePath),
  readFile(metadataPath, "utf8")
]);
const metadata = JSON.parse(metadataText);

if (wav.length < 44 || wav.toString("ascii", 0, 4) !== "RIFF" || wav.toString("ascii", 8, 12) !== "WAVE") {
  throw new Error("Nabra narration fixture is not a valid WAV file.");
}
if (metadata.peak < 0.002 || metadata.rms < 0.0001) {
  throw new Error("Nabra narration fixture is silent; refusing to render a silent AAC track.");
}
if (!(metadata.durationSeconds >= 0.5 && metadata.durationSeconds <= 7.0)) {
  throw new Error(`Narration duration does not fit the demo scene: ${metadata.durationSeconds}s`);
}

await mkdir("public", { recursive: true });
await copyFile(sourcePath, destinationPath);
console.log("Prepared real, non-silent Arabic narration for Remotion:", {
  durationSeconds: metadata.durationSeconds,
  sampleRate: metadata.sampleRate,
  peak: metadata.peak,
  rms: metadata.rms
});
