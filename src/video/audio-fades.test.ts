import { describe, expect, it } from "vitest";
import { getNarrationVolume } from "./audio-fades";

describe("getNarrationVolume", () => {
  it("fades voice in and out at the clip boundaries", () => {
    expect(getNarrationVolume(0, 90, 18, 6)).toBe(0);
    expect(getNarrationVolume(6, 90, 18, 6)).toBe(1);
    expect(getNarrationVolume(71, 90, 18, 6)).toBe(1);
    expect(getNarrationVolume(72, 90, 18, 6)).toBeCloseTo(17 / 18);
    expect(getNarrationVolume(89, 90, 18, 6)).toBe(0);
  });

  it("keeps all samples in the valid volume range", () => {
    for (let frame = -5; frame < 100; frame += 1) {
      const volume = getNarrationVolume(frame, 90, 18, 6);
      expect(Number.isFinite(volume)).toBe(true);
      expect(volume).toBeGreaterThanOrEqual(0);
      expect(volume).toBeLessThanOrEqual(1);
    }
  });

  it("handles one-second scenes and very long fade requests safely", () => {
    const values = Array.from({ length: 30 }, (_, frame) => getNarrationVolume(frame, 30, 90, 90));
    expect(values[0]).toBe(0);
    expect(values[29]).toBe(0);
    expect(values.some((value) => value === 1)).toBe(true);
  });

  it("leaves audio unmodified when both fades are disabled", () => {
    expect(getNarrationVolume(0, 90, 0, 0)).toBe(1);
    expect(getNarrationVolume(45, 90, 0, 0)).toBe(1);
    expect(getNarrationVolume(89, 90, 0, 0)).toBe(1);
  });
});
