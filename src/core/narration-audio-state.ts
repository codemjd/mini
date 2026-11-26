import type { Scene } from "../types/project";

/**
 * Audio is current only when it was attached against the exact narration text
 * that remains in the scene. Legacy projects without a text snapshot are stale
 * by design: the user must regenerate or reattach narration before rendering.
 */
export function isNarrationAudioCurrent(
  scene: Pick<Scene, "narration" | "narrationAudioAssetId" | "narrationAudioText">
): boolean {
  if (!scene.narrationAudioAssetId) return true;
  return typeof scene.narrationAudioText === "string"
    && scene.narrationAudioText.trim() === scene.narration.trim();
}

export function snapshotNarrationText(text: string): string {
  return text.trim();
}
