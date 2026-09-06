// @ts-check

/** @type {Map<string, string>} */
const blobUrlCache = new Map();

/** @type {Map<string, Promise<string>>} */
const inflight = new Map();

/** @type {Map<string, AbortController>} */
const inflightAbort = new Map();

/**
 * @typedef {{ chunks: Uint8Array[], received: number, total: number, type: string }} PartialMedia
 */

/** @type {Map<string, PartialMedia>} */
const partialCache = new Map();

/** Минимальный объём partial для старта <video> (moov + первые кадры при faststart). */
export const PROGRESSIVE_VIDEO_MIN_BYTES = 64 * 1024;

/**
 * @param {string} url
 * @param {PartialMedia} partial
 */
function storePartial(url, partial) {
  if (!partial.chunks.length || partial.received <= 0) return;
  partialCache.set(url, {
    chunks: partial.chunks.slice(),
    received: partial.received,
    total: partial.total,
    type: partial.type
  });
}

/**
 * @param {number} received
 * @param {number} total
 * @param {number} lastEmitted
 * @returns {boolean}
 */
function shouldEmitPartial(received, total, lastEmitted) {
  if (received < PROGRESSIVE_VIDEO_MIN_BYTES && !(total > 0 && received >= total)) {
    return false;
  }
  if (lastEmitted <= 0) return true;
  const delta = received - lastEmitted;
  if (delta >= PROGRESSIVE_VIDEO_MIN_BYTES) return true;
  if (total > 0 && received / total - lastEmitted / total >= 0.08) return true;
  return false;
}

/**
 * @param {Response} res
 * @param {((percent: number) => void) | {
 *   onProgress?: (percent: number) => void,
 *   onPartial?: (blob: Blob, percent: number) => void,
 *   signal?: AbortSignal,
 *   url?: string,
 *   initial?: PartialMedia | null
 * }} [options]
 * @returns {Promise<Blob>}
 */
export async function blobFromResponse(res, options) {
  const opts = typeof options === 'function' ? { onProgress: options, url: '' } : (options || {});
  const onProgress = opts.onProgress;
  const onPartial = opts.onPartial;
  const signal = opts.signal;
  const url = opts.url || '';
  const initial = opts.initial || null;
  const type = res.headers.get('content-type') || initial?.type || 'application/octet-stream';
  const contentLength = Number(res.headers.get('content-length')) || 0;
  const rangeTotal = (() => {
    const range = res.headers.get('content-range');
    const match = range && /\/(\d+)\s*$/.exec(range);
    return match ? Number(match[1]) : 0;
  })();

  /** @type {Uint8Array[]} */
  const chunks = initial?.chunks?.length ? initial.chunks.slice() : [];
  let received = initial?.received || 0;
  const total = rangeTotal || (contentLength > 0 ? received + contentLength : initial?.total || 0);
  let lastPartialBytes = 0;

  const percentOf = () => {
    if (total > 0) return Math.min(99, Math.round((received / total) * 100));
    return received > 0 ? 1 : 0;
  };

  const report = () => {
    onProgress?.(percentOf());
  };

  const emitPartial = (force = false) => {
    if (!onPartial || chunks.length === 0) return;
    if (!force && !shouldEmitPartial(received, total, lastPartialBytes)) return;
    lastPartialBytes = received;
    // Живой snapshot кэша — браузер может начать play по partial MP4 (faststart).
    storePartial(url, { chunks, received, total, type });
    onPartial(new Blob(chunks, { type }), percentOf());
  };

  if (!res.body) {
    onProgress?.(0);
    const blob = await res.blob();
    onProgress?.(100);
    partialCache.delete(url);
    return blob;
  }

  const reader = res.body.getReader();
  onProgress?.(total > 0 && received > 0 ? Math.min(99, Math.round((received / total) * 100)) : 0);
  if (received >= PROGRESSIVE_VIDEO_MIN_BYTES) emitPartial(true);

  try {
    while (true) {
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.byteLength;
        report();
        emitPartial();
      }
    }
  } catch (err) {
    storePartial(url, { chunks, received, total, type });
    try {
      await reader.cancel();
    } catch {
      // ignore
    }
    throw err;
  }

  onProgress?.(100);
  partialCache.delete(url);
  return new Blob(chunks, { type });
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
 * @returns {number | null}
 */
