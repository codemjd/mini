import {
  createId,
  createStarterProject,
  type Scene,
  type StudioProject
} from "../types/project";
import { deleteAudioAsset, deleteProject, listProjects, loadProject, saveProject } from "./project-store";
import { validateStudioProject } from "./project-validation";

type ScenePatch = Partial<Pick<Scene, "title" | "narration" | "narrationAudioAssetId" | "narrationAudioText" | "narrationAudioDurationSeconds" | "durationSeconds" | "layout" | "background" | "blocks">>;
type ProjectPatch = Partial<Pick<StudioProject, "title" | "description">> & { settings?: Partial<StudioProject["settings"]> };

export type StudioCommand =
  | { type: "project.list" }
  | { type: "project.create"; title: string }
  | { type: "project.open"; projectId: string }
  | { type: "project.export"; projectId: string }
  | { type: "project.save"; project: unknown }
  | { type: "project.update"; projectId: string; patch: ProjectPatch }
  | { type: "project.replaceScenes"; projectId: string; scenes: Scene[] }
  | { type: "project.delete"; projectId: string }
  | { type: "project.validate"; project: unknown }
  | { type: "scene.add"; projectId: string; title?: string }
  | { type: "scene.update"; projectId: string; sceneId: string; patch: ScenePatch }
  | { type: "scene.remove"; projectId: string; sceneId: string }
  | { type: "scene.reorder"; projectId: string; sceneId: string; toIndex: number };

export type StudioCommandResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string; details?: unknown };

function makeScene(title: string): Scene {
  return {
    id: createId(),
    title,
    narration: "اكتب نص التعليق الصوتي لهذا المشهد.",
    durationSeconds: 8,
    layout: "diagram",
    background: "#182236",
    blocks: [
      { id: createId(), kind: "heading", content: "عنوان المشهد" },
      { id: createId(), kind: "body", content: "أضف شرحًا بصريًا موجزًا" }
    ]
  };
}

async function persistValidated(project: StudioProject): Promise<StudioCommandResult> {
  const validation = validateStudioProject(project);
  if (!validation.valid) return { ok: false, error: "بيانات المشروع لا تجتاز التحقق.", details: validation.issues };
  await saveProject(project);
  return { ok: true, data: validation.project };
}

/**
 * Typed local command boundary shared by UI workflows and future AI automation.
 * It intentionally performs no network requests and never sends project data to a server.
 */
