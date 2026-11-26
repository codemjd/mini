import { describe, expect, it } from "vitest";
import {
  decodeBase64Audio,
  encodeBlobToBase64,
  MAX_NARRATION_AUDIO_BYTES
} from "./audio-asset-store";

describe("narration audio bundle encoding", () => {
  it("round-trips binary WAV bytes without corrupting data", async () => {
    const source = new Blob([Uint8Array.from([0, 1, 2, 127, 128, 254, 255])], {
      type: "audio/wav"
    });

    const encoded = await encodeBlobToBase64(source);
    const decoded = decodeBase64Audio(encoded, "audio/wav");

    expect(decoded.type).toBe("audio/wav");
    expect([...new Uint8Array(await decoded.arrayBuffer())]).toEqual([
      0, 1, 2, 127, 128, 254, 255
    ]);
  });

  it("rejects invalid audio MIME types", () => {
    expect(() => decodeBase64Audio("AQID", "application/octet-stream"))
      .toThrow("نوع ملف التعليق الصوتي غير صالح.");
  });

  it("rejects malformed Base64 data", () => {
    expect(() => decodeBase64Audio("not base64!", "audio/mpeg"))
      .toThrow("بيانات ملف الصوت داخل ملف المشروع تالفة.");
  });

  it("documents the maximum supported narration clip size", () => {
    expect(MAX_NARRATION_AUDIO_BYTES).toBe(25 * 1024 * 1024);
  });
});