export function getCachedMediaPartialPercent(url) {
  const partial = partialCache.get(url);
  if (!partial || partial.total <= 0) return null;
  return Math.min(99, Math.round((partial.received / partial.total) * 100));
}

/**
 * Снимок partial-кэша (для progressive playback до полного скачивания).
 * @param {string} url
 * @returns {Blob | null}
 */
export function getPartialMediaBlob(url) {
  const partial = partialCache.get(url);
  if (!partial?.chunks?.length || partial.received <= 0) return null;
  return new Blob(partial.chunks, { type: partial.type || 'video/mp4' });
}

/**
 * @param {string} url
 * @returns {number}
 */
export function getPartialMediaBytes(url) {
  return partialCache.get(url)?.received || 0;
}

/**
 * @param {string} url
 * @param {{
 *   signal?: AbortSignal,
 *   onProgress?: (percent: number) => void,
 *   onPartial?: (blob: Blob, percent: number) => void,
 *   headers?: Record<string, string>
 * }} [options]
 * @returns {Promise<string>}
 */
export async function fetchBlobUrlWithProgress(url, { signal, onProgress, onPartial, headers = {} } = {}) {
  const cached = blobUrlCache.get(url);
  if (cached) {
    onProgress?.(100);
    return cached;
  }

  const existing = inflight.get(url);
  if (existing) {
    if (signal) {
      const abortExisting = () => inflightAbort.get(url)?.abort();
      if (signal.aborted) {
        abortExisting();
      } else {
        signal.addEventListener('abort', abortExisting, { once: true });
      }
    }
    return existing;
  }

  const controller = new AbortController();
  const onOuterAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', onOuterAbort, { once: true });
    }
  }

  const request = (async () => {
    const partial = partialCache.get(url) || null;
    const offset = partial?.received || 0;
    /** @type {Record<string, string>} */
    const nextHeaders = { ...headers };
    if (offset > 0) {
      nextHeaders.Range = `bytes=${offset}-`;
    }

    const res = await fetch(url, { signal: controller.signal, headers: nextHeaders });
    if (res.status === 416 && offset > 0) {
      partialCache.delete(url);
      const retry = await fetch(url, { signal: controller.signal, headers });
      if (!retry.ok) {
        throw new Error(`Не удалось загрузить файл (${retry.status})`);
      }
      const blob = await blobFromResponse(retry, {
        onProgress,
        onPartial,
        signal: controller.signal,
        url
      });
      if (!blob || blob.size === 0) throw new Error('Пустой ответ');
      const blobUrl = URL.createObjectURL(blob);
      blobUrlCache.set(url, blobUrl);
      return blobUrl;
    }

    if (!res.ok) {
      throw new Error(`Не удалось загрузить файл (${res.status})`);
    }

    const usePartial = offset > 0 && res.status === 206 ? partial : null;
    if (offset > 0 && res.status === 200) {
      partialCache.delete(url);
    }

    const blob = await blobFromResponse(res, {
      onProgress,
      onPartial,
      signal: controller.signal,
      url,
      initial: usePartial
    });
    if (!blob || blob.size === 0) {
      throw new Error('Пустой ответ');
    }
    const blobUrl = URL.createObjectURL(blob);
    blobUrlCache.set(url, blobUrl);
    return blobUrl;
  })();

  inflight.set(url, request);
  inflightAbort.set(url, controller);
  try {
    return await request;
  } finally {
    if (inflight.get(url) === request) inflight.delete(url);
    if (inflightAbort.get(url) === controller) inflightAbort.delete(url);
    signal?.removeEventListener('abort', onOuterAbort);
  }
}
