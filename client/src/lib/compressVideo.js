// @ts-check
import { error } from './log';

export {
  VIDEO_MAX_BOX_W,
  VIDEO_MAX_BOX_H,
  VIDEO_CRF,
  VIDEO_AUDIO_BITRATE,
  isPreparedVideoFile
} from './videoCompressShared';

/**
 * @returns {boolean}
 */
function isWebCodecsCompressionAvailable() {
  return (
    typeof VideoEncoder !== 'undefined'
    && typeof VideoDecoder !== 'undefined'
    && typeof AudioEncoder !== 'undefined'
    && typeof AudioDecoder !== 'undefined'
  );
}

/**
 * Сжимает видео: WebCodecs + mp4-muxer (primary), ffmpeg.wasm (fallback).
 *
 * @param {File} file
 * @param {{ onProgress?: (percent: number) => void, signal?: AbortSignal }} [options]
 * @returns {Promise<File>}
 */
export async function compressVideo(file, { onProgress, signal } = {}) {
  if (isWebCodecsCompressionAvailable()) {
    try {
      const { compressVideoWebCodecs } = await import('./compressVideoWebCodecs');
      return await compressVideoWebCodecs(file, { onProgress, signal });
    } catch (err) {
      if (signal?.aborted || err?.name === 'AbortError') throw err;
      error('compressVideo WebCodecs failed, fallback to ffmpeg:', err);
    }
  }

  const { compressVideoFfmpeg } = await import('./compressVideoFfmpeg');
  return compressVideoFfmpeg(file, { onProgress, signal });
}
