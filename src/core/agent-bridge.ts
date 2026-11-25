import { executeStudioCommand } from "./studio-commands";

export interface ExplainerStudioAgentBridge {
  readonly apiVersion: 1;
  execute: typeof executeStudioCommand;
}

declare global {
  interface Window {
    explainerStudio?: ExplainerStudioAgentBridge;
  }
}

/**
 * Exposes a narrow, typed, same-browser command API for authorized automation.
 * Commands operate only on this browser's local project database; no network calls.
 */
export function installExplainerStudioAgentBridge(): void {
  if (typeof window === "undefined" || window.explainerStudio) return;

  Object.defineProperty(window, "explainerStudio", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: Object.freeze({
      apiVersion: 1 as const,
      execute: executeStudioCommand
    })
  });
}
