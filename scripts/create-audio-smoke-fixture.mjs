import { mkdir, writeFile } from "node:fs/promises";

const sampleRate = 48_000;
const seconds = 5;
const channels = 1;
const bitsPerSample = 16;
const bytesPerSample = bitsPerSample / 8;
const sampleCount = sampleRate * seconds;
const dataBytes = sampleCount * channels * bytesPerSample;
const wav = Buffer.alloc(44 + dataBytes);

wav.write("RIFF", 0);
wav.writeUInt32LE(36 + dataBytes, 4);
wav.write("WAVE", 8);
wav.write("fmt ", 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(channels, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
wav.writeUInt16LE(channels * bytesPerSample, 32);
wav.writeUInt16LE(bitsPerSample, 34);
wav.write("data", 36);
wav.writeUInt32LE(dataBytes, 40);
// A deterministic digital-silence clip exercises audio decoding and muxing without adding music.
await mkdir("public", { recursive: true });
await writeFile("public/audio-smoke.wav", wav);
console.log("Generated 5-second, 48 kHz PCM narration test fixture.");
