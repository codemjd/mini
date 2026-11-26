import { useEffect, useMemo, useRef, useState } from "react";
import { Player } from "@remotion/player";
import { SceneComposition } from "./video/SceneComposition";
import { renderProjectToMp4 } from "./video/render-project";
import type { ChangeEvent, ReactNode } from "react";
import {
  createId,
  summarizeProject,
  type Scene,
  type SceneLayout,
  type StudioProject
} from "./types/project";
import { deleteAudioAsset, listProjectAudioAssets, listProjects, loadAudioAsset, saveAudioAsset } from "./core/project-store";
import { executeStudioCommand } from "./core/studio-commands";
import { validateStudioProject } from "./core/project-validation";
import { generateArabicNarration } from "./video/narration-tts";
import { isNarrationAudioCurrent } from "./core/narration-audio-state";

type AppView = "dashboard" | "editor";
type IconName = "grid" | "folder" | "plus" | "play" | "chevron" | "clock" | "layers" | "settings" | "trash" | "download" | "upload" | "arrow" | "spark" | "film" | "check" | "more" | "close" | "add" | "back";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    folder: <><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" /><path d="M3.5 10h17" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    play: <path d="m9 6 10 6-10 6z" fill="currentColor" stroke="none" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.2 2.1-2 2-2.1-1.2-.1-.1-1.4.6-.5 2.5h-2.8l-.5-2.5-1.4-.6-.1.1-2.1 1.2-2-2 1.2-2.1.1-.1-.6-1.4-2.5-.5v-2.8l2.5-.5.6-1.4-.1-.1L4.8 6.2l2-2L8.9 5.4l.1.1 1.4-.6.5-2.5h2.8l.5 2.5 1.4.6.1-.1 2.1-1.2 2 2-1.2 2.1-.1.1.6 1.4 2.5.5v2.8l-2.5.5z" /></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5" /><path d="M4 17v3h16v-3" /></>,
    upload: <><path d="M12 16V4m-5 5 5-5 5 5" /><path d="M4 17v3h16v-3" /></>,
    arrow: <><path d="M19 12H5m7-7-7 7 7 7" /></>,
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" /></>,
    film: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4m-4 6h4m10-6h4m-4 6h4" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    add: <><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M12 7v10M7 12h10" /></>,
    back: <path d="m15 18-6-6 6-6" />
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins > 0 ? `${mins} د ${secs} ث` : `${secs} ثانية`;
}

function formatRelativeDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar", { day: "numeric", month: "short" }).format(date);
}

const MAX_AUDIO_ASSET_BYTES = 30 * 1024 * 1024;
const MAX_AUDIO_BUNDLE_BYTES = 80 * 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("تعذر تجهيز ملف الصوت للتصدير."));
    reader.onerror = () => reject(reader.error ?? new Error("تعذرت قراءة ملف الصوت."));
    reader.readAsDataURL(blob);
  });
}

function readAudioDurationSeconds(blob: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    const url = URL.createObjectURL(blob);
    let settled = false;
    const finish = (duration: number | null) => {
      if (settled) return;
      settled = true;
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(url);
      resolve(duration && Number.isFinite(duration) && duration > 0 ? duration : null);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => finish(audio.duration);
    audio.onerror = () => finish(null);
    audio.src = url;
    audio.load();
  });
}

async function dataUrlToAudioBlob(value: unknown): Promise<Blob> {
  if (typeof value !== "string" || !value.startsWith("data:audio/")) {
    throw new Error("صيغة ملف الصوت داخل الحزمة غير مدعومة.");
  }
  const response = await fetch(value);
  const blob = await response.blob();
  if (!blob.type.startsWith("audio/")) throw new Error("نوع ملف الصوت داخل الحزمة غير صالح.");
  return blob;
}

