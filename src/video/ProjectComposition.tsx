import { AbsoluteFill, Sequence } from "remotion";
import type { FC } from "react";
import type { StudioProject } from "../types/project";
import { SceneComposition } from "./SceneComposition";

/** Frames shared by adjacent scenes to create a true animated crossfade. */
export const SCENE_CROSSFADE_FRAMES = 18;

export const ProjectComposition: FC<{ project: StudioProject }> = ({ project }) => {
  let elapsedFrames = 0;
  const fps = project.settings.fps;

  return (
    <AbsoluteFill style={{ backgroundColor: "#10131d", overflow: "hidden" }}>
      {project.scenes.map((scene, index) => {
        const durationInFrames = Math.max(1, Math.round(scene.durationSeconds * fps));
        const startAt = index === 0 ? 0 : Math.max(0, elapsedFrames - SCENE_CROSSFADE_FRAMES);
        elapsedFrames += durationInFrames;
        return (
          <Sequence key={scene.id} from={startAt} durationInFrames={durationInFrames}>
            <SceneComposition scene={scene} />
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
