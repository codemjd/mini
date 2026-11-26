import { describe, expect, it } from "vitest";
import {
  MAX_SEGMENT_CHARACTERS,
  splitArabicSpeechText
} from "./narration-tts";

describe("splitArabicSpeechText", () => {
  it("keeps all words while limiting generated segments", () => {
    const words = Array.from({ length: 90 }, (_, index) => `كلمة${index}`);
    const input = words.join(" ");
    const chunks = splitArabicSpeechText(input);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => Array.from(chunk).length <= MAX_SEGMENT_CHARACTERS)).toBe(true);
    expect(chunks.join(" ").split(/\\s+/u)).toEqual(words);
  });

  it("preserves Arabic sentence punctuation across segments", () => {
    const chunks = splitArabicSpeechText("مرحبًا. كيف حالك؟\nأنا بخير؛ شكرًا لك.");
    const combined = chunks.join(" ");

    expect(combined).toContain(".");
    expect(combined).toContain("؟");
    expect(combined).toContain("؛");
    expect(chunks).toHaveLength(4);
  });

  it("splits oversized words by Unicode code point without dropping characters", () => {
    const input = "م".repeat(MAX_SEGMENT_CHARACTERS * 2 + 7);
    const chunks = splitArabicSpeechText(input);

    expect(chunks.map((chunk) => Array.from(chunk).length)).toEqual([160, 160, 7]);
    expect(chunks.join("")).toBe(input);
  });
});
