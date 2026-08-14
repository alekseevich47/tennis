// @ts-check

/** @type {Map<string, string>} */
const blobUrlCache = new Map();

/** @type {Map<string, Promise<string>>} */
const inflight = new Map();

/**
 * @param {Response} res
 * @param {(percent: number) => void} [onProgress]
 * @returns {Promise<Blob>}
 */
export async function blobFromResponse(res, onProgress) {
  if (!onProgress || !res.body) {
    onProgress?.(0);
    const blob = await res.blob();
    onProgress?.(100);
    return blob;
  }

  const total = Number(res.headers.get('content-length')) || 0;
  const reader = res.body.getReader();
  /** @type {Uint8Array[]} */
  const chunks = [];
  let received = 0;
  onProgress(0);

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    if (total > 0) {
      onProgress(Math.min(99, Math.round((received / total) * 100)));
    }
  }

  onProgress(100);
  return new Blob(chunks, { type: res.headers.get('content-type') || '' });
}

/**
 * @param {string} url
 * @returns {string | null}
 */
export function getCachedMediaBlobUrl(url) {
  if (!url) return null;
  return blobUrlCache.get(url) || null;
}

/**
 * @param {string} url
 * @param {{ signal?: AbortSignal, onProgress?: (percent: number) => void, headers?: Record<string, string> }} [options]
 * @returns {Promise<string>}
 */
export async function fetchBlobUrlWithProgress(url, { signal, onProgress, headers } = {}) {
  const cached = blobUrlCache.get(url);
  if (cached) {
    onProgress?.(100);
    return cached;
  }

  const existing = inflight.get(url);
  if (existing) return existing;

  const request = (async () => {
    const res = await fetch(url, { signal, headers });
    if (!res.ok) {
      throw new Error(`Не удалось загрузить файл (${res.status})`);
    }
    const blob = await blobFromResponse(res, onProgress);
    if (!blob || blob.size === 0) {
      throw new Error('Пустой ответ');
    }
    const blobUrl = URL.createObjectURL(blob);
    blobUrlCache.set(url, blobUrl);
    return blobUrl;
  })();

  inflight.set(url, request);
  try {
    return await request;
  } finally {
    if (inflight.get(url) === request) inflight.delete(url);
  }
}
