import { AbsoluteFill, Sequence } from "remotion";
import type { FC } from "react";
import type { StudioProject } from "../types/project";
import { SceneComposition } from "./SceneComposition";

/** Frames shared by adjacent scenes to create a true animated crossfade. */
export const SCENE_CROSSFADE_FRAMES = 18;

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
            <SceneComposition scene={scene} sceneIndex={index} narrationAudioSrc={audioSources[scene.id]} />
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
