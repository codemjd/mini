import { AUDIO_ASSET_STORE_NAME, openStudioDatabase } from "./database";

export interface AudioAssetRecord {
  id: string;
  projectId: string;
  sceneId: string;
  blob: Blob;
  fileName: string;
  mimeType: "audio/wav" | "audio/mpeg";
  durationSeconds: number;
  source: "uploaded" | "nabra";
  createdAt: string;
}

export async function saveAudioAsset(asset: AudioAssetRecord): Promise<void> {
  const database = await openStudioDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(AUDIO_ASSET_STORE_NAME, "readwrite");
      transaction.objectStore(AUDIO_ASSET_STORE_NAME).put(asset);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not save the audio asset."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Audio asset save was cancelled."));
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
      request.onerror = () => reject(request.error ?? new Error("Could not load the audio asset."));
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
      request.onsuccess = () => {
        const assets = request.result as AudioAssetRecord[];
        resolve(assets.filter((asset) => asset.projectId === projectId));
      };
      request.onerror = () => reject(request.error ?? new Error("Could not list project audio assets."));
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
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not delete the audio asset."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Audio asset deletion was cancelled."));
    });
  } finally {
    database.close();
  }
}
