import { canRenderMediaOnWeb, renderMediaOnWeb } from "@remotion/web-renderer";
import type { StudioProject } from "../types/project";
import { validateStudioProject } from "../core/project-validation";
import { getProjectDurationInFrames, ProjectComposition } from "./ProjectComposition";

export const LOCAL_RENDER_MAX_SECONDS = 90;
export const LOCAL_RENDER_MAX_WIDTH = 1280;
export const LOCAL_RENDER_MAX_HEIGHT = 720;

export interface LocalRenderOptions {
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

export async function renderProjectToMp4(
  projectInput: unknown,
  options: LocalRenderOptions = {}
): Promise<Blob> {
  const validation = validateStudioProject(projectInput);
  if (!validation.valid) {
    throw new Error(validation.issues.slice(0, 3).map((item) => item.message).join(" "));
  }
  const project = validation.project;
  const fps = project.settings.fps;
  const durationSeconds = project.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);

  if (durationSeconds > LOCAL_RENDER_MAX_SECONDS) {
    throw new Error(`التصيير المحلي التجريبي محدود بـ ${LOCAL_RENDER_MAX_SECONDS} ثانية. الفيديوهات الطويلة ستحتاج عامل تصيير منفصلًا.`);
  }

  const width = project.settings.width;
  const height = project.settings.height;
  const scale = Math.min(1, LOCAL_RENDER_MAX_WIDTH / width, LOCAL_RENDER_MAX_HEIGHT / height);
  const durationInFrames = getProjectDurationInFrames(project);

  const capability = await canRenderMediaOnWeb({
    width,
    height,
    scale,
    container: "mp4",
    videoCodec: "h264",
    muted: true
  });

  if (!capability.canRender) {
    const blockingIssues = capability.issues.filter((item) => item.severity === "error");
    throw new Error(blockingIssues.map((item) => item.message).join(" ") || "هذا المتصفح لا يدعم إعداد التصدير المطلوب.");
  }

  if (options.signal?.aborted) throw new DOMException("تم إلغاء التصدير.", "AbortError");

  const result = await renderMediaOnWeb({
    composition: {
      id: `explainer-${project.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32)}`,
      component: ProjectComposition,
      durationInFrames,
      fps,
      width,
      height
    },
    inputProps: { project },
    container: "mp4",
    videoCodec: "h264",
    muted: true,
    scale,
    videoBitrate: "high",
    pageResponsiveness: "high",
    hardwareAcceleration: "no-preference",
    signal: options.signal,
    onProgress: ({ progress }) => options.onProgress?.(Math.max(0, Math.min(1, progress))),
    metadata: {
      title: project.title,
      comment: "Explainer Studio local draft render. Silent video; no music or narration track."
    }
  });

  const blob = await result.getBlob();
  if (blob.size < 1024) throw new Error("ملف الفيديو الناتج أصغر من المتوقع؛ أوقفنا تسليمه كملف صالح.");
  return blob;
}
