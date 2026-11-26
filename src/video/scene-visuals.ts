import type { Scene, VisualBlock } from "../types/project";

export function getDiagramCards(scene: Pick<Scene, "blocks" | "title" | "narration">): VisualBlock[] {
  const steps = scene.blocks.filter((block) => block.kind === "step");
  if (steps.length > 0) return steps.slice(0, 3);

  const shapes = scene.blocks.filter((block) => block.kind === "shape");
  if (shapes.length > 0) return shapes.slice(0, 3);

  const authoredContent = scene.blocks.filter((block) => block.kind !== "shape").slice(0, 3);
  if (authoredContent.length > 0) return authoredContent;

  return [
    { id: "fallback-heading", kind: "heading", content: scene.title },
    { id: "fallback-narration", kind: "body", content: scene.narration }
  ];
}

export function getSceneNumberLabel(sceneIndex: number): string {
  const safeIndex = Number.isFinite(sceneIndex) ? Math.max(0, Math.floor(sceneIndex)) : 0;
  return String(safeIndex + 1).padStart(2, "0");
}
