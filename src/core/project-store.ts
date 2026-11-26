import type { StudioProject } from "../types/project";
import { AUDIO_ASSET_STORE_NAME, openStudioDatabase, PROJECT_STORE_NAME } from "./database";

const FALLBACK_KEY = "explainer-studio.projects.v1";

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

export async function listProjects(): Promise<StudioProject[]> {
  try {
    const database = await openStudioDatabase();
    try {
      const projects = await new Promise<StudioProject[]>((resolve, reject) => {
        const request = database.transaction(PROJECT_STORE_NAME, "readonly")
          .objectStore(PROJECT_STORE_NAME)
          .getAll();
        request.onsuccess = () => resolve(request.result as StudioProject[]);
        request.onerror = () => reject(request.error ?? new Error("Could not read projects."));
      });
      return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } finally {
      database.close();
    }
  } catch {
    return readFallbackProjects().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
}

export async function loadProject(id: string): Promise<StudioProject | null> {
  try {
    const database = await openStudioDatabase();
    try {
      return await new Promise<StudioProject | null>((resolve, reject) => {
        const request = database.transaction(PROJECT_STORE_NAME, "readonly")
          .objectStore(PROJECT_STORE_NAME)
          .get(id);
        request.onsuccess = () => resolve((request.result as StudioProject | undefined) ?? null);
        request.onerror = () => reject(request.error ?? new Error("Could not load the project."));
      });
    } finally {
      database.close();
    }
  } catch {
    return readFallbackProjects().find((project) => project.id === id) ?? null;
  }
}

export async function saveProject(project: StudioProject): Promise<void> {
  try {
    const database = await openStudioDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(PROJECT_STORE_NAME, "readwrite");
        transaction.objectStore(PROJECT_STORE_NAME).put(project);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error("Could not save the project."));
        transaction.onabort = () => reject(transaction.error ?? new Error("Project save was cancelled."));
      });
    } finally {
      database.close();
    }
  } catch {
    const projects = readFallbackProjects().filter((item) => item.id !== project.id);
    projects.push(project);
    writeFallbackProjects(projects);
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    const database = await openStudioDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(PROJECT_STORE_NAME, "readwrite");
        transaction.objectStore(PROJECT_STORE_NAME).delete(id);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error("Could not delete the project."));
        transaction.onabort = () => reject(transaction.error ?? new Error("Project deletion was cancelled."));
      });
    } finally {
      database.close();
    }
  } catch {
    writeFallbackProjects(readFallbackProjects().filter((project) => project.id !== id));
  }
}

export async function saveAudioAsset(asset: AudioAssetRecord): Promise<void> {
  const database = await openStudioDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(AUDIO_ASSET_STORE_NAME, "readwrite");
      transaction.objectStore(AUDIO_ASSET_STORE_NAME).put(asset);
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
      const request = database.transaction(AUDIO_ASSET_STORE_NAME, "readonly")
        .objectStore(AUDIO_ASSET_STORE_NAME)
        .get(id);
      request.onsuccess = () => resolve((request.result as AudioAssetRecord | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error("تعذر قراءة ملف الصوت."));
    });
  } finally {
    database.close();
  }
}

export async function listProjectAudioAssets(projectId: string): Promise<AudioAssetRecord[]> {
  const database = await openStudioDatabase();
  try {
    return await new Promise<AudioAssetRecord[]>((resolve, reject) => {
      const request = database.transaction(AUDIO_ASSET_STORE_NAME, "readonly")
        .objectStore(AUDIO_ASSET_STORE_NAME)
        .getAll();
      request.onsuccess = () => resolve((request.result as AudioAssetRecord[]).filter((asset) => asset.projectId === projectId));
      request.onerror = () => reject(request.error ?? new Error("تعذر قراءة ملفات الصوت."));
    });
  } finally {
    database.close();
  }
}

export async function deleteAudioAsset(id: string): Promise<void> {
  const database = await openStudioDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(AUDIO_ASSET_STORE_NAME, "readwrite");
      transaction.objectStore(AUDIO_ASSET_STORE_NAME).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("تعذر حذف ملف الصوت."));
      transaction.onabort = () => reject(transaction.error ?? new Error("تم إلغاء حذف ملف الصوت."));
    });
  } finally {
    database.close();
  }
}
