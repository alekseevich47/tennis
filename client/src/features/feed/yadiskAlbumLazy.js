// @ts-check
/**
 * Ленивая загрузка байтов альбома Яндекс.Диска:
 * окно вокруг focus, очередь с concurrency, revoke вне окна.
 */
import { fetchYadiskObjectUrl, fetchYadiskPreview } from '../../services/yadisk';
import { videoPreviewUrl } from '../../lib/media';
import {
  getCachedMemberBytes,
  setCachedMemberBytes,
  setMemberLoadProgress
} from './yadiskMediaSessionCache';

export const ALBUM_WINDOW_RADIUS = 2;
export const ALBUM_COVER_RADIUS = 0;
/** Все слайды альбома — для L-превью в ленте. */
export const ALBUM_PREVIEW_ALL_RADIUS = Number.POSITIVE_INFINITY;
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
  if (!Number.isFinite(radius) || radius >= length) {
    /** @type {number[]} */
    const all = [];
    for (let i = 0; i < length; i++) all.push(i);
    return all;
  }
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
/**
 * @param {CachedMemberBytes} cached
 * @param {boolean} preferFull
 */
function memberBytesForDisplay(cached, preferFull) {
  if (cached.isVideo) return cached;
  if (!preferFull || !cached.fileUrl || cached.fileUrl === cached.previewUrl) {
    return {
      ...cached,
      displayUrl: cached.previewUrl
    };
  }
  return {
    ...cached,
    displayUrl: cached.fileUrl
  };
}

/**
 * @typedef {import('./yadiskMediaSessionCache').CachedMemberBytes} CachedMemberBytes
 */

/**
 * @param {string} publicUrl
 * @param {string | null | undefined} path
 * @param {{ signal?: AbortSignal, preferFull?: boolean, name?: string, isVideo?: boolean, onProgress?: (percent: number) => void }} [options]
 * @returns {Promise<CachedMemberBytes>}
 */
export async function fetchAlbumMemberBytes(
  publicUrl,
  path,
  { signal, preferFull = false, name, isVideo, onProgress } = {}
) {
  const cached = getCachedMemberBytes(publicUrl, path);
  if (cached) {
    if (!preferFull || cached.isVideo || (cached.fileUrl && cached.fileUrl !== cached.previewUrl)) {
      return memberBytesForDisplay(cached, preferFull);
    }
  }

  let resolvedName = name || 'media';
  let resolvedIsVideo = isVideo;

  if (typeof resolvedIsVideo !== 'boolean') {
    const resolved = await fetchYadiskPreview(publicUrl, {
      signal,
      path: path || null
    });
    if (resolved.type === 'album') {
      throw new Error('Ожидался файл внутри альбома');
    }
    resolvedIsVideo = resolved.mediaType === 'video';
    resolvedName = resolved.name || resolvedName;
  }

  const isVideoResolved = resolvedIsVideo;
  const mediaName = resolvedName;

  if (isVideoResolved) {
    const fileUrl =
      cached?.fileUrl ||
      (await fetchYadiskObjectUrl(publicUrl, 'file', {
        signal,
        path: path || null
      }));
    const bytes = {
      isVideo: true,
      name: mediaName,
      displayUrl: videoPreviewUrl(fileUrl),
      previewUrl: fileUrl,
      fileUrl
    };
    setCachedMemberBytes(publicUrl, path, bytes);
    return bytes;
  }

  const previewUrl =
    cached?.previewUrl ||
    (await fetchYadiskObjectUrl(publicUrl, 'preview', {
      signal,
      path: path || null
    }));

  if (!preferFull) {
    const bytes = {
      isVideo: false,
      name: mediaName,
      displayUrl: previewUrl,
      previewUrl,
      fileUrl: cached?.fileUrl || null
    };
    setCachedMemberBytes(publicUrl, path, bytes);
    return bytes;
  }

  let fileUrl = cached?.fileUrl || null;
  if (!fileUrl || fileUrl === previewUrl) {
    try {
      onProgress?.(0);
      fileUrl = await fetchYadiskObjectUrl(publicUrl, 'file', {
        signal,
        path: path || null,
        onProgress
      });
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      fileUrl = previewUrl;
    }
  }

  const bytes = {
    isVideo: false,
    name: mediaName,
    displayUrl: fileUrl,
    previewUrl,
    fileUrl
  };
  setCachedMemberBytes(publicUrl, path, bytes);
  return bytes;
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
 * @param {{ radius?: number, preferFull?: boolean }} [options]
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
 *   getMembers: () => Array<{ originKey: string, path?: string | null, name?: string, isVideo?: boolean, publicUrl?: string }>,
 *   concurrency?: number,
 *   signal: AbortSignal,
 *   onResolved: (originKey: string, bytes: CachedMemberBytes) => void,
 *   onCleared?: (originKey: string) => void,
 *   onError?: (originKey: string, err: unknown) => void,
 *   retainLoaded?: boolean
 * }} options
 */
