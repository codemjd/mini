import { describe, expect, it } from "vitest";
import { createStarterProject } from "../types/project";
import {
  getProjectDurationInFrames,
  getSceneStartFrame,
  SCENE_CROSSFADE_FRAMES,
  SCENE_NARRATION_START_DELAY_FRAMES,
  SCENE_NARRATION_TAIL_FRAMES,
  getSceneNarrationStartOffsetFrames,
  getSceneDurationWithNarration
} from "./ProjectComposition";

describe("project composition timeline", () => {
  it("places each scene after the previous scene's crossfade overlap", () => {
    const project = createStarterProject();
    expect(getSceneStartFrame(project, 0)).toBe(0);
    expect(getSceneStartFrame(project, 1)).toBe(8 * 30 - SCENE_CROSSFADE_FRAMES);
    expect(getSceneStartFrame(project, 2)).toBe((8 + 12) * 30 - 2 * SCENE_CROSSFADE_FRAMES);
  });

  it("makes the final scene end exactly at the composition duration", () => {
    const project = createStarterProject();
    const lastIndex = project.scenes.length - 1;
    const lastSceneFrames = Math.round(project.scenes[lastIndex].durationSeconds * project.settings.fps);
    expect(getSceneStartFrame(project, lastIndex) + lastSceneFrames).toBe(getProjectDurationInFrames(project));
  });

  it("keeps a single-scene project free of transition deductions", () => {
    const project = createStarterProject();
    project.scenes = [project.scenes[0]];
    expect(getSceneStartFrame(project, 0)).toBe(0);
    expect(getProjectDurationInFrames(project)).toBe(8 * 30);
  });

  it("delays later narration until the incoming visual entrance is complete", () => {
    const project = createStarterProject();
    expect(getSceneNarrationStartOffsetFrames(0)).toBe(0);
    expect(getSceneNarrationStartOffsetFrames(1)).toBe(SCENE_NARRATION_START_DELAY_FRAMES);
    expect(getSceneNarrationStartOffsetFrames(2)).toBe(SCENE_NARRATION_START_DELAY_FRAMES);
    expect(
      getSceneStartFrame(project, 1) + getSceneNarrationStartOffsetFrames(1)
    ).toBe(8 * 30 + (SCENE_NARRATION_START_DELAY_FRAMES - SCENE_CROSSFADE_FRAMES));
  });

  it("extends scenes to fit the full narration, incoming offset, and tail pause", () => {
    const fps = 30;
    const duration = 3.2;
    expect(getSceneDurationWithNarration(2, duration, fps, 0) * fps)
      .toBe(Math.ceil(duration * fps) + SCENE_NARRATION_TAIL_FRAMES);
    expect(getSceneDurationWithNarration(2, duration, fps, 1) * fps)
      .toBe(Math.ceil(duration * fps) + SCENE_NARRATION_START_DELAY_FRAMES + SCENE_NARRATION_TAIL_FRAMES);
    expect(getSceneDurationWithNarration(8, duration, fps, 1)).toBe(8);
    expect(getSceneDurationWithNarration(8, Number.NaN, fps, 1)).toBe(8);
  });

  it("keeps all scene offsets non-negative for valid minimum-length scenes", () => {
    const project = createStarterProject();
    project.scenes = project.scenes.map((scene, index) => ({
      ...scene,
      id: `short-${index}`,
      durationSeconds: 1
    }));
    expect(project.scenes.map((_, index) => getSceneStartFrame(project, index))).toEqual([0, 12, 24]);
    expect(getProjectDurationInFrames(project)).toBe(54);
  });
});