function PreviewCanvas({ scene }: { scene: Scene }) {
  const heading = scene.blocks.find((block) => block.kind === "heading")?.content ?? scene.title;
  const body = scene.blocks.find((block) => block.kind === "body")?.content ?? scene.narration;

  return (
    <div className="preview-canvas" style={{ background: scene.background }}>
      <div className="preview-grid" />
      <div className="preview-orbit orbit-one" />
      <div className="preview-orbit orbit-two" />
      <div className="preview-geometry">
        <div className="geometry-card">
          <span className="geometry-kicker">EXPLAINER / 01</span>
          <div className="geometry-lines"><i /><i /><i /></div>
          <div className="geometry-ring"><span /></div>
        </div>
        <div className="geometry-node node-a" />
        <div className="geometry-node node-b" />
        <div className="geometry-line line-a" />
        <div className="geometry-line line-b" />
      </div>
      <div className="preview-copy">
        <span className="preview-eyebrow">مشهد {scene.title}</span>
        <h2>{heading}</h2>
        <p>{body}</p>
        <div className="preview-progress"><span /></div>
      </div>
      <div className="preview-watermark">EXPLAINER STUDIO</div>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`}>
      <div className="brand-mark"><span /><span /><span /></div>
      {!compact && <div className="brand-copy"><strong>EXPLAINER</strong><span>STUDIO</span></div>}
    </div>
  );
}

export default function App() {
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [activeProject, setActiveProject] = useState<StudioProject | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [view, setView] = useState<AppView>("dashboard");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [showRenderConsent, setShowRenderConsent] = useState(false);
  const [renderConsentAccepted, setRenderConsentAccepted] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("مشروع جديد");
  const [toast, setToast] = useState("");
  const [previewAudio, setPreviewAudio] = useState<{ id: string; name: string; url: string } | null>(null);
  const [ttsGenerating, setTtsGenerating] = useState(false);
  const [ttsProgress, setTtsProgress] = useState(0);
  const [ttsStatus, setTtsStatus] = useState("");
  const ttsAbortRef = useRef<AbortController | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const renderAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let mounted = true;
    listProjects()
      .then((items) => { if (mounted) setProjects(items); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!activeProject) return;
    setSaving(true);
    const timer = window.setTimeout(() => {
      executeStudioCommand({ type: "project.save", project: activeProject })
        .then((result) => {
          if (!result.ok) {
            setToast(result.error);
            return;
          }
          setProjects((current) => {
            const next = current.filter((item) => item.id !== activeProject.id);
            return [activeProject, ...next].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
          });
        })
        .finally(() => setSaving(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [activeProject]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectedScene = useMemo(
    () => activeProject?.scenes.find((scene) => scene.id === selectedSceneId) ?? activeProject?.scenes[0] ?? null,
    [activeProject, selectedSceneId]
  );

  useEffect(() => {
    let disposed = false;
    let objectUrl: string | null = null;
    const assetId = selectedScene?.narrationAudioAssetId;
    setPreviewAudio(null);
    if (!assetId || !selectedScene || !isNarrationAudioCurrent(selectedScene)) {
      return () => { disposed = true; };
    }

    void loadAudioAsset(assetId).then((asset) => {
      if (!asset) {
        if (!disposed) setToast("ملف التعليق الصوتي غير موجود في التخزين المحلي.");
        return;
      }
      if (asset.projectId !== activeProject?.id || asset.sceneId !== selectedScene.id) {
        if (!disposed) setToast("ملف الصوت لا يطابق هذا المشهد.");
        return;
      }
      objectUrl = URL.createObjectURL(asset.blob);
      if (disposed) {
        URL.revokeObjectURL(objectUrl);
        return;
      }
      setPreviewAudio({ id: asset.id, name: asset.name, url: objectUrl });
    }).catch((error) => {
      if (!disposed) setToast(error instanceof Error ? error.message : "تعذر تحميل ملف التعليق الصوتي.");
    });

    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [activeProject?.id, selectedScene?.id, selectedScene?.narration, selectedScene?.narrationAudioAssetId, selectedScene?.narrationAudioText]);

  const projectDuration = activeProject?.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0) ?? 0;
  const totalDuration = projects.reduce((sum, project) => sum + project.scenes.reduce((duration, scene) => duration + scene.durationSeconds, 0), 0);

  function updateProject(updater: (project: StudioProject) => StudioProject) {
    setActiveProject((current) => {
      if (!current) return current;
      const next = updater(current);
      return { ...next, updatedAt: new Date().toISOString() };
    });
  }

  function updateScene(updater: (scene: Scene) => Scene) {
    if (!selectedScene) return;
    updateProject((project) => ({
      ...project,
      scenes: project.scenes.map((scene) => scene.id === selectedScene.id ? updater(scene) : scene)
    }));
  }

  function updateIndexedVisualBlock(kind: "step" | "metric", index: number, content: string) {
    updateScene((scene) => {
      const matchingIndexes = scene.blocks
        .map((block, blockIndex) => block.kind === kind ? blockIndex : -1)
        .filter((blockIndex) => blockIndex >= 0);
      const existingIndex = matchingIndexes[index];
      if (existingIndex === undefined) {
        return { ...scene, blocks: [...scene.blocks, { id: createId(), kind, content }] };
      }
      const blocks = [...scene.blocks];
      blocks[existingIndex] = { ...blocks[existingIndex], content };
      return { ...scene, blocks };
    });
  }

  async function openProject(project: StudioProject) {
    const result = await executeStudioCommand({ type: "project.open", projectId: project.id });
    if (!result.ok) {
      setToast(result.error);
      return;
    }
    const opened = result.data as StudioProject;
    setActiveProject(opened);
    setSelectedSceneId(opened.scenes[0]?.id ?? null);
    setView("editor");
  }

  async function createProject() {
    const title = newProjectTitle.trim() || "مشروع جديد";
    const result = await executeStudioCommand({ type: "project.create", title });
    if (!result.ok) {
      setToast(result.error);
      return;
    }
    const project = result.data as StudioProject;
    setProjects((current) => [project, ...current]);
    setActiveProject(project);
    setSelectedSceneId(project.scenes[0]?.id ?? null);
    setShowNewProject(false);
    setNewProjectTitle("مشروع جديد");
    setView("editor");
  }

  async function removeProject(project: StudioProject) {
    const confirmed = window.confirm(`هل تريد حذف مشروع «${project.title}» من هذا الجهاز؟`);
    if (!confirmed) return;
    const result = await executeStudioCommand({ type: "project.delete", projectId: project.id });
    if (!result.ok) {
      setToast(result.error);
      return;
    }
    let audioCleanupFailed = false;
    try {
      const audioAssets = await listProjectAudioAssets(project.id);
      await Promise.all(audioAssets.map((asset) => deleteAudioAsset(asset.id)));
    } catch {
      audioCleanupFailed = true;
    }
    setProjects((current) => current.filter((item) => item.id !== project.id));
    if (activeProject?.id === project.id) {
      setActiveProject(null);
      setView("dashboard");
    }
    setToast(audioCleanupFailed
      ? "حُذف المشروع، لكن تعذر حذف بعض ملفات الصوت المحلية."
      : "تم حذف المشروع من هذا الجهاز");
  }

  async function addScene() {
    if (!activeProject) return;
    const saved = await executeStudioCommand({ type: "project.save", project: activeProject });
    if (!saved.ok) {
      setToast(saved.error);
      return;
    }
    const result = await executeStudioCommand({ type: "scene.add", projectId: activeProject.id });
    if (!result.ok) {
      setToast(result.error);
      return;
    }
    const data = result.data as { project: StudioProject; scene: Scene };
    setActiveProject(data.project);
    setSelectedSceneId(data.scene.id);
    setToast("أُضيف مشهد جديد");
  }

  async function moveScene(direction: -1 | 1) {
    if (!activeProject || !selectedScene) return;
    const index = activeProject.scenes.findIndex((scene) => scene.id === selectedScene.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= activeProject.scenes.length) return;
    const saved = await executeStudioCommand({ type: "project.save", project: activeProject });
    if (!saved.ok) {
      setToast(saved.error);
      return;
    }
    const result = await executeStudioCommand({
      type: "scene.reorder",
      projectId: activeProject.id,
      sceneId: selectedScene.id,
      toIndex: target
    });
    if (!result.ok) {
      setToast(result.error);
      return;
    }
    setActiveProject(result.data as StudioProject);
  }

  async function removeScene() {
    if (!activeProject || !selectedScene) return;
    if (activeProject.scenes.length <= 1) {
      setToast("يجب أن يحتوي المشروع على مشهد واحد على الأقل");
      return;
    }
    const saved = await executeStudioCommand({ type: "project.save", project: activeProject });
    if (!saved.ok) {
      setToast(saved.error);
      return;
    }
    const result = await executeStudioCommand({
      type: "scene.remove",
      projectId: activeProject.id,
      sceneId: selectedScene.id
    });
    if (!result.ok) {
      setToast(result.error);
      return;
    }
    const updated = result.data as StudioProject;
    setActiveProject(updated);
    setSelectedSceneId(updated.scenes[0]?.id ?? null);
    if (selectedScene.narrationAudioAssetId
      && !updated.scenes.some((scene) => scene.narrationAudioAssetId === selectedScene.narrationAudioAssetId)) {
      void deleteAudioAsset(selectedScene.narrationAudioAssetId).catch(() => {
        setToast("حُذف المشهد، لكن تعذر حذف ملف الصوت المحلي المرتبط به.");
      });
    }
    setToast("تم حذف المشهد");
  }

  async function exportProject() {
    if (!activeProject) return;
    try {
      const staleAudioScene = activeProject.scenes.find((scene) =>
        scene.narrationAudioAssetId && !isNarrationAudioCurrent(scene)
      );
      if (staleAudioScene) {
        throw new Error(`نص التعليق في المشهد «${staleAudioScene.title}» تغيّر بعد إرفاق الصوت. أعد توليد الصوت أو أرفق ملفًا جديدًا قبل تصدير الحزمة.`);
      }
      const assetIds = Array.from(new Set(activeProject.scenes
        .map((scene) => scene.narrationAudioAssetId)
        .filter((id): id is string => Boolean(id))));
      const assets: Array<{ id: string; sceneId: string; name: string; mimeType: string; createdAt: string; dataUrl: string }> = [];
      let totalBytes = 0;

      for (const id of assetIds) {
        const asset = await loadAudioAsset(id);
        if (!asset) throw new Error("يوجد ملف صوتي مفقود. أعد إرفاقه قبل تصدير حزمة المشروع.");
        const scene = activeProject.scenes.find((item) => item.narrationAudioAssetId === id);
        if (!scene || asset.projectId !== activeProject.id || asset.sceneId !== scene.id) {
          throw new Error("يوجد ملف صوتي مرتبط بمشروع أو مشهد آخر.");
        }
        totalBytes += asset.size;
        if (totalBytes > MAX_AUDIO_BUNDLE_BYTES) {
          throw new Error("إجمالي ملفات الصوت يتجاوز حد الحزمة البالغ 80 ميغابايت.");
        }
        assets.push({
          id: asset.id,
          sceneId: asset.sceneId,
          name: asset.name,
          mimeType: asset.mimeType,
          createdAt: asset.createdAt,
          dataUrl: await blobToDataUrl(asset.blob)
        });
      }

      const bundle = {
        format: "explainer-studio-project-bundle",
        version: 1,
        project: activeProject,
        audioAssets: assets
      };
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = (activeProject.title.replace(/[^\\p{L}\\p{N}-]+/gu, "-") || "explainer-project") + ".json";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      setToast(assetIds.length ? "تم تصدير المشروع مع ملفات التعليق الصوتي" : "تم تجهيز ملف المشروع");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "تعذر تصدير المشروع.");
    }
  }

  async function importProject(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const importedAudioIds: string[] = [];
    try {
      if (file.size > 120 * 1024 * 1024) {
        throw new Error("حزمة المشروع كبيرة جدًا؛ الحد الأقصى للاستيراد 120 ميغابايت.");
      }
      const parsed: unknown = JSON.parse(await file.text());
      const bundleRecord = isRecord(parsed)
        && parsed.format === "explainer-studio-project-bundle"
        && parsed.version === 1
        ? parsed
        : null;
      const validation = validateStudioProject(bundleRecord ? bundleRecord.project : parsed);
      if (!validation.valid) {
        const firstIssues = validation.issues.slice(0, 3).map((item) => item.message).join(" ");
        throw new Error(firstIssues || "ملف المشروع لا يطابق الصيغة المدعومة.");
      }

      const project = validation.project;
      if (bundleRecord) {
        if (!Array.isArray(bundleRecord.audioAssets)) {
          throw new Error("قائمة ملفات الصوت داخل الحزمة غير صالحة.");
        }
        const references = new Map<string, string>();
        for (const scene of project.scenes) {
          if (scene.narrationAudioAssetId) references.set(scene.narrationAudioAssetId, scene.id);
        }

        const importedIds = new Map<string, string>();
        const seenIds = new Set<string>();
        let totalBytes = 0;

        for (const rawAsset of bundleRecord.audioAssets) {
          if (!isRecord(rawAsset)
            || typeof rawAsset.id !== "string"
            || typeof rawAsset.sceneId !== "string"
            || typeof rawAsset.name !== "string"
            || typeof rawAsset.mimeType !== "string") {
            throw new Error("أحد ملفات الصوت داخل الحزمة يحتوي بيانات ناقصة.");
          }
          if (seenIds.has(rawAsset.id) || references.get(rawAsset.id) !== rawAsset.sceneId) {
            throw new Error("ارتباط ملف الصوت بالمشهد غير صحيح أو مكرر.");
          }
          seenIds.add(rawAsset.id);

          const blob = await dataUrlToAudioBlob(rawAsset.dataUrl);
          if (blob.size < 1 || blob.size > MAX_AUDIO_ASSET_BYTES) {
            throw new Error("أحد ملفات الصوت يتجاوز الحد المسموح أو فارغ.");
          }
          totalBytes += blob.size;
          if (totalBytes > MAX_AUDIO_BUNDLE_BYTES) {
            throw new Error("إجمالي ملفات الصوت داخل الحزمة يتجاوز 80 ميغابايت.");
          }

          const newId = createId();
          await saveAudioAsset({
            id: newId,
            projectId: project.id,
            sceneId: rawAsset.sceneId,
            name: rawAsset.name.slice(0, 255),
            mimeType: blob.type || rawAsset.mimeType,
            size: blob.size,
            blob,
            createdAt: typeof rawAsset.createdAt === "string" ? rawAsset.createdAt : new Date().toISOString()
          });
          importedAudioIds.push(newId);
          importedIds.set(rawAsset.id, newId);
        }

        if (seenIds.size !== references.size) {
          throw new Error("الحزمة لا تتضمن كل ملفات الصوت المرتبطة بالمشاهد.");
        }
        project.scenes = project.scenes.map((scene) => scene.narrationAudioAssetId
          ? { ...scene, narrationAudioAssetId: importedIds.get(scene.narrationAudioAssetId) }
          : scene);
      }

      project.updatedAt = new Date().toISOString();
      const saved = await executeStudioCommand({ type: "project.save", project });
      if (!saved.ok) throw new Error(saved.error);
      setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)]);
      await openProject(project);
      setToast(importedAudioIds.length ? "تم استيراد المشروع وملفات الصوت" : "تم استيراد المشروع");
    } catch (error) {
      await Promise.all(importedAudioIds.map(async (id) => {
        try { await deleteAudioAsset(id); } catch { /* keep the original import error */ }
      }));
      setToast(error instanceof Error ? error.message : "تعذر استيراد الملف");
    } finally {
      event.target.value = "";
    }
  }

  async function handleNarrationAudioUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !activeProject || !selectedScene) return;

    const targetProject = activeProject;
    const targetScene = selectedScene;
    const narrationSnapshot = targetScene.narration.trim();
    let createdAssetId: string | null = null;

    try {
      if (file.size < 1 || file.size > MAX_AUDIO_ASSET_BYTES) {
        throw new Error("حجم ملف التعليق يجب أن يكون أقل من 30 ميغابايت.");
      }
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      const supportedAudioTypes: Record<string, string> = {
        mp3: "audio/mpeg",
        wav: "audio/wav"
      };
      const mimeType = supportedAudioTypes[extension];
      const browserType = file.type.toLowerCase();
      if (!mimeType || (browserType && browserType !== mimeType && !(extension === "wav" && browserType === "audio/x-wav"))) {
        throw new Error("يدعم الاستوديو حاليًا ملفات MP3 وWAV فقط لضمان توافق المعاينة والتصدير.");
      }

      const audioDurationSeconds = await readAudioDurationSeconds(file);
      const latestResult = await executeStudioCommand({ type: "project.open", projectId: targetProject.id });
      if (!latestResult.ok) throw new Error(latestResult.error);
      const latestProject = latestResult.data as StudioProject;
      const latestScene = latestProject.scenes.find((scene) => scene.id === targetScene.id);
      if (!latestScene || latestScene.narration.trim() !== narrationSnapshot) {
        throw new Error("تغيّر نص المشهد أثناء تجهيز الملف الصوتي. أعد إرفاق الصوت بعد تثبيت النص.");
      }

      const assetId = createId();
      createdAssetId = assetId;
      await saveAudioAsset({
        id: assetId,
        projectId: targetProject.id,
        sceneId: targetScene.id,
        name: file.name.slice(0, 255),
        mimeType,
        size: file.size,
        blob: file,
        createdAt: new Date().toISOString()
      });

      const result = await executeStudioCommand({
        type: "scene.update",
        projectId: targetProject.id,
        sceneId: targetScene.id,
        patch: {
          narrationAudioAssetId: assetId,
          narrationAudioText: narrationSnapshot,
          durationSeconds: audioDurationSeconds
            ? Math.max(latestScene.durationSeconds, Math.ceil(audioDurationSeconds))
            : latestScene.durationSeconds
        }
      });
      if (!result.ok) throw new Error(result.error);

      const updatedProject = result.data as StudioProject;
      setProjects((current) => [
        updatedProject,
        ...current.filter((item) => item.id !== updatedProject.id)
      ]);
      setActiveProject((current) => current?.id === updatedProject.id ? updatedProject : current);
      createdAssetId = null;

      const previousId = latestScene.narrationAudioAssetId;
      const previousStillUsed = previousId && updatedProject.scenes.some((scene) =>
        scene.id !== targetScene.id && scene.narrationAudioAssetId === previousId
      );
      if (previousId && previousId !== assetId && !previousStillUsed) {
        try { await deleteAudioAsset(previousId); } catch { /* keep the new audio linked */ }
      }

      setToast("تم إرفاق التعليق الصوتي وربطه بنص المشهد الحالي");
    } catch (error) {
      if (createdAssetId) {
        try { await deleteAudioAsset(createdAssetId); } catch { /* preserve the original upload error */ }
      }
      setToast(error instanceof Error ? error.message : "تعذر إرفاق ملف الصوت.");
    } finally {
      event.target.value = "";
    }
  }

  async function generateNarrationAudio() {
    if (!activeProject || !selectedScene || ttsGenerating) return;
    const targetProject = activeProject;
    const targetScene = selectedScene;
    const narrationText = targetScene.narration.trim();
    if (!narrationText) {
      setToast("اكتب نص التعليق أولًا.");
      return;
    }

    const controller = new AbortController();
    ttsAbortRef.current = controller;
    setTtsGenerating(true);
    setTtsProgress(0);
    setTtsStatus("تهيئة محرك الصوت العربي");

    let createdAssetId: string | null = null;
    try {
      const generated = await generateArabicNarration(
        narrationText,
        (progress) => {
          setTtsStatus(progress.detail);
          if (progress.progress !== null) {
            setTtsProgress(Math.round(progress.progress));
          }
        },
        controller.signal
      );

      if (generated.blob.size < 1 || generated.blob.size > MAX_AUDIO_ASSET_BYTES) {
        throw new Error("ملف الصوت الناتج أكبر من حد التخزين البالغ 30 ميغابايت.");
      }

      const assetId = createId();
      createdAssetId = assetId;
      await saveAudioAsset({
        id: assetId,
        projectId: targetProject.id,
        sceneId: targetScene.id,
        name: `${targetScene.title.slice(0, 180)} - صوت عربي.wav`,
        mimeType: "audio/wav",
        size: generated.blob.size,
        blob: generated.blob,
        createdAt: new Date().toISOString()
      });

      const latestResult = await executeStudioCommand({
        type: "project.open",
        projectId: targetProject.id
      });
      if (!latestResult.ok) throw new Error(latestResult.error);
      const latestProject = latestResult.data as StudioProject;
      const latestScene = latestProject.scenes.find((scene) => scene.id === targetScene.id);
      if (!latestScene || latestScene.narration.trim() !== narrationText) {
        throw new Error("تغيّر نص المشهد أثناء توليد الصوت. لم نربط التسجيل بالنص القديم؛ أعد المحاولة بعد تثبيت النص.");
      }

      const fittedDuration = Math.max(targetScene.durationSeconds, Math.ceil(generated.durationSeconds + 0.25));
      const result = await executeStudioCommand({
        type: "scene.update",
        projectId: targetProject.id,
        sceneId: targetScene.id,
        patch: {
          narrationAudioAssetId: assetId,
          narrationAudioText: narrationText,
          durationSeconds: fittedDuration
        }
      });
      if (!result.ok) throw new Error(result.error);

      const updatedProject = result.data as StudioProject;
      setProjects((current) => [
        updatedProject,
        ...current.filter((item) => item.id !== updatedProject.id)
      ]);
      setActiveProject((current) => current?.id === updatedProject.id ? updatedProject : current);
      createdAssetId = null;

      if (targetScene.narrationAudioAssetId && targetScene.narrationAudioAssetId !== assetId) {
        try { await deleteAudioAsset(targetScene.narrationAudioAssetId); } catch { /* keep the newly attached narration */ }
      }

      setToast(
        generated.device === "webgpu"
          ? "تم توليد التعليق العربي محليًا عبر WebGPU"
          : "تم توليد التعليق العربي محليًا عبر WASM"
      );
    } catch (error) {
      if (createdAssetId) {
        try { await deleteAudioAsset(createdAssetId); } catch { /* preserve the original generation error */ }
      }
      if (error instanceof DOMException && error.name === "AbortError") {
        setToast("تم إلغاء توليد التعليق الصوتي.");
      } else {
        setToast(error instanceof Error ? error.message : "تعذر توليد التعليق الصوتي.");
      }
    } finally {
      ttsAbortRef.current = null;
      setTtsGenerating(false);
      setTtsProgress(0);
      setTtsStatus("");
    }
  }

  function cancelNarrationGeneration() {
    ttsAbortRef.current?.abort();
  }

  async function removeNarrationAudio() {
    const assetId = selectedScene?.narrationAudioAssetId;
    if (!assetId) return;
    updateScene((scene) => ({ ...scene, narrationAudioAssetId: undefined, narrationAudioText: undefined }));
    const stillReferenced = activeProject?.scenes.some((scene) =>
      scene.id !== selectedScene?.id && scene.narrationAudioAssetId === assetId
    );
    try {
      if (!stillReferenced) await deleteAudioAsset(assetId);
      setToast("تمت إزالة ملف التعليق الصوتي");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "تعذر حذف ملف الصوت.");
    }
  }

  function cancelVideoRender() {
    renderAbortRef.current?.abort();
  }

  function handleExportVideo() {
    if (!activeProject || rendering) return;
    if (!renderConsentAccepted) {
      setShowRenderConsent(true);
      return;
    }
    void performVideoRender();
  }

  function acceptRenderTelemetry() {
    setRenderConsentAccepted(true);
    window.explainerStudioRenderConsent = true;
    setShowRenderConsent(false);
    void performVideoRender();
  }

  async function performVideoRender() {
    if (!activeProject || rendering) return;
    const controller = new AbortController();
    renderAbortRef.current = controller;
    setRendering(true);
    setRenderProgress(0);
    setToast("بدأ تصيير الفيديو على هذا الجهاز");
    try {
      const blob = await renderProjectToMp4(activeProject, {
        onProgress: (progress) => setRenderProgress(progress),
        signal: controller.signal
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${activeProject.title.replace(/[^\\p{L}\\p{N}-]+/gu, "-") || "explainer"}.mp4`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 15000);
      setToast("اكتمل تصيير MP4 وتم تجهيز الملف");
    } catch (error) {
      setToast(error instanceof DOMException && error.name === "AbortError" ? "تم إلغاء تصيير الفيديو" : error instanceof Error ? error.message : "تعذر تصيير الفيديو في هذا المتصفح");
    } finally {
      renderAbortRef.current = null;
      setRendering(false);
      setRenderProgress(0);
    }
  }

  function goHome() {
    if (activeProject) void executeStudioCommand({ type: "project.save", project: activeProject });
    setView("dashboard");
    setActiveProject(null);
    setSelectedSceneId(null);
  }

  if (view === "editor" && activeProject) {
    const firstHeading = selectedScene?.blocks.find((block) => block.kind === "heading");
    const firstBody = selectedScene?.blocks.find((block) => block.kind === "body");
    const timelineTotal = Math.max(projectDuration, 1);

    return (
      <main className="app-shell editor-shell">
        <header className="editor-topbar">
          <div className="editor-brand-row">
            <button className="icon-button back-button" onClick={goHome} aria-label="العودة للمشاريع"><Icon name="back" /></button>
            <Brand compact />
            <span className="topbar-divider" />
            <div className="project-heading">
              <strong>{activeProject.title}</strong>
              <small>{saving ? "جارٍ الحفظ…" : "محفوظ على هذا الجهاز"}</small>
            </div>
          </div>
          <div className="editor-top-actions">
            <button className="subtle-button" onClick={exportProject}><Icon name="download" size={16} /><span>تصدير المشروع</span></button>
            <button className="primary-button small" onClick={handleExportVideo} disabled={rendering}><Icon name="film" size={16} /><span>{rendering ? `جارٍ التصيير ${Math.round(renderProgress * 100)}%` : "إنتاج MP4"}</span></button>{rendering && <button className="subtle-button small" onClick={cancelVideoRender}>إلغاء</button>}
          </div>
        </header>

        <div className="editor-main">
          <aside className="scene-panel panel">
            <div className="panel-heading">
              <div><span className="eyebrow">STORYBOARD</span><h2>المشاهد</h2></div>
              <button className="small-icon-button" onClick={addScene} aria-label="إضافة مشهد"><Icon name="plus" /></button>
            </div>
            <div className="scene-list">
              {activeProject.scenes.map((scene, index) => (
                <button
                  key={scene.id}
                  className={`scene-item ${selectedScene?.id === scene.id ? "active" : ""}`}
                  onClick={() => setSelectedSceneId(scene.id)}
                >
                  <div className="scene-thumbnail" style={{ background: scene.background }}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <i />
                    <b />
                  </div>
                  <div className="scene-item-copy"><strong>{scene.title}</strong><small>{formatDuration(scene.durationSeconds)}</small></div>
                  <span className="scene-item-index">{String(index + 1).padStart(2, "0")}</span>
                </button>
              ))}
            </div>
            <button className="add-scene-wide" onClick={addScene}><Icon name="plus" size={16} /> إضافة مشهد جديد</button>
          </aside>

          <section className="workspace">
            <div className="workspace-heading">
              <div><span className="eyebrow">CANVAS / PREVIEW</span><h1>مساحة العمل</h1></div>
              <div className="preview-meta"><span className="live-dot" /> معاينة متحركة <span className="meta-divider" /> 16:9</div>
            </div>
            <div className="preview-frame">
              {selectedScene && (
                <Player
                  key={selectedScene.id}
                  component={SceneComposition}
                  inputProps={{ scene: selectedScene, sceneIndex: Math.max(0, activeProject.scenes.findIndex((scene) => scene.id === selectedScene.id)), audioSource: previewAudio?.url }}
                  durationInFrames={Math.max(1, Math.round(selectedScene.durationSeconds * activeProject.settings.fps))}
                  compositionWidth={activeProject.settings.width}
                  compositionHeight={activeProject.settings.height}
                  fps={activeProject.settings.fps}
                  controls
                  loop
                  clickToPlay
                  style={{ width: "100%", aspectRatio: `${activeProject.settings.width} / ${activeProject.settings.height}` }}
                  className="remotion-preview"
                />
              )}
              <div className="preview-resolution">{activeProject.settings.width} × {activeProject.settings.height} · {activeProject.settings.fps} FPS</div>
            </div>
            {rendering && (
              <div className="render-progress-row" role="status" aria-live="polite">
                <span>تصيير الفيديو على هذا الجهاز</span>
                <strong>{Math.round(renderProgress * 100)}%</strong>
                <div className="render-progress-track"><i style={{ width: `${Math.round(renderProgress * 100)}%` }} /></div>
              </div>
            )}
            <div className="timeline-panel panel">
              <div className="timeline-header"><div><Icon name="layers" size={16} /><strong>الخط الزمني</strong></div><span>{formatDuration(projectDuration)} إجمالي المدة</span></div>
              <div className="timeline-ruler"><span>00:00</span><span>00:15</span><span>00:30</span><span>00:45</span><span>01:00</span></div>
              <div className="timeline-track">
                {activeProject.scenes.map((scene, index) => (
                  <button
                    key={scene.id}
                    className={`timeline-clip ${selectedScene?.id === scene.id ? "selected" : ""}`}
                    style={{ flexGrow: scene.durationSeconds, background: scene.background }}
                    onClick={() => setSelectedSceneId(scene.id)}
                    title={scene.title}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>{scene.title}
                  </button>
                ))}
              </div>
              <div className="timeline-empty-track"><span className="track-label">التعليق الصوتي</span><div><i /></div></div>
              <div className="timeline-empty-track"><span className="track-label">العناصر البصرية</span><div><i /></div></div>
            </div>
          </section>

          <aside className="properties-panel panel">
            <div className="panel-heading"><div><span className="eyebrow">SCENE SETTINGS</span><h2>خصائص المشهد</h2></div><button className="small-icon-button" aria-label="خيارات المشهد" onClick={() => setToast("خيارات إضافية ستصل لاحقًا")}><Icon name="more" /></button></div>
            {selectedScene && (
              <>
                <label className="field-label">اسم المشهد</label>
                <input className="text-field" value={selectedScene.title} onChange={(event) => updateScene((scene) => ({ ...scene, title: event.target.value }))} />
                <div className="field-row">
                  <div className="field-grow"><label className="field-label">المدة (ثانية)</label><input className="text-field" type="number" min="1" max="300" value={selectedScene.durationSeconds} onChange={(event) => updateScene((scene) => ({ ...scene, durationSeconds: Math.max(1, Math.min(300, Number(event.target.value) || 1)) }))} /></div>
                  <div className="field-grow"><label className="field-label">نوع التخطيط</label><select className="text-field" value={selectedScene.layout} onChange={(event) => updateScene((scene) => ({ ...scene, layout: event.target.value as SceneLayout }))}><option value="title">عنوان</option><option value="split">مقسّم</option><option value="diagram">مخطط</option><option value="timeline">خط زمني</option><option value="stats">إحصاءات</option><option value="quote">اقتباس بارز</option><option value="comparison">مقارنة</option><option value="flow">مراحل متتابعة</option></select></div>
                </div>
                <label className="field-label">لون خلفية المشهد</label>
                <div className="scene-palette" role="group" aria-label="ألوان خلفية المشهد">
                  {[
                    { color: "#151b2a", label: "كحلي" },
                    { color: "#182236", label: "أزرق داكن" },
                    { color: "#201d35", label: "بنفسجي" },
                    { color: "#17302f", label: "أخضر داكن" },
                    { color: "#292235", label: "عنابي" }
                  ].map((swatch) => (
                    <button
                      key={swatch.color}
                      type="button"
                      className={`scene-swatch ${selectedScene.background === swatch.color ? "active" : ""}`}
                      style={{ backgroundColor: swatch.color }}
                      aria-label={swatch.label}
                      aria-pressed={selectedScene.background === swatch.color}
                      title={swatch.label}
                      onClick={() => updateScene((scene) => ({ ...scene, background: swatch.color }))}
                    />
                  ))}
                  <label className="scene-custom-color" title="لون مخصص">
                    <input type="color" value={selectedScene.background} aria-label="اختيار لون مخصص" onChange={(event) => updateScene((scene) => ({ ...scene, background: event.target.value }))} />
                    <span>+</span>
                  </label>
                </div>
                <label className="field-label">عنوان العرض</label>
                <textarea className="text-field text-area compact-area" rows={2} value={firstHeading?.content ?? ""} onChange={(event) => updateScene((scene) => ({ ...scene, blocks: scene.blocks.map((block) => block.kind === "heading" ? { ...block, content: event.target.value } : block) }))} />
                <label className="field-label">النص التوضيحي</label>
                <textarea className="text-field text-area" rows={3} value={firstBody?.content ?? ""} onChange={(event) => updateScene((scene) => ({ ...scene, blocks: scene.blocks.map((block) => block.kind === "body" ? { ...block, content: event.target.value } : block) }))} />
                {selectedScene.layout === "timeline" && (
                  <div className="visual-list-editor">
                    <label className="field-label">مراحل الخط الزمني</label>
                    {[0, 1, 2, 3].map((index) => {
                      const step = selectedScene.blocks.filter((block) => block.kind === "step")[index];
                      return <input key={index} className="text-field" placeholder={`المرحلة ${index + 1}`} value={step?.content ?? ""} onChange={(event) => updateIndexedVisualBlock("step", index, event.target.value)} />;
                    })}
                  </div>
                )}
                {selectedScene.layout === "stats" && (
                  <div className="visual-list-editor">
                    <label className="field-label">القيم الإحصائية (حتى 3)</label>
                    {[0, 1, 2].map((index) => {
                      const metricBlock = selectedScene.blocks.filter((block) => block.kind === "metric")[index];
                      return <input key={index} className="text-field" placeholder={`القيمة ${index + 1} مثال: 42%`} value={metricBlock?.content ?? ""} onChange={(event) => updateIndexedVisualBlock("metric", index, event.target.value)} />;
                    })}
                  </div>
                )}
                {selectedScene.layout === "comparison" && (
                  <div className="visual-list-editor">
                    <label className="field-label">طرفا المقارنة</label>
                    {[0, 1].map((index) => {
                      const item = selectedScene.blocks.filter((block) => block.kind === "step")[index];
                      return <input key={index} className="text-field" placeholder={index === 0 ? "الحالة الأولى" : "الحالة الثانية"} value={item?.content ?? ""} onChange={(event) => updateIndexedVisualBlock("step", index, event.target.value)} />;
                    })}
                  </div>
                )}
                {selectedScene.layout === "flow" && (
                  <div className="visual-list-editor">
                    <label className="field-label">مراحل العملية (حتى 4)</label>
                    {[0, 1, 2, 3].map((index) => {
                      const item = selectedScene.blocks.filter((block) => block.kind === "step")[index];
                      return <input key={index} className="text-field" placeholder={`المرحلة ${index + 1}`} value={item?.content ?? ""} onChange={(event) => updateIndexedVisualBlock("step", index, event.target.value)} />;
                    })}
                  </div>
                )}
                <label className="field-label">التعليق الصوتي</label>
                <textarea className="text-field text-area narration-area" rows={5} value={selectedScene.narration} onChange={(event) => updateScene((scene) => ({ ...scene, narration: event.target.value }))} />
                <div className="audio-asset-editor">
                  <input ref={audioInput} type="file" accept="audio/mpeg,audio/wav" hidden onChange={handleNarrationAudioUpload} />
                  <div className="audio-asset-status">
                    {previewAudio && previewAudio.id === selectedScene.narrationAudioAssetId && isNarrationAudioCurrent(selectedScene)
                      ? <><strong>{previewAudio.name}</strong><span>الصوت مرتبط بالنص الحالي وسيعمل في المعاينة وتصدير MP4.</span></>
                      : selectedScene.narrationAudioAssetId && !isNarrationAudioCurrent(selectedScene)
                        ? <span>النص تغيّر بعد إرفاق الصوت؛ لن يُستخدم الصوت القديم. أعد التوليد أو أرفق تسجيلًا جديدًا.</span>
                        : selectedScene.narrationAudioAssetId
                          ? <span>ملف الصوت مرفق لكن لم يُحمّل بعد.</span>
                          : <span>لم يُرفق ملف صوتي لهذا المشهد بعد.</span>}
                  </div>
                  <div className="tts-generation">
                    <button
                      className="subtle-button tts-generate-button"
                      type="button"
                      onClick={() => void generateNarrationAudio()}
                      disabled={ttsGenerating || !selectedScene.narration.trim()}
                    >
                      {ttsGenerating ? "جارٍ توليد التعليق..." : "توليد صوت عربي محليًا"}
                    </button>
                    {ttsGenerating && (
                      <div className="tts-progress" role="status" aria-live="polite">
                        <div className="tts-progress-copy">
                          <span>{ttsStatus}</span>
                          <strong>{ttsProgress > 0 ? `${ttsProgress}%` : "..."}</strong>
                        </div>
                        <div className="tts-progress-track">
                          <span style={{ width: `${ttsProgress}%` }} />
                        </div>
                        <button className="subtle-button" type="button" onClick={cancelNarrationGeneration}>إلغاء التوليد</button>
                      </div>
                    )}
                    <p>صوت عربي فصيح تجريبي يعمل على الجهاز. التنزيل الأول للنموذج يقارب 16 ميغابايت، ثم يُحفظ في ذاكرة المتصفح. التشكيل يحسّن النطق، ولا تُرسل الجمل إلى خدمة صوتية سحابية.</p>
                  </div>
                  <div className="field-actions">
                    <button className="subtle-button" type="button" onClick={() => audioInput.current?.click()}>إرفاق صوت (WAV / MP3)</button>
                    {selectedScene.narrationAudioAssetId && <button className="subtle-button" type="button" onClick={() => void removeNarrationAudio()}>إزالة الصوت</button>}
                  </div>
                </div>
                <div className="field-actions">
                  <button className="subtle-button" onClick={() => moveScene(-1)} disabled={activeProject.scenes[0]?.id === selectedScene.id}>تحريك للأعلى</button>
                  <button className="subtle-button" onClick={() => moveScene(1)} disabled={activeProject.scenes.at(-1)?.id === selectedScene.id}>للأسفل</button>
                </div>
                <button className="danger-button" onClick={removeScene}><Icon name="trash" size={15} /> حذف المشهد</button>
              </>
            )}
            <div className="panel-note"><Icon name="spark" size={16} /><p>التصدير المحلي التجريبي حتى 720p. أرفق ملف تعليق لكل مشهد لإضافته إلى المعاينة وMP4. لا تُضاف موسيقى.</p></div>
          </aside>
        </div>

        <footer className="editor-footer"><span><i className="status-dot" /> {saving ? "جارٍ الحفظ" : "تم الحفظ"}</span><span>ملف المشروع محلي · تصيير المتصفح يرسل بيانات تشغيل محدودة بعد الموافقة</span><span>{activeProject.settings.width} × {activeProject.settings.height} · {activeProject.settings.fps} FPS</span></footer>
        {showRenderConsent && (
          <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowRenderConsent(false); }}>
            <section className="new-project-modal render-consent-modal" role="dialog" aria-modal="true" aria-labelledby="render-consent-title">
              <button type="button" className="modal-close" onClick={() => setShowRenderConsent(false)} aria-label="إغلاق"><Icon name="close" /></button>
              <div className="modal-symbol"><Icon name="settings" size={23} /></div>
              <span className="eyebrow">PRIVACY NOTICE</span>
              <h2 id="render-consent-title">بيانات تشغيل التصدير</h2>
              <p>يعتمد التصدير المحلي على Remotion Web Renderer. قبل المتابعة، نوضح أن Remotion يرسل بيانات تشغيل محدودة في كل محاولة تصيير.</p>
              <ul className="consent-list">
                <li>عنوان IP ونطاق الموقع الذي يجري منه التصيير.</li>
                <li>نوع العملية، وهل نجحت أم فشلت.</li>
              </ul>
              <p>لا يرسل Remotion محتوى الفيديو أو ملف المشروع أو نصوص المشاهد ضمن هذه البيانات. لا يمكن تعطيل هذا القياس في محرك التصيير المحلي المستخدم هنا.</p>
              <div className="consent-actions">
                <button type="button" className="outline-button" onClick={() => setShowRenderConsent(false)}>ليس الآن</button>
                <button type="button" className="primary-button" onClick={acceptRenderTelemetry}>أوافق وأتابع</button>
              </div>
            </section>
          </div>
        )}
        {toast && <div className="toast-message" role="status">{toast}</div>}
      </main>
    );
  }

  return (
    <main className="app-shell dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><Brand /></div>
        <div className="nav-section-label">مساحة العمل</div>
        <button className="nav-link active"><Icon name="grid" /> نظرة عامة</button>
        <button className="nav-link" onClick={() => setToast("أنت بالفعل في قائمة المشاريع")}><Icon name="folder" /> مشاريعي <span>{projects.length}</span></button>
        <div className="sidebar-bottom">
          <div className="engine-status"><span className="status-halo"><Icon name="spark" size={16} /></span><div><strong>استوديو تجريبي</strong><small>معاينة وتصدير تجريبي</small></div><i /></div>
          <div className="sidebar-legal">ملفاتك محفوظة على جهازك<br />نسخة تطويرية · 0.2</div>
        </div>
      </aside>

      <section className="dashboard-content">
        <header className="dashboard-topbar">
          <div className="breadcrumb"><span>مساحة العمل</span><Icon name="chevron" size={14} /><strong>نظرة عامة</strong></div>
          <div className="topbar-right"><span className="avatar-chip">ES</span><span>استوديو شخصي</span></div>
        </header>

        <div className="dashboard-inner">
          <section className="welcome-section">
            <div className="welcome-copy"><span className="eyebrow">YOUR STORY, VISUALLY</span><h1>حوّل الأفكار إلى <em>قصص تُرى.</em></h1><p>مساحة إنتاج متخصصة لصناعة فيديوهات تفسيرية، من الفكرة إلى المشهد.</p></div>
            <div className="welcome-art" aria-hidden="true"><div className="art-orbit" /><div className="art-ring ring-a" /><div className="art-ring ring-b" /><div className="art-core"><span /><span /><span /></div><i className="art-spark spark-a" /><i className="art-spark spark-b" /></div>
            <div className="welcome-actions"><button className="primary-button" onClick={() => setShowNewProject(true)}><Icon name="plus" size={17} /> إنشاء مشروع</button><button className="outline-button" onClick={() => importInput.current?.click()}><Icon name="upload" size={16} /> استيراد مشروع</button><input ref={importInput} type="file" accept="application/json,.json" hidden onChange={importProject} /></div>
          </section>

          <section className="stats-grid">
            <div className="stat-card"><div className="stat-icon violet"><Icon name="film" /></div><div><span>إجمالي المشاريع</span><strong>{projects.length.toLocaleString("ar")}</strong></div><small>على هذا الجهاز</small></div>
            <div className="stat-card"><div className="stat-icon mint"><Icon name="layers" /></div><div><span>المشاهد المحفوظة</span><strong>{projects.reduce((sum, project) => sum + project.scenes.length, 0).toLocaleString("ar")}</strong></div><small>ضمن مشاريعك</small></div>
            <div className="stat-card"><div className="stat-icon amber"><Icon name="clock" /></div><div><span>إجمالي المدة</span><strong>{formatDuration(totalDuration)}</strong></div><small>مدة المشاهد المضافة</small></div>
          </section>

          <section className="projects-section">
            <div className="section-heading"><div><span className="eyebrow">YOUR WORKSPACE</span><h2>مشاريعك</h2><p>تابع العمل من آخر نقطة وصلت إليها.</p></div><button className="text-action" onClick={() => setShowNewProject(true)}>مشروع جديد <Icon name="arrow" size={15} /></button></div>

            {loading ? (
              <div className="empty-state"><div className="loading-spinner" /><strong>جارٍ تجهيز مساحة العمل</strong><span>نستعيد مشاريعك المحفوظة على الجهاز.</span></div>
            ) : projects.length === 0 ? (
              <div className="empty-state">
                <div className="empty-art"><div /><div /><div /></div>
                <strong>هذه المساحة جاهزة لفكرتك الأولى</strong>
                <span>أنشئ مشروعًا، أضف المشاهد، وابدأ بتشكيل قصتك التفسيرية.</span>
                <button className="primary-button" onClick={() => setShowNewProject(true)}><Icon name="plus" size={16} /> إنشاء أول مشروع</button>
              </div>
            ) : (
              <div className="project-grid">
                {projects.map((project, index) => {
                  const summary = summarizeProject(project);
                  return (
                    <article className="project-card" key={project.id}>
                      <button className="project-open" onClick={() => openProject(project)}>
                        <div className={`project-cover cover-${index % 3}`}>
                          <div className="cover-grid" /><div className="cover-orbit" /><div className="cover-shape shape-a" /><div className="cover-shape shape-b" />
                          <span className="cover-format">16:9 · HD</span>
                          <span className="cover-count">{summary.sceneCount.toLocaleString("ar")} مشاهد</span>
                        </div>
                        <div className="project-card-info"><strong>{project.title}</strong><span>{project.description || "لا يوجد وصف بعد"}</span><div className="project-card-meta"><small><Icon name="clock" size={13} /> {formatDuration(summary.durationSeconds)}</small><small>{formatRelativeDate(project.updatedAt)}</small></div></div>
                      </button>
                      <button className="project-delete" onClick={() => removeProject(project)} aria-label={`حذف ${project.title}`}><Icon name="more" size={18} /></button>
                    </article>
                  );
                })}
                <button className="new-project-card" onClick={() => setShowNewProject(true)}><span><Icon name="plus" size={22} /></span><strong>مشروع جديد</strong><small>ابدأ مساحة عمل جديدة</small></button>
              </div>
            )}
          </section>

          <section className="workflow-strip">
            <div className="workflow-title"><span className="eyebrow">PRODUCTION FLOW</span><strong>من الفكرة إلى الفيديو</strong></div>
            <div className="workflow-steps"><div className="workflow-step done"><span>01</span><strong>الفكرة والبحث</strong><small>تجهيز المحتوى</small></div><i /><div className="workflow-step current"><span>02</span><strong>المشاهد والتصميم</strong><small>قيد التأسيس</small></div><i /><div className="workflow-step"><span>03</span><strong>التعليق والتحريك</strong><small>لاحقًا</small></div><i /><div className="workflow-step"><span>04</span><strong>التصدير والجودة</strong><small>لاحقًا</small></div></div>
          </section>
        </div>
        <footer className="dashboard-footer"><span>EXPLAINER STUDIO <b>0.2</b></span><span>نسخة تأسيسية · الحفظ محلي · لا يوجد رفع تلقائي للملفات</span></footer>
      </section>

      {showNewProject && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowNewProject(false); }}>
          <form className="new-project-modal" onSubmit={(event) => { event.preventDefault(); void createProject(); }}>
            <button type="button" className="modal-close" onClick={() => setShowNewProject(false)} aria-label="إغلاق"><Icon name="close" /></button>
            <div className="modal-symbol"><Icon name="film" size={23} /></div>
            <span className="eyebrow">NEW PROJECT</span>
            <h2>لنبدأ قصة جديدة.</h2>
            <p>أنشئ مساحة عمل، ثم سنبني المشاهد والتصميم خطوة بخطوة.</p>
            <label className="field-label" htmlFor="project-title">اسم المشروع</label>
            <input id="project-title" autoFocus className="text-field modal-input" value={newProjectTitle} onChange={(event) => setNewProjectTitle(event.target.value)} maxLength={80} placeholder="مثال: كيف تعمل الطاقة الشمسية؟" />
            <div className="modal-format"><span><Icon name="film" size={16} /> فيديو أفقي</span><strong>16:9</strong><span className="modal-format-divider" /><span>1920 × 1080</span><span>30 FPS</span></div>
            <button className="primary-button modal-submit" type="submit"><Icon name="plus" size={17} /> إنشاء المشروع <Icon name="arrow" size={16} /></button>
          </form>
        </div>
      )}

      {toast && <div className="toast-message" role="status">{toast}</div>}
    </main>
  );
}
