// @ts-check
import { error } from './log';

/** Bounding box: все видео влезают в 1080×1920 с сохранением пропорций. */
export const VIDEO_MAX_BOX_W = 1080;
export const VIDEO_MAX_BOX_H = 1920;
export const VIDEO_CRF = '28';
export const VIDEO_AUDIO_BITRATE = '96k';

/** @type {import('@ffmpeg/ffmpeg').FFmpeg | null} */
let ffmpegInstance = null;
/** @type {Promise<import('@ffmpeg/ffmpeg').FFmpeg> | null} */
let loadPromise = null;

/**
 * @param {AbortSignal} [signal]
 */
async function loadFfmpeg(signal) {
  if (ffmpegInstance?.loaded) return ffmpegInstance;
  if (loadPromise) {
    const instance = await loadPromise;
    signal?.throwIfAborted();
    return instance;
  }

  loadPromise = (async () => {
    const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([
      import('@ffmpeg/ffmpeg'),
      import('@ffmpeg/util')
    ]);
    const ffmpeg = new FFmpeg();
    const base = `${import.meta.env.BASE_URL}ffmpeg`.replace(/\/?$/, '/');
    await ffmpeg.load({
      coreURL: await toBlobURL(`${base}ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${base}ffmpeg-core.wasm`, 'application/wasm')
    });
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  try {
    return await loadPromise;
  } catch (err) {
    loadPromise = null;
    ffmpegInstance = null;
    throw err;
  }
}

/**
 * @param {string} filename
 */
function toOutputFilename(filename) {
  const stem = filename.replace(/\.[^.]+$/, '') || 'video';
  return `${stem}.opt.mp4`;
}

/**
 * @param {string} filename
 */
function inputExtension(filename) {
  const match = filename.match(/\.(mp4|webm|mov|m4v|mkv|avi)$/i);
  return match ? match[0].toLowerCase() : '.mp4';
}

/**
 * @param {import('@ffmpeg/ffmpeg').FFmpeg} ffmpeg
 * @param {AbortSignal | undefined} signal
 */
function bindAbort(ffmpeg, signal) {
  if (!signal) return () => {};

  const onAbort = () => {
    try {
      ffmpeg.terminate();
    } catch (_) {}
    ffmpegInstance = null;
    loadPromise = null;
  };

  signal.addEventListener('abort', onAbort, { once: true });
  return () => signal.removeEventListener('abort', onAbort);
}

/**
 * Перекодирует любое видео в H.264/AAC MP4 (CRF 28, AAC 96k, max 1080×1920).
 * FFmpeg.wasm работает в Worker — UI не блокируется.
 *
 * @param {File} file
 * @param {{ onProgress?: (percent: number) => void, signal?: AbortSignal }} [options]
 * @returns {Promise<File>}
 */
export async function compressVideo(file, { onProgress, signal } = {}) {
  signal?.throwIfAborted();

  const ffmpeg = await loadFfmpeg(signal);
  const unbindAbort = bindAbort(ffmpeg, signal);

  const inputName = `in${inputExtension(file.name)}`;
  const outputName = 'out.opt.mp4';
  const outFilename = toOutputFilename(file.name);

  /** @param {{ progress?: number }} event */
  const onFfmpegProgress = ({ progress = 0 }) => {
    onProgress?.(Math.min(98, Math.round(4 + progress * 94)));
  };

  ffmpeg.on('progress', onFfmpegProgress);
  onProgress?.(1);

  try {
    await ffmpeg.writeFile(inputName, await (await import('@ffmpeg/util')).fetchFile(file));
    signal?.throwIfAborted();

    await ffmpeg.exec([
      '-i',
      inputName,
      '-vf',
      `scale=${VIDEO_MAX_BOX_W}:${VIDEO_MAX_BOX_H}:force_original_aspect_ratio=decrease:force_divisible_by=2`,
      '-c:v',
      'libx264',
      '-crf',
      VIDEO_CRF,
      '-preset',
      'fast',
      '-c:a',
      'aac',
      '-b:a',
      VIDEO_AUDIO_BITRATE,
      '-movflags',
      '+faststart',
      '-y',
      outputName
    ]);

    signal?.throwIfAborted();

    const data = await ffmpeg.readFile(outputName);
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(/** @type {ArrayBuffer} */ (data));
    const blob = new Blob([bytes], { type: 'video/mp4' });
    onProgress?.(100);

    return new File([blob], outFilename, {
      type: 'video/mp4',
      lastModified: Date.now()
    });
  } catch (err) {
    if (signal?.aborted) {
      throw new DOMException('Подготовка видео отменена', 'AbortError');
    }
    error('compressVideo:', err);
    throw new Error('Не удалось подготовить видео');
  } finally {
    ffmpeg.off('progress', onFfmpegProgress);
    unbindAbort();
    try {
      await ffmpeg.deleteFile(inputName);
    } catch (_) {}
    try {
      await ffmpeg.deleteFile(outputName);
    } catch (_) {}
  }
}

/**
 * @param {File} file
 */
export function isPreparedVideoFile(file) {
  return /\.opt\.mp4$/i.test(file.name);
}
