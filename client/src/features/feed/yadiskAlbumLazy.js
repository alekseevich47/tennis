// @ts-check
/**
 * Ленивая загрузка байтов альбома Яндекс.Диска:
 * окно вокруг focus, очередь с concurrency, revoke вне окна.
 */
import { fetchYadiskObjectUrl, fetchYadiskPreview } from '../../services/yadisk';
import { videoPreviewUrl } from '../../lib/media';

export const ALBUM_WINDOW_RADIUS = 2;
export const ALBUM_COVER_RADIUS = 0;
export const ALBUM_FETCH_CONCURRENCY = 6;

/** @type {Map<string, Set<(index: number, options?: { radius?: number }) => void>>} */
const focusListeners = new Map();

/**
 * @param {number} focus
 * @param {number} length
 * @param {number} radius
 * @returns {number[]}
 */
export function windowIndices(focus, length, radius) {
  if (length <= 0) return [];
  const safeFocus = Math.max(0, Math.min(focus, length - 1));
  const lo = Math.max(0, safeFocus - radius);
  const hi = Math.min(length - 1, safeFocus + radius);
  /** @type {number[]} */
  const out = [];
  for (let i = lo; i <= hi; i++) out.push(i);
  return out;
}

/**
 * @param {number} concurrency
 */
export function createPriorityQueue(concurrency = ALBUM_FETCH_CONCURRENCY) {
  /** @type {Map<string, { priority: number, run: () => Promise<void> }>} */
  const pending = new Map();
  /** @type {Set<string>} */
  const running = new Set();
  let destroyed = false;

  const pump = () => {
    if (destroyed) return;
    while (running.size < concurrency && pending.size > 0) {
      let bestKey = /** @type {string | null} */ (null);
      let bestPri = Infinity;
      for (const [key, job] of pending) {
        if (job.priority < bestPri) {
          bestPri = job.priority;
          bestKey = key;
        }
      }
      if (!bestKey) break;
      const job = pending.get(bestKey);
      pending.delete(bestKey);
      if (!job) continue;
      running.add(bestKey);
      const key = bestKey;
      Promise.resolve()
        .then(() => job.run())
        .catch(() => {})
        .finally(() => {
          running.delete(key);
          pump();
        });
    }
  };

  return {
    /**
     * @param {string} key
     * @param {number} priority
     * @param {() => Promise<void>} run
     */
    enqueue(key, priority, run) {
      if (destroyed || running.has(key)) return;
      const existing = pending.get(key);
      if (existing) {
        existing.priority = Math.min(existing.priority, priority);
        return;
      }
      pending.set(key, { priority, run });
      pump();
    },
    /** @param {string} key */
    cancel(key) {
      pending.delete(key);
    },
    /** @param {string} key */
    has(key) {
      return pending.has(key) || running.has(key);
    },
    clear() {
      pending.clear();
    },
    destroy() {
      destroyed = true;
      pending.clear();
    }
  };
}

/**
 * @param {string} publicUrl
 * @param {string | null | undefined} path
 * @param {{ signal?: AbortSignal, preferFull?: boolean }} [options]
 */
