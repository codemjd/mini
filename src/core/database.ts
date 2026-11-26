export const STUDIO_DB_NAME = "explainer-studio";
export const STUDIO_DB_VERSION = 2;
export const PROJECT_STORE_NAME = "projects";
export const AUDIO_ASSET_STORE_NAME = "audio-assets";

export function openStudioDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }

    const request = indexedDB.open(STUDIO_DB_NAME, STUDIO_DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PROJECT_STORE_NAME)) {
        database.createObjectStore(PROJECT_STORE_NAME, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(AUDIO_ASSET_STORE_NAME)) {
        database.createObjectStore(AUDIO_ASSET_STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () => reject(request.error ?? new Error("Could not open the project database."));
    request.onblocked = () => reject(new Error("Close other Explainer Studio tabs to finish the local database upgrade."));
  });
}
