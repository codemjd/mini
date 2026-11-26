import { describe, expect, it } from "vitest";
import { isNarrationAudioCurrent, snapshotNarrationText } from "./narration-audio-state";

describe("narration audio state", () => {
  it("treats a scene without an audio asset as current", () => {
    expect(isNarrationAudioCurrent({ narration: "النص", narrationAudioAssetId: undefined, narrationAudioText: undefined })).toBe(true);
  });

  it("accepts matching narration snapshots regardless of surrounding whitespace", () => {
    expect(isNarrationAudioCurrent({
      narration: "  مرحبًا بالعالم  ",
      narrationAudioAssetId: "asset-1",
      narrationAudioText: snapshotNarrationText("مرحبًا بالعالم")
    })).toBe(true);
  });

  it("rejects audio if the narration text has changed", () => {
    expect(isNarrationAudioCurrent({
      narration: "النص الجديد",
      narrationAudioAssetId: "asset-1",
      narrationAudioText: "النص القديم"
    })).toBe(false);
  });

  it("treats legacy audio references without a narration snapshot as stale", () => {
    expect(isNarrationAudioCurrent({
      narration: "نص قديم",
      narrationAudioAssetId: "asset-legacy",
      narrationAudioText: undefined
    })).toBe(false);
  });
});
