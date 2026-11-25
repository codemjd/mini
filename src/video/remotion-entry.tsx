import { Composition, registerRoot } from "remotion";
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
    defaultProps={{ project: demoProject }}
  />
);

registerRoot(RemotionRoot);
