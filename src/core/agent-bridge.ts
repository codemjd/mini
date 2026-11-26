import { renderProjectToMp4, type LocalRenderOptions } from "../video/render-project";
import { executeStudioCommand } from "./studio-commands";
import { deleteAudioAsset, saveAudioAsset } from "./project-store";
import { generateArabicNarration, type ArabicTtsProgress } from "../video/narration-tts";
import { createId, type StudioProject } from "../types/project";

export interface ExplainerStudioAgentBridge {
  readonly apiVersion: 1;
  execute: typeof executeStudioCommand;
  generateNarration: (
    projectId: string,
    sceneId: string,
    options?: { onProgress?: (progress: ArabicTtsProgress) => void; signal?: AbortSignal }
  ) => Promise<{ assetId: string; size: number; sampleRate: number; durationSeconds: number; device: "webgpu" | "wasm" }>;
  render: (project: unknown, options?: LocalRenderOptions) => Promise<Blob>;
  renderAndDownload: (project: unknown, fileName?: string, options?: LocalRenderOptions) => Promise<{ fileName: string; size: number; type: string }>;
}

declare global {
  interface Window {
    explainerStudio?: ExplainerStudioAgentBridge;
    explainerStudioRenderConsent?: boolean;
  }
}

/**
 * Exposes a narrow, typed, same-browser command and render API for authorized automation.
 * Project data stays in this browser. Rendering is blocked until the user accepts the
 * renderer's measurement/telemetry notice in the app UI.
 */
export function installExplainerStudioAgentBridge(): void {
  if (typeof window === "undefined" || window.explainerStudio) return;

  const render = async (project: unknown, options: LocalRenderOptions = {}): Promise<Blob> => {
    if (!window.explainerStudioRenderConsent) {
      throw new Error("يجب قبول إشعار خصوصية التصيير من واجهة التطبيق أولًا.");
    }
    return renderProjectToMp4(project, options);
  };

  const generateNarration: ExplainerStudioAgentBridge["generateNarration"] = async (
    projectId,
    sceneId,
    options = {}
  ) => {
    const opened = await executeStudioCommand({ type: "project.open", projectId });
    if (!opened.ok) throw new Error(opened.error);
    const project = opened.data as StudioProject;
    const scene = project.scenes.find((item) => item.id === sceneId);
    if (!scene) throw new Error("المشهد المطلوب غير موجود.");
    if (!scene.narration.trim()) throw new Error("لا يوجد نص تعليق صوتي لهذا المشهد.");

    const narrationText = scene.narration.trim();
    const generated = await generateArabicNarration(narrationText, options.onProgress, options.signal);
    if (generated.blob.size < 44 || generated.blob.size > 30 * 1024 * 1024) {
      throw new Error("حجم ملف الصوت الناتج غير صالح أو يتجاوز 30 ميغابايت.");
    }
    const latestResult = await executeStudioCommand({ type: "project.open", projectId });
    if (!latestResult.ok) throw new Error(latestResult.error);
    const latestProject = latestResult.data as StudioProject;
    const latestScene = latestProject.scenes.find((item) => item.id === sceneId);
    if (!latestScene || latestScene.narration.trim() !== narrationText) {
      throw new Error("تغيّر نص المشهد أثناء توليد الصوت. أعد المحاولة بعد تثبيت النص.");
    }
    const assetId = createId();
    await saveAudioAsset({
      id: assetId,
      projectId,
      sceneId,
      name: `${scene.title.slice(0, 180)} - صوت عربي.wav`,
      mimeType: "audio/wav",
      size: generated.blob.size,
      blob: generated.blob,
      createdAt: new Date().toISOString()
    });

    const updated = await executeStudioCommand({
      type: "scene.update",
      projectId,
      sceneId,
      patch: {
        narrationAudioAssetId: assetId,
        narrationAudioText: narrationText,
        durationSeconds: Math.max(scene.durationSeconds, Math.ceil(generated.durationSeconds + 0.25))
      }
    });
    if (!updated.ok) {
      try { await deleteAudioAsset(assetId); } catch { /* preserve command failure */ }
      throw new Error(updated.error);
    }

    if (scene.narrationAudioAssetId && scene.narrationAudioAssetId !== assetId) {
      try { await deleteAudioAsset(scene.narrationAudioAssetId); } catch { /* keep the new narration attached */ }
    }

    return {
      assetId,
      size: generated.blob.size,
      sampleRate: generated.sampleRate,
      durationSeconds: generated.durationSeconds,
      device: generated.device
    };
  };

  const renderAndDownload: ExplainerStudioAgentBridge["renderAndDownload"] = async (
    project,
    fileName = "explainer-video.mp4",
    options = {}
  ) => {
    const blob = await render(project, options);
    const safeName = fileName.toLowerCase().endsWith(".mp4") ? fileName : fileName + ".mp4";
    const url = URL.createObjectURL(blob);
    try {
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = safeName;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      window.setTimeout(() => URL.revokeObjectURL(url), 15000);
    }
    return { fileName: safeName, size: blob.size, type: blob.type };
  };

  Object.defineProperty(window, "explainerStudio", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: Object.freeze({
      apiVersion: 1 as const,
      execute: executeStudioCommand,
      generateNarration,
      render,
      renderAndDownload
    })
  });
}
