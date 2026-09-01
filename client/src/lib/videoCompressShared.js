// @ts-check

/** Bounding box: все видео влезают в 1080×1920 с сохранением пропорций. */
export const VIDEO_MAX_BOX_W = 1080;
export const VIDEO_MAX_BOX_H = 1920;
export const VIDEO_CRF = '28';
export const VIDEO_AUDIO_BITRATE = '96k';
export const VIDEO_TARGET_BITRATE = 2_500_000;
export const AUDIO_TARGET_BITRATE = 96_000;

/**
 * @param {string} filename
 */
export function toOutputFilename(filename) {
  const stem = filename.replace(/\.[^.]+$/, '') || 'video';
  return `${stem}.opt.mp4`;
}

/**
 * @param {File} file
 */
export function isPreparedVideoFile(file) {
  return /\.opt\.mp4$/i.test(file.name);
}

/**
 * @param {number} sourceW
 * @param {number} sourceH
 * @param {number} [maxW]
 * @param {number} [maxH]
 */
export function fitVideoDimensions(
  sourceW,
  sourceH,
  maxW = VIDEO_MAX_BOX_W,
  maxH = VIDEO_MAX_BOX_H
) {
  const scale = Math.min(maxW / sourceW, maxH / sourceH, 1);
  let width = Math.max(2, Math.round(sourceW * scale));
  let height = Math.max(2, Math.round(sourceH * scale));
  if (width % 2 !== 0) width -= 1;
  if (height % 2 !== 0) height -= 1;
  return { width, height };
}

/**
 * @param {string | undefined} value
 */
export function parseFrameRate(value) {
  if (!value || value === '0/0') return 30;
  const parts = value.split('/');
  if (parts.length === 2) {
    const num = Number(parts[0]);
    const den = Number(parts[1]);
    if (num > 0 && den > 0) return num / den;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}

/**
 * @param {File} file
 * @returns {Promise<{ width: number, height: number, duration: number }>}
 */
export function probeVideoMetadata(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);

    video.preload = 'metadata';
    video.playsInline = true;
    video.muted = true;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: Number.isFinite(video.duration) ? video.duration : 0
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Не удалось прочитать видео'));
    };

    video.src = objectUrl;
  });
}

/**
 * @param {number} ms
 */
export function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
