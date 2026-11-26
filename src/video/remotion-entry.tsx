import { Composition, registerRoot, staticFile } from "remotion";
import type { FC } from "react";
import { demoProject } from "./demo-project";
import { getProjectDurationInFrames, ProjectComposition } from "./ProjectComposition";

const RemotionRoot: FC = () => (
  <Composition
    id="ExplainerDemo"
    component={ProjectComposition}
    durationInFrames={getProjectDurationInFrames(demoProject)}
    fps={demoProject.settings.fps}
    width={demoProject.settings.width}
    height={demoProject.settings.height}
    defaultProps={{ project: demoProject, audioSources: Object.fromEntries(demoProject.scenes.map((scene) => [scene.id, staticFile("audio-smoke.wav")])) }}
  />
);

registerRoot(RemotionRoot);
