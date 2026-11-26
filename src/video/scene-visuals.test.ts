import { describe, expect, it } from "vitest";
import { createStarterProject } from "../types/project";
import { getDiagramCards, getSceneNumberLabel } from "./scene-visuals";

describe("scene visual data", () => {
  it("uses authored process steps as diagram cards before decorative shapes", () => {
    const scene = createStarterProject().scenes[0];
    scene.blocks.push(
      { id: "step-a", kind: "step", content: "جمع البيانات" },
      { id: "step-b", kind: "step", content: "تحليل النتائج" },
      { id: "shape-a", kind: "shape", content: "زخرفة" }
    );

    expect(getDiagramCards(scene).map((block) => block.content)).toEqual([
      "جمع البيانات",
      "تحليل النتائج"
    ]);
  });

  it("uses authored shape labels when no process steps exist", () => {
    const scene = createStarterProject().scenes[0];
    scene.blocks = [
      { id: "shape-a", kind: "shape", content: "المصدر" },
      { id: "shape-b", kind: "shape", content: "التحويل" },
      { id: "shape-c", kind: "shape", content: "النتيجة" },
      { id: "shape-d", kind: "shape", content: "تجاهل الزائد" }
    ];

    expect(getDiagramCards(scene).map((block) => block.content)).toEqual([
      "المصدر",
      "التحويل",
      "النتيجة"
    ]);
  });

  it("falls back to the scene title and narration when no visual blocks exist", () => {
    const scene = createStarterProject().scenes[0];
    scene.blocks = [];

    expect(getDiagramCards(scene).map((block) => block.content)).toEqual([
      scene.title,
      scene.narration
    ]);
  });

  it("numbers scenes by their actual one-based timeline position", () => {
    expect(getSceneNumberLabel(0)).toBe("01");
    expect(getSceneNumberLabel(9)).toBe("10");
    expect(getSceneNumberLabel(-3)).toBe("01");
    expect(getSceneNumberLabel(Number.NaN)).toBe("01");
  });
});