export async function fetchAlbumMemberBytes(publicUrl, path, { signal, preferFull = true } = {}) {
  const resolved = await fetchYadiskPreview(publicUrl, {
    signal,
    path: path || null
  });
  if (resolved.type === 'album') {
    throw new Error('Ожидался файл внутри альбома');
  }

  const isVideo = resolved.mediaType === 'video';
  const name = resolved.name || 'media';

  if (isVideo) {
    const fileUrl = await fetchYadiskObjectUrl(publicUrl, 'file', {
      signal,
      path: path || null
    });
    return {
      isVideo: true,
      name,
      displayUrl: videoPreviewUrl(fileUrl),
      previewUrl: fileUrl,
      fileUrl
    };
  }

  const previewUrl = await fetchYadiskObjectUrl(publicUrl, 'preview', {
    signal,
    path: path || null
  });

  if (!preferFull) {
    return {
      isVideo: false,
      name,
      displayUrl: previewUrl,
      previewUrl,
      fileUrl: previewUrl
    };
  }

  let fileUrl = previewUrl;
  try {
    fileUrl = await fetchYadiskObjectUrl(publicUrl, 'file', {
      signal,
      path: path || null
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
  }

  return {
    isVideo: false,
    name,
    displayUrl: fileUrl,
    previewUrl,
    fileUrl
  };
}

/**
 * @param {string} publicUrl
 * @param {(index: number, options?: { radius?: number }) => void} handler
 * @returns {() => void}
 */
export function registerAlbumLazyFocus(publicUrl, handler) {
  if (!publicUrl) return () => {};
  let set = focusListeners.get(publicUrl);
  if (!set) {
    set = new Set();
    focusListeners.set(publicUrl, set);
  }
  set.add(handler);
  return () => {
    set?.delete(handler);
    if (set && set.size === 0) focusListeners.delete(publicUrl);
  };
}

/**
 * @param {string} publicUrl
 * @param {number} index
 * @param {{ radius?: number }} [options]
 */
export function requestAlbumLazyFocus(publicUrl, index, options) {
  if (!publicUrl) return;
  const set = focusListeners.get(publicUrl);
  if (!set) return;
  set.forEach((handler) => {
    try {
      handler(index, options);
    } catch {
      // ignore
    }
  });
}

/**
 * Контроллер окна байтов для одного альбома.
 *
 * @param {{
 *   publicUrl: string,
 *   getMembers: () => Array<{ originKey: string, path?: string | null }>,
 *   concurrency?: number,
 *   signal: AbortSignal,
 *   onResolved: (originKey: string, bytes: Awaited<ReturnType<typeof fetchAlbumMemberBytes>>) => void,
 *   onCleared: (originKey: string) => void,
 *   onError?: (originKey: string, err: unknown) => void
 * }} options
 */
export function createAlbumWindowController({
  publicUrl,
  getMembers,
  concurrency = ALBUM_FETCH_CONCURRENCY,
  signal,
  onResolved,
  onCleared,
  onError
}) {
  const queue = createPriorityQueue(concurrency);
  /** @type {Map<string, AbortController>} */
  const aborts = new Map();
  /** @type {Map<string, { previewUrl: string, fileUrl: string }>} */
  const held = new Map();
  let focus = 0;
  let radius = ALBUM_COVER_RADIUS;
  let destroyed = false;

  const revokeHeld = (originKey) => {
    const urls = held.get(originKey);
    if (!urls) return;
    if (urls.previewUrl) URL.revokeObjectURL(urls.previewUrl);
    if (urls.fileUrl && urls.fileUrl !== urls.previewUrl) {
      URL.revokeObjectURL(urls.fileUrl);
    }
    held.delete(originKey);
  };

  const abortJob = (originKey) => {
    queue.cancel(originKey);
    const controller = aborts.get(originKey);
    if (controller) {
      controller.abort();
      aborts.delete(originKey);
    }
  };

  const sync = () => {
    if (destroyed) return;
    const members = getMembers();
    const keepIdx = new Set(windowIndices(focus, members.length, radius));
    /** @type {Set<string>} */
    const keepKeys = new Set();
    keepIdx.forEach((index) => {
      const member = members[index];
      if (member) keepKeys.add(member.originKey);
    });

    for (const originKey of [...held.keys()]) {
      if (keepKeys.has(originKey)) continue;
      abortJob(originKey);
      revokeHeld(originKey);
      onCleared(originKey);
    }

    for (const originKey of [...aborts.keys()]) {
      if (keepKeys.has(originKey)) continue;
      abortJob(originKey);
    }

    const ordered = [...keepIdx].sort(
      (a, b) => Math.abs(a - focus) - Math.abs(b - focus) || a - b
    );

    for (const index of ordered) {
      const member = members[index];
      if (!member) continue;
      const originKey = member.originKey;
      if (held.has(originKey) || queue.has(originKey)) continue;

      const preferFull = true;
      const priority = Math.abs(index - focus);

      queue.enqueue(originKey, priority, async () => {
        if (destroyed || signal.aborted) return;
        const jobController = new AbortController();
        aborts.set(originKey, jobController);
        const onParentAbort = () => jobController.abort();
        signal.addEventListener('abort', onParentAbort, { once: true });
        try {
          const bytes = await fetchAlbumMemberBytes(publicUrl, member.path, {
            signal: jobController.signal,
            preferFull
          });
          if (destroyed || jobController.signal.aborted) {
            if (bytes.previewUrl) URL.revokeObjectURL(bytes.previewUrl);
            if (bytes.fileUrl && bytes.fileUrl !== bytes.previewUrl) {
              URL.revokeObjectURL(bytes.fileUrl);
            }
            return;
          }
          revokeHeld(originKey);
          held.set(originKey, {
            previewUrl: bytes.previewUrl,
            fileUrl: bytes.fileUrl
          });
          onResolved(originKey, bytes);
        } catch (err) {
          if (err?.name === 'AbortError' || destroyed) return;
          onError?.(originKey, err);
        } finally {
          signal.removeEventListener('abort', onParentAbort);
          aborts.delete(originKey);
        }
      });
    }
  };

  return {
    /**
     * @param {number} nextFocus
     * @param {{ radius?: number }} [options]
     */
    setFocus(nextFocus, options = {}) {
      if (destroyed) return;
      focus = Math.max(0, nextFocus | 0);
      if (typeof options.radius === 'number') {
        radius = Math.max(0, options.radius);
      } else if (radius < ALBUM_WINDOW_RADIUS && focus !== 0) {
        radius = ALBUM_WINDOW_RADIUS;
      }
      sync();
    },
    sync,
    destroy() {
      destroyed = true;
      queue.destroy();
      for (const originKey of [...aborts.keys()]) {
        abortJob(originKey);
      }
      for (const originKey of [...held.keys()]) {
        revokeHeld(originKey);
      }
    }
  };
}
