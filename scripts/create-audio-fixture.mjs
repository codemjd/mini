import fs from "node:fs";

const sampleRate = 48000;
const durationSeconds = 1;
const sampleCount = sampleRate * durationSeconds;
const dataBytes = sampleCount * 2;
const wav = Buffer.alloc(44 + dataBytes);

wav.write("RIFF", 0);
wav.writeUInt32LE(36 + dataBytes, 4);
wav.write("WAVE", 8);
wav.write("fmt ", 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(dataBytes, 40);
// The fixture is deliberately silent: it tests AAC muxing, not narration content.
fs.mkdirSync("public", { recursive: true });
fs.writeFileSync("public/demo-audio-fixture.wav", wav);
console.log("Created a silent WAV fixture for the audio-render smoke test.");
