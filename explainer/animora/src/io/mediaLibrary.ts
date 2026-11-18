const DB_NAME = 'animora-media-library';
const STORE_NAME = 'assets';
const DB_VERSION = 1;

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this browser'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open media library'));
    request.onblocked = () => reject(new Error('Media library upgrade is blocked by another tab'));
  });
}

/** Store the original media Blob outside the project JSON and return a stable asset key. */
export async function storeMediaAsset(file: File): Promise<string> {
  const db = await openMediaDb();
  const key = `media:${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)}`;
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ blob: file, name: file.name, type: file.type, size: file.size }, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Could not save media asset'));
      tx.onabort = () => reject(tx.error ?? new Error('Media asset save was cancelled'));
    });
    return key;
  } finally {
    db.close();
  }
}

export async function readMediaAsset(key: string): Promise<{ blob: Blob; name: string; type: string } | null> {
  const db = await openMediaDb();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
      request.onsuccess = () => {
        const value = request.result;
        resolve(value?.blob instanceof Blob ? { blob: value.blob, name: value.name ?? 'Media', type: value.type ?? value.blob.type } : null);
      };
      request.onerror = () => reject(request.error ?? new Error('Could not read media asset'));
    });
  } finally {
    db.close();
  }
}
