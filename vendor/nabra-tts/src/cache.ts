const CACHE_NAME = 'nabra-tts';

async function openCache(): Promise<Cache | null> {
  try {
    return typeof caches !== 'undefined' ? await caches.open(CACHE_NAME) : null;
  } catch {
    return null; // e.g. opaque origins, private mode
  }
}

async function readBody(res: Response, onProgress?: (loaded: number, total: number) => void): Promise<Uint8Array> {
  const total = Number(res.headers.get('Content-Length')) || 0;
  if (!res.body || !onProgress) return new Uint8Array(await res.arrayBuffer());
  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    loaded += value.byteLength;
    onProgress(loaded, total);
  }
  const out = new Uint8Array(loaded);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.byteLength;
  }
  return out;
}

/** fetch() a binary file, serving it from Cache Storage when present. */
export async function fetchCached(
  url: string,
  useCache: boolean,
  onProgress?: (loaded: number, total: number) => void,
): Promise<Uint8Array> {
  const cache = useCache ? await openCache() : null;
  const hit = await cache?.match(url);
  if (hit) {
    const bytes = await readBody(hit);
    onProgress?.(bytes.byteLength, bytes.byteLength);
    return bytes;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`nabra-tts: failed to fetch ${url} (${res.status})`);
  const bytes = await readBody(res, onProgress);
  if (cache) {
    const headers = { 'Content-Type': 'application/octet-stream', 'Content-Length': String(bytes.byteLength) };
    await cache.put(url, new Response(bytes as Uint8Array<ArrayBuffer>, { headers })).catch(() => {});
  }
  return bytes;
}

/** Remove cached model files. */
export async function clearCache(): Promise<void> {
  if (typeof caches !== 'undefined') await caches.delete(CACHE_NAME);
}
