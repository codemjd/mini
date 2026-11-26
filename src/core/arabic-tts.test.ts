import { describe, expect, it } from "vitest";
import { splitArabicNarration } from "./arabic-tts";

describe("Arabic narration chunking", () => {
  it("preserves word order and keeps chunks within the configured limit", () => {
    const source = "نور الشمس يضيء الأفق في الصباح";
    const chunks = splitArabicNarration(source, 10);

    expect(chunks.join(" ")).toBe(source);
    expect(chunks.every((chunk) => chunk.length <= 10)).toBe(true);
  });

  it("splits a single unusually long token without losing characters", () => {
    expect(splitArabicNarration("abcdefghijk", 4)).toEqual([
      "abcd",
      "efgh",
      "ijk"
    ]);
  });

  it("normalizes whitespace and returns no chunks for empty narration", () => {
    expect(splitArabicNarration("  مرحبا   بكم  ", 20)).toEqual(["مرحبا بكم"]);
    expect(splitArabicNarration("   ", 20)).toEqual([]);
  });
});
