import { pipeline } from "@huggingface/transformers";

export const SEMANTIC_MODEL = {
  id: "Xenova/all-MiniLM-L6-v2",
  name: "MiniLM L6 · Semantic Embeddings",
  task: "Text embeddings",
  size: "~23 MB · quantised ONNX weights (estimate; exact files vary)",
  description: "Converts captions, transcript segments and scene notes into meaning vectors for local similarity search.",
  strengths: ["English sentence similarity", "Meaning-based project search", "Transcript and caption retrieval"],
  limitations: ["English-focused", "Text only; does not recognise objects in video", "Not a generative chat model"]
} as const;

type FeaturePipeline = (text: string | string[], options?: Record<string, unknown>) => Promise<{ data: ArrayLike<number>; dims?: number[] }>;
let extractor: FeaturePipeline | null = null;
let loading: Promise<FeaturePipeline> | null = null;
let loadedAt = 0;
const embeddingCache = new Map<string, number[]>();
const memoryEmbeddingCache = new Map<string, number[]>();
const CACHE_DB = "nexus-semantic-embeddings-v1";
let cacheDatabase: Promise<IDBDatabase | null> | null = null;

function openEmbeddingDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (!cacheDatabase) cacheDatabase = new Promise(resolve => {
    try {
      const request = indexedDB.open(CACHE_DB, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("vectors")) db.createObjectStore("vectors", { keyPath: "key" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return cacheDatabase;
}

function embeddingKey(text: string) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return "minilm-q8-v1:" + (hash >>> 0).toString(16) + ":" + text.length;
}

async function readPersistentEmbedding(text: string): Promise<number[] | null> {
  const db = await openEmbeddingDatabase();
  if (!db) return null;
  return new Promise(resolve => {
    try {
      const request = db.transaction("vectors", "readonly").objectStore("vectors").get(embeddingKey(text));
      request.onsuccess = () => resolve(Array.isArray(request.result?.vector) ? request.result.vector : null);
      request.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

async function writePersistentEmbedding(text: string, vector: number[]) {
  const db = await openEmbeddingDatabase();
  if (!db) return;
  await new Promise<void>(resolve => {
    try {
      const store = db.transaction("vectors", "readwrite").objectStore("vectors");
      store.put({ key: embeddingKey(text), vector, savedAt: Date.now() });
      const count = store.count();
      count.onsuccess = () => {
        if (count.result > 700) {
          const cursor = store.openCursor();
          let excess = count.result - 600;
          cursor.onsuccess = () => {
            const item = cursor.result;
            if (!item || excess <= 0) return;
            item.delete(); excess--; item.continue();
          };
        }
      };
      resolve();
    } catch { resolve(); }
  });
}


export type ModelProgress = { status?: string; file?: string; progress?: number; loaded?: number; total?: number };

export function getSemanticDeviceInfo() {
  const nav = navigator as Navigator & { deviceMemory?: number; gpu?: unknown };
  const memory = nav.deviceMemory;
  const storageManager = (navigator as unknown as { storage?: { estimate?: () => Promise<unknown> } }).storage;
  const storage = typeof storageManager?.estimate === "function" ? "available" : "unavailable";
  const wasm = typeof WebAssembly !== "undefined";
  return {
    deviceMemory: memory,
    webGPU: Boolean((navigator as unknown as { gpu?: unknown }).gpu),
    webAssembly: wasm,
    storage,
    compatible: wasm && (memory === undefined || memory >= 2),
    note: !wasm ? "WebAssembly is unavailable in this browser." : memory !== undefined && memory < 2
      ? "This device reports under 2 GB of memory. Model loading may fail; the keyword fallback remains available."
      : "Compatible with the quantised browser embedding model. Actual performance depends on available memory and browser support."
  };
}

export async function loadSemanticModel(onProgress?: (progress: ModelProgress) => void): Promise<void> {
  if (extractor) return;
  if (loading) { await loading; return; }
  loading = (async () => {
    const device = getSemanticDeviceInfo();
    if (!device.compatible) throw new Error(device.note);
    const pipe = await pipeline("feature-extraction", SEMANTIC_MODEL.id, {
      device: "wasm",
      dtype: "q8",
      progress_callback: (event: ModelProgress) => onProgress?.(event)
    });
    extractor = pipe as unknown as FeaturePipeline;
    loadedAt = Date.now();
    return extractor;
  })();
  try { await loading; } finally { loading = null; }
}

export function isSemanticModelLoaded() { return !!extractor; }
export function semanticModelLoadedAt() { return loadedAt; }

export async function embedText(text: string): Promise<number[]> {
  if (!extractor) throw new Error("Load the Semantic Embeddings model in Model Centre first.");
  const clean = text.trim().slice(0, 1200);
  const cached = embeddingCache.get(clean);
  if (cached) return cached;
  const persisted = await readPersistentEmbedding(clean);
  if (persisted?.length) {
    if (embeddingCache.size >= 500) embeddingCache.delete(embeddingCache.keys().next().value as string);
    embeddingCache.set(clean, persisted);
    return persisted;
  }
  const output = await extractor(clean, { pooling: "mean", normalize: true });
  const vector = Array.from(output.data, Number);
  if (embeddingCache.size >= 500) embeddingCache.delete(embeddingCache.keys().next().value as string);
  embeddingCache.set(clean, vector);
  void writePersistentEmbedding(clean, vector);
  return vector;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i]; }
  return dot / (Math.sqrt(aa) * Math.sqrt(bb) || 1);
}

export async function rankBySemanticSimilarity<T extends { text: string }>(query: string, records: T[]): Promise<Array<T & { semanticScore: number }>> {
  if (!extractor) throw new Error("Semantic model is not loaded.");
  const queryVector = await embedText(query);
  const ranked: Array<T & { semanticScore: number }> = [];
  for (const record of records.slice(0, 300)) {
    try {
      const vector = await embedText(record.text);
      ranked.push({ ...record, semanticScore: cosineSimilarity(queryVector, vector) });
    } catch { /* one malformed record must not cancel the complete search */ }
  }
  return ranked.sort((a, b) => b.semanticScore - a.semanticScore).slice(0, 20);
}
