import type { StudioProject } from "../types/project";
import { openStudioDatabase, PROJECT_STORE_NAME } from "./database";

const DB_NAME = "explainer-studio";
const DB_VERSION = 2;
const STORE_NAME = "projects";
const AUDIO_STORE_NAME = "audio-assets";
const FALLBACK_KEY = "explainer-studio.projects.v1";

function readFallbackProjects(): StudioProject[] {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StudioProject[]) : [];
  } catch {
    return [];
  }
}

function writeFallbackProjects(projects: StudioProject[]): void {
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(projects));
}

export interface AudioAssetRecord {
  id: string;
  projectId: string;
  sceneId: string;
  name: string;
  mimeType: string;
  size: number;
  blob: Blob;
  createdAt: string;
}

export async function saveAudioAsset(asset: AudioAssetRecord): Promise<void> {
  const database = await openStudioDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(AUDIO_STORE_NAME, "readwrite");
      transaction.objectStore(AUDIO_STORE_NAME).put(asset);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("تعذر حفظ ملف الصوت."));
      transaction.onabort = () => reject(transaction.error ?? new Error("تم إلغاء حفظ ملف الصوت."));
    });
  } finally {
    database.close();
  }
}

export async function loadAudioAsset(id: string): Promise<AudioAssetRecord | null> {
  const database = await openStudioDatabase();
  try {
    return await new Promise<AudioAssetRecord | null>((resolve, reject) => {
      const request = database.transaction(AUDIO_STORE_NAME, "readonly").objectStore(AUDIO_STORE_NAME).get(id);
      request.onsuccess = () => resolve((request.result as AudioAssetRecord | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error("تعذر قراءة ملف الصوت."));
    });
  } finally {
    database.close();
  }
}

export async function deleteAudioAsset(id: string): Promise<void> {
  const database = await openStudioDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(AUDIO_STORE_NAME, "readwrite");
      transaction.objectStore(AUDIO_STORE_NAME).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("تعذر حذف ملف الصوت."));
    });
  } finally {
    database.close();
  }
}
export async function listProjects(): Promise<StudioProject[]> {
  try {
    const database = await openStudioDatabase();
    const projects = await new Promise<StudioProject[]>((resolve, reject) => {
      const request = database.transaction(PROJECT_STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .getAll();
      request.onsuccess = () => resolve(request.result as StudioProject[]);
      request.onerror = () => reject(request.error ?? new Error("Could not read projects."));
    });
    database.close();
    return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return readFallbackProjects().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
}

export async function loadProject(id: string): Promise<StudioProject | null> {
  try {
    const database = await openStudioDatabase();
    const project = await new Promise<StudioProject | undefined>((resolve, reject) => {
      const request = database.transaction(PROJECT_STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .get(id);
      request.onsuccess = () => resolve(request.result as StudioProject | undefined);
      request.onerror = () => reject(request.error ?? new Error("Could not load project."));
    });
    database.close();
    return project ?? null;
  } catch {
    return readFallbackProjects().find((project) => project.id === id) ?? null;
  }
}

export async function saveProject(project: StudioProject): Promise<void> {
  try {
    const database = await openStudioDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(PROJECT_STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(project);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not save project."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Project save was cancelled."));
    });
    database.close();
  } catch {
    const projects = readFallbackProjects().filter((item) => item.id !== project.id);
    projects.push(project);
    writeFallbackProjects(projects);
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    const database = await openStudioDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(PROJECT_STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not delete project."));
    });
    database.close();
  } catch {
    writeFallbackProjects(readFallbackProjects().filter((project) => project.id !== id));
  }
}
