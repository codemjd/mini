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
import { listProjects } from "./core/project-store";
import { executeStudioCommand } from "./core/studio-commands";
import { validateStudioProject } from "./core/project-validation";
import { disposeArabicNarrationEngine, generateArabicNarration, type ArabicTtsProgress } from "./core/arabic-tts";
import {
  decodeBase64Audio,
  deleteAudioAsset,
  encodeBlobToBase64,
  getAudioAsset,
  getAudioDurationSeconds,
  MAX_NARRATION_AUDIO_BYTES,
  saveAudioAsset
} from "./core/audio-asset-store";

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
  const activeProjectRef = useRef<StudioProject | null>(null);
  activeProjectRef.current = activeProject;
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
  const importInput = useRef<HTMLInputElement>(null);
  const narrationAudioInput = useRef<HTMLInputElement>(null);
  const [narrationAudioSrc, setNarrationAudioSrc] = useState<string | undefined>(undefined);
  const [ttsGenerating, setTtsGenerating] = useState(false);
  const [ttsProgress, setTtsProgress] = useState(0);
  const [ttsMessage, setTtsMessage] = useState("");
  const renderAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const disposeOnPageHide = () => { void disposeArabicNarrationEngine(); };
    window.addEventListener("pagehide", disposeOnPageHide);
    return () => window.removeEventListener("pagehide", disposeOnPageHide);
  }, []);

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
    const assetId = selectedScene?.narrationAudioAssetId;
    let cancelled = false;
    let objectUrl: string | undefined;
    setNarrationAudioSrc(undefined);

    if (!assetId || selectedScene?.narrationAudioText !== selectedScene?.narration) return undefined;

    void getAudioAsset(assetId)
      .then((asset) => {
        if (!asset) throw new Error("ملف التعليق الصوتي غير موجود في التخزين المحلي.");
        objectUrl = URL.createObjectURL(asset.blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setNarrationAudioSrc(objectUrl);
      })
      .catch((error: unknown) => {
        if (!cancelled) setToast(error instanceof Error ? error.message : "تعذر تحميل ملف التعليق الصوتي.");
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selectedScene?.narrationAudioAssetId, selectedScene?.narrationAudioText, selectedScene?.narration]);

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
    setProjects((current) => current.filter((item) => item.id !== project.id));
    if (activeProject?.id === project.id) {
      setActiveProject(null);
      setView("dashboard");
    }
    setToast("تم حذف المشروع من هذا الجهاز");
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
    setToast("تم حذف المشهد");
  }

  async function exportProject() {
    if (!activeProject) return;
    try {
      const referencedIds = [...new Set(activeProject.scenes
        .map((scene) => scene.narrationAudioAssetId)
        .filter((id): id is string => Boolean(id)))];

      let totalAudioBytes = 0;
      const audioAssets = await Promise.all(referencedIds.map(async (id) => {
        const asset = await getAudioAsset(id);
        if (!asset || asset.projectId !== activeProject.id) {
          throw new Error("تعذر العثور على أحد ملفات الصوت. أعد إرفاقه قبل تصدير الحزمة.");
        }
        totalAudioBytes += asset.blob.size;
        if (totalAudioBytes > 50 * 1024 * 1024) {
          throw new Error("إجمالي ملفات الصوت يتجاوز الحد المدعوم للحزمة وهو 50 ميغابايت.");
        }
        return {
          id: asset.id,
          projectId: asset.projectId,
          sceneId: asset.sceneId,
          fileName: asset.fileName,
          mimeType: asset.mimeType,
          size: asset.size,
          createdAt: asset.createdAt,
          dataBase64: await encodeBlobToBase64(asset.blob)
        };
      }));

      const bundle = {
        format: "explainer-studio-project",
        version: 1,
        project: activeProject,
        audioAssets
      };
      const blob = new Blob([JSON.stringify(bundle)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const unsafeFileNameCharacters = new Set(["/", "\\", ":", "*", "?", '"' , "<", ">", "|"]);
      const safeFileName = Array.from(activeProject.title.trim())
        .map((character) => unsafeFileNameCharacters.has(character) ? "-" : character)
        .join("")
        .replaceAll(" ", "-")
        .slice(0, 64) || "explainer-project";
      anchor.download = safeFileName + "-bundle.json";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
      setToast("تم تصدير المشروع مع ملفات التعليق الصوتي");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "تعذر تصدير حزمة المشروع");
    }
  }

  async function importProject(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const isBundle = typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        && "format" in parsed && parsed.format === "explainer-studio-project";
      const projectInput = isBundle ? (parsed as { project?: unknown }).project : parsed;
      const validation = validateStudioProject(projectInput);
      if (!validation.valid) {
        const firstIssues = validation.issues.slice(0, 3).map((item) => item.message).join(" ");
        throw new Error(firstIssues || "ملف المشروع لا يطابق الصيغة المدعومة.");
      }

      const project = validation.project;
      const referencedIds = new Set(project.scenes
        .map((scene) => scene.narrationAudioAssetId)
        .filter((id): id is string => Boolean(id)));

      if (!isBundle && referencedIds.size > 0) {
        throw new Error("ملف JSON القديم لا يحتوي على ملفات الصوت. صدّر المشروع كحزمة من الجهاز الأصلي.");
      }

      if (isBundle) {
        const bundle = parsed as { version?: unknown; audioAssets?: unknown };
        if (bundle.version !== 1 || !Array.isArray(bundle.audioAssets)) {
          throw new Error("إصدار حزمة المشروع غير صالح أو لا يحتوي قائمة ملفات الصوت.");
        }

        let totalAudioBytes = 0;
        const importedAssets = bundle.audioAssets.map((entry): {
          id: string;
          projectId: string;
          sceneId: string;
          fileName: string;
          mimeType: string;
          size: number;
          createdAt: string;
          blob: Blob;
        } => {
          if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
            throw new Error("بيانات أحد ملفات الصوت في الحزمة غير صالحة.");
          }
          const asset = entry as Record<string, unknown>;
          const requiredStrings = ["id", "projectId", "sceneId", "fileName", "mimeType", "createdAt", "dataBase64"];
          if (requiredStrings.some((key) => typeof asset[key] !== "string")) {
            throw new Error("بيانات أحد ملفات الصوت ناقصة.");
          }
          const id = asset.id as string;
          const sceneId = asset.sceneId as string;
          if (!referencedIds.has(id) || !project.scenes.some((scene) => scene.id === sceneId && scene.narrationAudioAssetId === id)) {
            throw new Error("ملف صوت في الحزمة غير مرتبط بمشهد معروف.");
          }
          if (asset.projectId !== project.id) throw new Error("ملفات الصوت لا تطابق معرّف المشروع.");
          const mimeType = asset.mimeType as string;
          const blob = decodeBase64Audio(asset.dataBase64 as string, mimeType);
          if (typeof asset.size === "number" && asset.size !== blob.size) {
            throw new Error("حجم أحد ملفات الصوت لا يطابق بياناته داخل الحزمة.");
          }
          totalAudioBytes += blob.size;
          if (totalAudioBytes > 50 * 1024 * 1024) {
            throw new Error("إجمالي ملفات الصوت في الحزمة يتجاوز الحد المدعوم البالغ 50 ميغابايت.");
          }
          return {
            id,
            projectId: project.id,
            sceneId,
            fileName: asset.fileName as string,
            mimeType,
            size: blob.size,
            createdAt: asset.createdAt as string,
            blob
          };
        });

        const importedIds = new Set(importedAssets.map((asset) => asset.id));
        if ([...referencedIds].some((id) => !importedIds.has(id))) {
          throw new Error("الحزمة لا تحتوي كل ملفات التعليق الصوتي المرتبطة بالمشاهد.");
        }
        for (const asset of importedAssets) await saveAudioAsset(asset);
      }

      project.updatedAt = new Date().toISOString();
      const saved = await executeStudioCommand({ type: "project.save", project });
      if (!saved.ok) throw new Error(saved.error);
      setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)]);
      await openProject(project);
      setToast(isBundle ? "تم استيراد المشروع وملفات التعليق الصوتي" : "تم استيراد المشروع");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "تعذر استيراد الملف");
    } finally {
      event.target.value = "";
    }
  }

  async function generateSceneNarration() {
    if (!activeProject || !selectedScene || ttsGenerating) return;
    const projectId = activeProject.id;
    const sceneId = selectedScene.id;
    const narrationText = selectedScene.narration.trim();
    if (!narrationText) {
      setToast("اكتب نص التعليق أولًا قبل توليد الصوت.");
      return;
    }

    setTtsGenerating(true);
    setTtsProgress(0);
    setTtsMessage("تهيئة محرك الصوت العربي...");
    try {
      const result = await generateArabicNarration(narrationText, (progress: ArabicTtsProgress) => {
        if (progress.phase === "downloading") {
          const fraction = progress.totalBytes && progress.totalBytes > 0
            ? Math.min(1, (progress.loadedBytes ?? 0) / progress.totalBytes)
            : 0;
          setTtsProgress(Math.round(fraction * 65));
          setTtsMessage(progress.totalBytes
            ? "تحميل نموذج الصوت العربي " + Math.round(fraction * 100) + "%"
            : "تحميل نموذج الصوت العربي...");
        } else {
          const fraction = progress.totalChunks
            ? Math.min(1, (progress.completedChunks ?? 0) / progress.totalChunks)
            : 0;
          setTtsProgress(65 + Math.round(fraction * 35));
          setTtsMessage("توليد الجمل " + (progress.completedChunks ?? 0) + " من " + (progress.totalChunks ?? 0));
        }
      });

      if (result.audio.size > MAX_NARRATION_AUDIO_BYTES) {
        throw new Error("الصوت الناتج تجاوز 25 ميغابايت. قسّم نص التعليق إلى مقاطع أقصر.");
      }

      const latestProject = activeProjectRef.current;
      const latestScene = latestProject?.id === projectId
        ? latestProject.scenes.find((item) => item.id === sceneId)
        : undefined;
      if (!latestScene || latestScene.narration.trim() !== narrationText) {
        throw new Error("تغيّر المشروع أو نص المشهد أثناء التوليد؛ لم نربط الصوت بمحتوى مختلف.");
      }

      const assetId = createId();
      await saveAudioAsset({
        id: assetId,
        projectId,
        sceneId,
        fileName: "nabra-arabic-narration.wav",
        mimeType: "audio/wav",
        size: result.audio.size,
        createdAt: new Date().toISOString(),
        blob: result.audio
      });

      const latestAtCommit = activeProjectRef.current;
      const sceneAtCommit = latestAtCommit?.id === projectId
        ? latestAtCommit.scenes.find((item) => item.id === sceneId)
        : undefined;
      if (!sceneAtCommit || sceneAtCommit.narration.trim() !== narrationText) {
        await deleteAudioAsset(assetId);
        throw new Error("تغيّر المشهد أثناء حفظ الصوت؛ أعد التوليد بعد تثبيت النص.");
      }

      const previousAssetId = sceneAtCommit.narrationAudioAssetId;
      const fittedDuration = Math.max(sceneAtCommit.durationSeconds, Math.ceil(result.durationSeconds + 0.25));
      setActiveProject((current) => {
        const currentScene = current?.id === projectId
          ? current.scenes.find((item) => item.id === sceneId)
          : undefined;
        if (!current || !currentScene || currentScene.narration.trim() !== narrationText) {
          void deleteAudioAsset(assetId).catch(() => undefined);
          return current;
        }
        return {
          ...current,
          updatedAt: new Date().toISOString(),
          scenes: current.scenes.map((item) => item.id === sceneId
            ? {
                ...item,
                narrationAudioAssetId: assetId,
                narrationAudioText: narrationText,
                durationSeconds: fittedDuration
              }
            : item)
        };
      });

      if (previousAssetId) void deleteAudioAsset(previousAssetId).catch(() => undefined);
      setTtsProgress(100);
      setTtsMessage("اكتمل توليد الصوت");
      setToast("تم توليد التعليق العربي محليًا عبر " + (result.device === "webgpu" ? "WebGPU" : "WASM") + " وحفظه للمشهد");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "تعذر توليد التعليق الصوتي.");
      setTtsMessage("");
    } finally {
      setTtsGenerating(false);
    }
  }

  async function attachNarrationAudio(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !activeProject || !selectedScene) return;
    const projectId = activeProject.id;
    const sceneId = selectedScene.id;

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      const fallbackMime: Record<string, string> = {
        mp3: "audio/mpeg",
        wav: "audio/wav",
        m4a: "audio/mp4",
        aac: "audio/aac",
        webm: "audio/webm"
      };
      const mimeType = fallbackMime[extension];
      if (!mimeType) {
        throw new Error("اختر ملفًا صوتيًا بصيغة MP3 أو WAV أو M4A أو AAC أو WebM.");
      }
      if (file.size === 0 || file.size > MAX_NARRATION_AUDIO_BYTES) {
        throw new Error("حجم ملف التعليق الصوتي يجب أن يكون أقل من 25 ميغابايت.");
      }

      const durationSeconds = await getAudioDurationSeconds(file);
      if (!durationSeconds) {
        throw new Error("لم يستطع المتصفح قراءة مدة الملف الصوتي. جرّب MP3 أو WAV.");
      }

      const latestProject = activeProjectRef.current;
      const latestScene = latestProject?.id === projectId
        ? latestProject.scenes.find((scene) => scene.id === sceneId)
        : undefined;
      if (!latestScene) {
        throw new Error("المشروع أو المشهد تغيّر أثناء قراءة ملف الصوت. أعد المحاولة.");
      }

      const assetId = createId();
      await saveAudioAsset({
        id: assetId,
        projectId,
        sceneId,
        fileName: file.name,
        mimeType,
        size: file.size,
        createdAt: new Date().toISOString(),
        blob: file
      });

      const sceneAtCommit = activeProjectRef.current?.id === projectId
        ? activeProjectRef.current.scenes.find((scene) => scene.id === sceneId)
        : undefined;
      if (!sceneAtCommit) {
        await deleteAudioAsset(assetId);
        throw new Error("لم يعد المشهد موجودًا؛ لم نربط به ملف صوت.");
      }

      setActiveProject((current) => {
        if (!current || current.id !== projectId || !current.scenes.some((scene) => scene.id === sceneId)) {
          void deleteAudioAsset(assetId).catch(() => undefined);
          return current;
        }
        return {
          ...current,
          updatedAt: new Date().toISOString(),
          scenes: current.scenes.map((scene) => scene.id === sceneId
            ? {
                ...scene,
                narrationAudioAssetId: assetId,
                narrationAudioText: scene.narration,
                durationSeconds: Math.max(scene.durationSeconds, Math.ceil(durationSeconds + 0.25))
              }
            : scene)
        };
      });

      setToast("تم ربط التعليق الصوتي بالمشهد وحفظه محليًا");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "تعذر إرفاق ملف الصوت");
    } finally {
      event.target.value = "";
    }
  }

  function removeNarrationAudio() {
    if (!selectedScene?.narrationAudioAssetId) return;
    const assetId = selectedScene.narrationAudioAssetId;
    updateScene((scene) => ({ ...scene, narrationAudioAssetId: undefined, narrationAudioText: undefined }));
    void deleteAudioAsset(assetId).catch((error: unknown) => {
      setToast(error instanceof Error ? error.message : "تعذر حذف ملف الصوت المحلي");
    });
    setToast("تمت إزالة التعليق الصوتي من المشهد");
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
                  inputProps={{ scene: selectedScene, sceneIndex: Math.max(0, activeProject.scenes.findIndex((scene) => scene.id === selectedScene.id)), narrationAudioSrc }}
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
              <div className="timeline-empty-track">
                <span className="track-label">التعليق الصوتي</span>
                <div className="narration-track">
                  {activeProject.scenes.map((scene) => (
                    <span
                      key={scene.id}
                      className={`narration-segment ${!scene.narrationAudioAssetId ? "no-audio" : scene.narrationAudioText === scene.narration ? "has-audio" : "stale-audio"}`}
                      style={{ flexGrow: scene.durationSeconds }}
                      title={scene.title + (scene.narrationAudioAssetId ? " — صوت مرفق" : " — بلا صوت")}
                    />
                  ))}
                </div>
              </div>
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
                <label className="field-label">نص التعليق الصوتي</label>
                <textarea className="text-field text-area narration-area" rows={5} value={selectedScene.narration} disabled={ttsGenerating} onChange={(event) => updateScene((scene) => ({ ...scene, narration: event.target.value }))} />
                <label className="field-label">ملف التعليق الصوتي للمشهد</label>
                <div className="field-actions narration-actions">
                  <button type="button" className="primary-button small" onClick={() => void generateSceneNarration()} disabled={ttsGenerating || !selectedScene.narration.trim()}>
                    <Icon name="spark" size={15} /> {ttsGenerating ? "جارٍ التوليد..." : "توليد صوت عربي"}
                  </button>
                  <button type="button" className="subtle-button" onClick={() => narrationAudioInput.current?.click()} disabled={ttsGenerating}>
                    <Icon name="upload" size={15} /> {selectedScene.narrationAudioAssetId ? "استبدال ملف الصوت" : "رفع صوت"}
                  </button>
                </div>
                {selectedScene.narrationAudioAssetId && (
                  <div className="field-actions">
                    <button type="button" className="subtle-button" onClick={removeNarrationAudio} disabled={ttsGenerating}>إزالة الصوت</button>
                    <span className="audio-state-label">{selectedScene.narrationAudioText === selectedScene.narration ? "الصوت مطابق للنص" : "النص تغيّر — أعد التوليد"}</span>
                  </div>
                )}
                <input ref={narrationAudioInput} type="file" accept="audio/mpeg,audio/wav,audio/mp4,audio/aac,audio/webm,.mp3,.wav,.m4a,.aac,.webm" hidden onChange={attachNarrationAudio} />
                {ttsGenerating ? (
                  <div className="tts-progress" role="status" aria-live="polite">
                    <div><span>{ttsMessage}</span><strong>{ttsProgress}%</strong></div>
                    <span className="tts-progress-track"><i style={{ width: ttsProgress + "%" }} /></span>
                  </div>
                ) : (
                  <p className="panel-help">
                    توليد محلي بالعربية عبر Nabra، يُحمّل النموذج عند أول طلب فقط (نحو 16 ميغابايت للأوزان FP16 إضافة إلى بيئة التشغيل). يعمل دون API مدفوع، ويُخزّن الصوت على الجهاز. يمكن أيضًا رفع MP3 أو WAV أو M4A أو AAC أو WebM حتى 25 ميغابايت. لا موسيقى.
                  </p>
                )}
                <div className="field-actions">
                  <button className="subtle-button" onClick={() => moveScene(-1)} disabled={activeProject.scenes[0]?.id === selectedScene.id}>تحريك للأعلى</button>
                  <button className="subtle-button" onClick={() => moveScene(1)} disabled={activeProject.scenes.at(-1)?.id === selectedScene.id}>للأسفل</button>
                </div>
                <button className="danger-button" onClick={removeScene}><Icon name="trash" size={15} /> حذف المشهد</button>
              </>
            )}
            <div className="panel-note"><Icon name="spark" size={16} /><p>التصدير المحلي التجريبي حتى 720p، ويدمج ملفات التعليق الصوتي المرفقة. لا توجد موسيقى.</p></div>
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
