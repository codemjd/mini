import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import { installExplainerStudioAgentBridge } from "./core/agent-bridge";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element #root was not found.");

installExplainerStudioAgentBridge();

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error: unknown) => {
      console.error("Explainer Studio offline shell registration failed:", error);
    });
  });
}
