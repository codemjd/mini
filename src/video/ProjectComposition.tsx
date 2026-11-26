import { AbsoluteFill, Sequence } from "remotion";
import type { FC } from "react";
import type { StudioProject } from "../types/project";
import { SceneComposition } from "./SceneComposition";

/** Frames shared by adjacent scenes to create a true animated crossfade. */
export const SCENE_CROSSFADE_FRAMES = 18;
export const SCENE_NARRATION_START_DELAY_FRAMES = 22;
export const SCENE_NARRATION_TAIL_FRAMES = 6;

/** The first scene starts immediately; later narrations wait until their visual entrance completes. */
export function getSceneNarrationStartOffsetFrames(sceneIndex: number): number {
  return Number.isFinite(sceneIndex) && Math.floor(sceneIndex) > 0
    ? SCENE_NARRATION_START_DELAY_FRAMES
    : 0;
}

/** Preserve longer scenes and extend shorter ones to fit the entire narration safely. */
export function getSceneDurationWithNarration(
  currentDurationSeconds: number,
  narrationDurationSeconds: number,
  fps: number,
  sceneIndex: number
): number {
  if (!Number.isFinite(narrationDurationSeconds) || narrationDurationSeconds <= 0) {
    return currentDurationSeconds;
  }

  const safeFps = Number.isFinite(fps) && fps > 0 ? fps : 30;
  const currentFrames = Math.max(1, Math.round(currentDurationSeconds * safeFps));
  const narrationFrames = Math.ceil(narrationDurationSeconds * safeFps);
  const requiredFrames = narrationFrames
    + getSceneNarrationStartOffsetFrames(sceneIndex)
    + SCENE_NARRATION_TAIL_FRAMES;
  return Math.max(currentFrames, requiredFrames) / safeFps;
}

/** Resolve a scene's timeline position from the same overlap rule used by total duration. */
export function getSceneStartFrame(project: StudioProject, sceneIndex: number): number {
  const index = Math.max(0, Math.min(project.scenes.length, Math.floor(sceneIndex)));
  const framesBefore = project.scenes.slice(0, index).reduce(
    (total, scene) => total + Math.max(1, Math.round(scene.durationSeconds * project.settings.fps)),
    0
  );
  return Math.max(0, framesBefore - index * SCENE_CROSSFADE_FRAMES);
}

export const ProjectComposition: FC<{ project: StudioProject; audioSources?: Record<string, string> }> = ({ project, audioSources = {} }) => {
  const fps = project.settings.fps;

  return (
    <AbsoluteFill style={{ backgroundColor: "#10131d", overflow: "hidden" }}>
      {project.scenes.map((scene, index) => {
        const durationInFrames = Math.max(1, Math.round(scene.durationSeconds * fps));
        return (
          <Sequence
            key={scene.id}
            from={getSceneStartFrame(project, index)}
            durationInFrames={durationInFrames}
          >
            <SceneComposition
              scene={scene}
              sceneIndex={index}
              audioSource={audioSources[scene.id]}
              audioStartOffsetFrames={getSceneNarrationStartOffsetFrames(index)}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export function getProjectDurationInFrames(project: StudioProject): number {
  const sceneFrames = project.scenes.reduce(
    (total, scene) => total + Math.max(1, Math.round(scene.durationSeconds * project.settings.fps)),
    0
  );
  const transitionFrames = Math.max(0, project.scenes.length - 1) * SCENE_CROSSFADE_FRAMES;
  return Math.max(1, sceneFrames - transitionFrames);
}
