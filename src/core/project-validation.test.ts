import { describe, expect, it } from "vitest";
import { createStarterProject } from "../types/project";
import { validateStudioProject } from "./project-validation";

describe("validateStudioProject", () => {
  it("accepts a valid starter project", () => {
    const result = validateStudioProject(createStarterProject());
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.project.scenes).toHaveLength(3);
  });

  it("rejects non-object input", () => {
    const result = validateStudioProject(null);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues[0]?.path).toBe("$");
  });

  it("rejects unsupported schema versions", () => {
    const project = createStarterProject();
    const result = validateStudioProject({ ...project, schemaVersion: 99 });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues.some((issue) => issue.path === "schemaVersion")).toBe(true);
  });

  it("rejects unsupported video dimensions and frame rates", () => {
    const project = createStarterProject();
    const result = validateStudioProject({
      ...project,
      settings: { ...project.settings, width: 9999, height: 100, fps: 17 }
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.map((issue) => issue.path)).toEqual(
        expect.arrayContaining(["settings.width", "settings.height", "settings.fps"])
      );
    }
  });

  it("rejects duplicate scene identifiers", () => {
    const project = createStarterProject();
    const duplicate = { ...project.scenes[1], id: project.scenes[0].id };
    const result = validateStudioProject({ ...project, scenes: [project.scenes[0], duplicate] });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues.some((issue) => issue.path === "scenes[1].id")).toBe(true);
  });

  it("rejects duplicate visual block identifiers within a scene", () => {
    const project = createStarterProject();
    const firstScene = project.scenes[0];
    const duplicateBlock = { ...firstScene.blocks[1], id: firstScene.blocks[0].id };
    const result = validateStudioProject({
      ...project,
      scenes: [{ ...firstScene, blocks: [firstScene.blocks[0], duplicateBlock] }, ...project.scenes.slice(1)]
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues.some((issue) => issue.path === "scenes[0].blocks[1].id")).toBe(true);
  });

  it("rejects invalid scene duration, layout, and background color", () => {
    const project = createStarterProject();
    const result = validateStudioProject({
      ...project,
      scenes: [{ ...project.scenes[0], durationSeconds: 0, layout: "unknown", background: "blue" }, ...project.scenes.slice(1)]
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.map((issue) => issue.path)).toEqual(
        expect.arrayContaining(["scenes[0].durationSeconds", "scenes[0].layout", "scenes[0].background"])
      );
    }
  });

  it("rejects projects with more than 200 scenes", () => {
    const project = createStarterProject();
    const result = validateStudioProject({ ...project, scenes: Array.from({ length: 201 }, (_, index) => ({ ...project.scenes[0], id: `scene-${index}` })) });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues.some((issue) => issue.path === "scenes")).toBe(true);
  });
});