export function createAlbumWindowController({
  publicUrl,
  getMembers,
  concurrency = ALBUM_FETCH_CONCURRENCY,
  signal,
  onResolved,
  onCleared,
  onError,
  retainLoaded = true
}) {
  const queue = createPriorityQueue(concurrency);
  /** @type {Map<string, AbortController>} */
  const aborts = new Map();
  /** @type {Set<string>} */
  const held = new Set();
  let focus = 0;
  let radius = ALBUM_PREVIEW_ALL_RADIUS;
  let preferFull = false;
  let destroyed = false;

  const memberPublicUrl = (member) => member.publicUrl || publicUrl;

  const abortJob = (jobKey) => {
    queue.cancel(jobKey);
    const controller = aborts.get(jobKey);
    if (controller) {
      controller.abort();
      aborts.delete(jobKey);
    }
  };

  const fullJobKey = (originKey) => `${originKey}::full`;

  const sync = () => {
    if (destroyed) return;
    const members = getMembers();
    const previewIdx = new Set(windowIndices(focus, members.length, radius));
    const fullIdx = preferFull
      ? new Set(windowIndices(focus, members.length, ALBUM_WINDOW_RADIUS))
      : new Set();
    const fullKeys = new Set();
    fullIdx.forEach((index) => {
      const member = members[index];
      if (member) fullKeys.add(fullJobKey(member.originKey));
    });

    for (const jobKey of [...aborts.keys()]) {
      const isFullJob = jobKey.endsWith('::full');
      if (isFullJob && !fullKeys.has(jobKey)) abortJob(jobKey);
    }

    const orderedPreview = [...previewIdx].sort(
      (a, b) => Math.abs(a - focus) - Math.abs(b - focus) || a - b
    );

    for (const index of orderedPreview) {
      const member = members[index];
      if (!member) continue;
      const originKey = member.originKey;
      const sourceUrl = memberPublicUrl(member);
      const cached = getCachedMemberBytes(sourceUrl, member.path);
      if (cached) {
        held.add(originKey);
        onResolved(originKey, memberBytesForDisplay(cached, preferFull));
      } else if (held.has(originKey) || queue.has(originKey)) {
        continue;
      } else {
        const priority = Math.abs(index - focus);
        queue.enqueue(originKey, priority, async () => {
          if (destroyed || signal.aborted) return;
          const jobController = new AbortController();
          aborts.set(originKey, jobController);
          const onParentAbort = () => jobController.abort();
          signal.addEventListener('abort', onParentAbort, { once: true });
          try {
            const bytes = await fetchAlbumMemberBytes(sourceUrl, member.path, {
              signal: jobController.signal,
              preferFull: false,
              name: member.name,
              isVideo: member.isVideo
            });
            if (destroyed || jobController.signal.aborted) return;
            held.add(originKey);
            onResolved(originKey, memberBytesForDisplay(bytes, false));
          } catch (err) {
            if (err?.name === 'AbortError' || destroyed) return;
            onError?.(originKey, err);
          } finally {
            signal.removeEventListener('abort', onParentAbort);
            aborts.delete(originKey);
            if (!destroyed) sync();
          }
        });
      }

      const wantFull = fullKeys.has(fullJobKey(originKey));
      const hasOriginal =
        cached && cached.fileUrl && cached.fileUrl !== cached.previewUrl;
      if (wantFull && cached && !hasOriginal && !cached.isVideo) {
        const jobKey = fullJobKey(originKey);
        if (queue.has(jobKey) || aborts.has(jobKey)) continue;
        const priority = Math.abs(index - focus);
        queue.enqueue(jobKey, priority, async () => {
          if (destroyed || signal.aborted || !preferFull) return;
          const jobController = new AbortController();
          aborts.set(jobKey, jobController);
          const onParentAbort = () => jobController.abort();
          signal.addEventListener('abort', onParentAbort, { once: true });
          setMemberLoadProgress(sourceUrl, member.path, 0);
          try {
            const bytes = await fetchAlbumMemberBytes(sourceUrl, member.path, {
              signal: jobController.signal,
              preferFull: true,
              name: member.name,
              isVideo: member.isVideo,
              onProgress: (percent) => setMemberLoadProgress(sourceUrl, member.path, percent)
            });
            if (destroyed || jobController.signal.aborted) {
              setMemberLoadProgress(sourceUrl, member.path, null);
              return;
            }
            held.add(originKey);
            onResolved(originKey, memberBytesForDisplay(bytes, true));
          } catch (err) {
            if (err?.name === 'AbortError' || destroyed) {
              setMemberLoadProgress(sourceUrl, member.path, null);
              return;
            }
            onError?.(originKey, err);
            setMemberLoadProgress(sourceUrl, member.path, null);
          } finally {
            signal.removeEventListener('abort', onParentAbort);
            aborts.delete(jobKey);
          }
        });
      }
    }
  };

  return {
    /**
     * @param {number} nextFocus
     * @param {{ radius?: number, preferFull?: boolean, keepIndex?: boolean }} [options]
     */
    setFocus(nextFocus, options = {}) {
      if (destroyed) return;
      if (!options.keepIndex) {
        focus = Math.max(0, nextFocus | 0);
      }
      if (typeof options.radius === 'number') {
        radius = options.radius < 0 ? ALBUM_PREVIEW_ALL_RADIUS : options.radius;
      }
      if (typeof options.preferFull === 'boolean') {
        preferFull = options.preferFull;
      }
      sync();
    },
    sync,
    destroy() {
      destroyed = true;
      queue.destroy();
      for (const jobKey of [...aborts.keys()]) {
        abortJob(jobKey);
      }
      held.clear();
    }
  };
}
