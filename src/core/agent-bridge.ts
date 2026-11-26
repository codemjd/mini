import { renderProjectToMp4, type LocalRenderOptions } from "../video/render-project";
import { executeStudioCommand } from "./studio-commands";

export interface ExplainerStudioAgentBridge {
  readonly apiVersion: 1;
  execute: typeof executeStudioCommand;
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
      render,
      renderAndDownload
    })
  });
}