async function executeStudioCommandInternal(command: StudioCommand): Promise<StudioCommandResult> {
  try {
    switch (command.type) {
      case "project.list":
        return { ok: true, data: await listProjects() };

      case "project.create": {
        const project = createStarterProject(command.title.trim() || "مشروع جديد");
        return persistValidated(project);
      }

      case "project.export": {
        const project = await loadProject(command.projectId);
        if (!project) return { ok: false, error: "المشروع غير موجود." };
        const validation = validateStudioProject(project);
        if (!validation.valid) return { ok: false, error: "تعذر تصدير مشروع غير صالح.", details: validation.issues };
        return {
          ok: true,
          data: {
            fileName: `${project.title.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "explainer-project"}.json`,
            mimeType: "application/json",
            json: JSON.stringify(validation.project, null, 2)
          }
        };
      }

      case "project.open": {
        const project = await loadProject(command.projectId);
        if (!project) return { ok: false, error: "لم يتم العثور على المشروع على هذا الجهاز." };
        const validation = validateStudioProject(project);
        if (!validation.valid) {
          return { ok: false, error: "تعذر فتح مشروع لا يجتاز التحقق.", details: validation.issues };
        }
        // Normalize older schema-v1 projects to the enforced safe content policy.
        if (!project.contentPolicy) await saveProject(validation.project);
        return { ok: true, data: validation.project };
      }

      case "project.save":
        if (typeof command.project !== "object" || command.project === null) {
          return { ok: false, error: "بيانات المشروع غير صالحة." };
        }
        return persistValidated(command.project as StudioProject);

      case "project.update": {
        const project = await loadProject(command.projectId);
        if (!project) return { ok: false, error: "المشروع غير موجود." };
        const next = {
          ...project,
          ...command.patch,
          settings: { ...project.settings, ...command.patch.settings },
          updatedAt: new Date().toISOString()
        };
        return persistValidated(next);
      }

      case "project.replaceScenes": {
        const project = await loadProject(command.projectId);
        if (!project) return { ok: false, error: "المشروع غير موجود." };
        if (!Array.isArray(command.scenes) || command.scenes.length < 1 || command.scenes.length > 200) {
          return { ok: false, error: "قائمة المشاهد يجب أن تحتوي على 1 إلى 200 مشهد." };
        }
        const next = { ...project, scenes: command.scenes, updatedAt: new Date().toISOString() };
        return persistValidated(next);
      }

      case "project.validate": {
        const result = validateStudioProject(command.project);
        return result.valid
          ? { ok: true, data: { valid: true, project: result.project, issues: [] } }
          : { ok: false, error: "فشل التحقق من المشروع.", details: result.issues };
      }

      case "project.delete":
        await deleteProject(command.projectId);
        return { ok: true, data: { deleted: command.projectId } };

      case "scene.add": {
        const project = await loadProject(command.projectId);
        if (!project) return { ok: false, error: "المشروع غير موجود." };
        if (project.scenes.length >= 200) return { ok: false, error: "بلغ المشروع الحد الأقصى للمشاهد." };
        const scene = makeScene(command.title?.trim() || `مشهد ${project.scenes.length + 1}`);
        const next = { ...project, scenes: [...project.scenes, scene], updatedAt: new Date().toISOString() };
        const saved = await persistValidated(next);
        return saved.ok ? { ok: true, data: { project: next, scene } } : saved;
      }

      case "scene.update": {
        const project = await loadProject(command.projectId);
        if (!project) return { ok: false, error: "المشروع غير موجود." };
        if (!project.scenes.some((scene) => scene.id === command.sceneId)) return { ok: false, error: "المشهد غير موجود." };
        const next = {
          ...project,
          updatedAt: new Date().toISOString(),
          scenes: project.scenes.map((scene) => scene.id === command.sceneId ? { ...scene, ...command.patch } : scene)
        };
        return persistValidated(next);
      }

      case "scene.remove": {
        const project = await loadProject(command.projectId);
        if (!project) return { ok: false, error: "المشروع غير موجود." };
        if (project.scenes.length <= 1) return { ok: false, error: "يجب أن يحتوي المشروع على مشهد واحد على الأقل." };
        if (!project.scenes.some((scene) => scene.id === command.sceneId)) return { ok: false, error: "المشهد غير موجود." };
        const removedScene = project.scenes.find((scene) => scene.id === command.sceneId);
        const next = { ...project, scenes: project.scenes.filter((scene) => scene.id !== command.sceneId), updatedAt: new Date().toISOString() };
        const saved = await persistValidated(next);
        if (saved.ok && removedScene?.narrationAudioAssetId) {
          try { await deleteAudioAsset(removedScene.narrationAudioAssetId); } catch { /* keep the project edit even if stale media cleanup fails */ }
        }
        return saved;
      }

      case "scene.reorder": {
        const project = await loadProject(command.projectId);
        if (!project) return { ok: false, error: "المشروع غير موجود." };
        const fromIndex = project.scenes.findIndex((scene) => scene.id === command.sceneId);
        if (fromIndex < 0) return { ok: false, error: "المشهد غير موجود." };
        if (!Number.isInteger(command.toIndex) || command.toIndex < 0 || command.toIndex >= project.scenes.length) {
          return { ok: false, error: "موضع المشهد المطلوب خارج النطاق." };
        }
        const scenes = [...project.scenes];
        const [scene] = scenes.splice(fromIndex, 1);
        scenes.splice(command.toIndex, 0, scene);
        const next = { ...project, scenes, updatedAt: new Date().toISOString() };
        return persistValidated(next);
      }

      default: {
        const exhaustive: never = command;
        return { ok: false, error: `أمر غير مدعوم: ${String(exhaustive)}` };
      }
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "حدث خطأ غير متوقع أثناء تنفيذ الأمر." };
  }
}


/**
 * Serialize mutations so two agent/UI commands cannot overwrite one another
 * after reading the same stale project snapshot.
 */
let commandQueue: Promise<void> = Promise.resolve();

export function executeStudioCommand(command: StudioCommand): Promise<StudioCommandResult> {
  const task = commandQueue.then(
    () => executeStudioCommandInternal(command),
    () => executeStudioCommandInternal(command)
  );
  commandQueue = task.then(() => undefined, () => undefined);
  return task;
}
