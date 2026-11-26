export interface AudioAssetRecord {
  id: string;
  projectId: string;
  sceneId: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  blob: Blob;
}

const DB_NAME = "explainer-studio";
const DB_VERSION = 2;
const AUDIO_STORE_NAME = "audio-assets";

export const MAX_NARRATION_AUDIO_BYTES = 25 * 1024 * 1024;

function openAudioDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("هذا المتصفح لا يدعم التخزين المحلي المطلوب لملفات الصوت."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("projects")) {
        database.createObjectStore("projects", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(AUDIO_STORE_NAME)) {
        database.createObjectStore(AUDIO_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("تعذر فتح قاعدة ملفات الصوت."));
    request.onblocked = () => reject(new Error("أغلق النسخ الأخرى من الاستوديو للسماح بترقية قاعدة البيانات."));
  });
}

export async function saveAudioAsset(asset: AudioAssetRecord): Promise<void> {
  const database = await openAudioDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(AUDIO_STORE_NAME, "readwrite");
      transaction.objectStore(AUDIO_STORE_NAME).put(asset);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("تعذر حفظ ملف الصوت."));
      transaction.onabort = () => reject(transaction.error ?? new Error("أُلغيت عملية حفظ ملف الصوت."));
    });
  } finally {
    database.close();
  }
}

export async function getAudioAsset(id: string): Promise<AudioAssetRecord | null> {
  const database = await openAudioDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(AUDIO_STORE_NAME, "readonly")
        .objectStore(AUDIO_STORE_NAME)
        .get(id);
      request.onsuccess = () => resolve((request.result as AudioAssetRecord | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error("تعذر قراءة ملف الصوت."));
    });
  } finally {
    database.close();
  }
}

export async function deleteUnreferencedAudioAssets(
  projectId: string,
  referencedAssetIds: readonly string[]
): Promise<void> {
  const database = await openAudioDatabase();
  const keep = new Set(referencedAssetIds);
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(AUDIO_STORE_NAME, "readwrite");
      const store = transaction.objectStore(AUDIO_STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        for (const asset of request.result as AudioAssetRecord[]) {
          if (asset.projectId === projectId && !keep.has(asset.id)) {
            store.delete(asset.id);
          }
        }
      };
      request.onerror = () => transaction.abort();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("تعذر تنظيف ملفات الصوت غير المستخدمة."));
      transaction.onabort = () => reject(transaction.error ?? new Error("أُلغيت عملية تنظيف ملفات الصوت."));
    });
  } finally {
    database.close();
  }
}


export async function deleteAudioAsset(id: string): Promise<void> {
  const database = await openAudioDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(AUDIO_STORE_NAME, "readwrite");
      transaction.objectStore(AUDIO_STORE_NAME).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("تعذر حذف ملف الصوت."));
      transaction.onabort = () => reject(transaction.error ?? new Error("أُلغيت عملية حذف ملف الصوت."));
    });
  } finally {
    database.close();
  }
}


export async function getAudioDurationSeconds(blob: Blob): Promise<number | null> {
  if (typeof document === "undefined" || typeof URL === "undefined") return null;
  const objectUrl = URL.createObjectURL(blob);
  const audio = document.createElement("audio");
  audio.preload = "metadata";

  return new Promise((resolve) => {
    let settled = false;
    const finish = (duration: number | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      audio.onloadedmetadata = null;
      audio.onerror = null;
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(objectUrl);
      resolve(duration);
    };
    const timeout = window.setTimeout(() => finish(null), 8000);

    audio.onloadedmetadata = () => {
      finish(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null);
    };
    audio.onerror = () => finish(null);
    audio.src = objectUrl;
    audio.load();
  });
}

export async function encodeBlobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

export function decodeBase64Audio(base64: string, mimeType: string): Blob {
  if (!/^audio\/[a-z0-9.+-]+$/i.test(mimeType)) {
    throw new Error("نوع ملف التعليق الصوتي غير صالح.");
  }
  const normalized = base64.replace(/\s/g, "");
  const maxEncodedLength = Math.ceil(MAX_NARRATION_AUDIO_BYTES / 3) * 4;
  if (normalized.length > maxEncodedLength) throw new Error("ملف التعليق الصوتي يتجاوز الحد المدعوم البالغ 25 ميغابايت.");
  if (!normalized || normalized.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    throw new Error("بيانات ملف الصوت داخل ملف المشروع تالفة.");
  }

  let binary: string;
  try {
    binary = atob(normalized);
  } catch {
    throw new Error("تعذر فك ترميز ملف الصوت داخل المشروع.");
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  if (bytes.byteLength > MAX_NARRATION_AUDIO_BYTES) {
    throw new Error("ملف التعليق الصوتي يتجاوز الحد المدعوم البالغ 25 ميغابايت.");
  }
  return new Blob([bytes], { type: mimeType });
}
