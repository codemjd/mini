import { AbsoluteFill, Sequence } from "remotion";
import type { FC } from "react";
import type { StudioProject } from "../types/project";
import { SceneComposition } from "./SceneComposition";

export const ProjectComposition: FC<{ project: StudioProject }> = ({ project }) => {
  let from = 0;
  const fps = project.settings.fps;

  return (
    <AbsoluteFill style={{ backgroundColor: "#10131d", overflow: "hidden" }}>
      {project.scenes.map((scene) => {
        const durationInFrames = Math.max(1, Math.round(scene.durationSeconds * fps));
        const startAt = from;
        from += durationInFrames;
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
  return project.scenes.reduce((total, scene) => total + Math.max(1, Math.round(scene.durationSeconds * project.settings.fps)), 0);
}
