import type { MediaAsset } from "../types";

const DB_NAME = "nexus-editor-media";
const STORE_NAME = "assets";
const DB_VERSION = 1;

type StoredMediaAsset = Omit<MediaAsset, "objectUrl" | "file"> & { file: Blob };

function openMediaDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Persistent media storage is unavailable in this browser."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open media storage."));
  });
}

export async function saveMediaAsset(asset: MediaAsset): Promise<void> {
  if (!asset.file) return;
  const db = await openMediaDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put({
        id: asset.id, name: asset.name, kind: asset.kind, duration: asset.duration,
        mimeType: asset.mimeType, width: asset.width, height: asset.height, source: asset.source,
        file: asset.file
      } satisfies StoredMediaAsset);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Media could not be saved."));
      tx.onabort = () => reject(tx.error || new Error("Media save was cancelled."));
    });
  } finally {
    db.close();
  }
}

export async function restoreMediaAssets(ids: string[]): Promise<MediaAsset[]> {
  if (!ids.length) return [];
  const db = await openMediaDatabase();
  try {
    const records = await new Promise<StoredMediaAsset[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const found: StoredMediaAsset[] = [];
      let remaining = ids.length;
      if (!remaining) { resolve(found); return; }
      for (const id of ids) {
        const request = store.get(id);
        request.onsuccess = () => {
          if (request.result) found.push(request.result as StoredMediaAsset);
          remaining -= 1;
          if (!remaining) resolve(found);
        };
        request.onerror = () => reject(request.error || new Error("Could not restore saved media."));
      }
      tx.onerror = () => reject(tx.error || new Error("Could not read saved media."));
    });
    return records.map(record => {
      const file = new File([record.file], record.name, { type: record.mimeType || record.file.type || "application/octet-stream" });
      return { ...record, file, objectUrl: URL.createObjectURL(file) };
    });
  } finally {
    db.close();
  }
}
