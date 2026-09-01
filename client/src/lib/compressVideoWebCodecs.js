// @ts-check
import { WebDemuxer } from 'web-demuxer';
import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import { error } from './log';
import {
  AUDIO_TARGET_BITRATE,
  VIDEO_MAX_BOX_H,
  VIDEO_MAX_BOX_W,
  VIDEO_TARGET_BITRATE,
  delay,
  fitVideoDimensions,
  parseFrameRate,
  probeVideoMetadata,
  toOutputFilename
} from './videoCompressShared';

/**
 * @returns {boolean}
 */
export function isWebCodecsCompressionAvailable() {
  return (
    typeof VideoEncoder !== 'undefined'
    && typeof VideoDecoder !== 'undefined'
    && typeof AudioEncoder !== 'undefined'
    && typeof AudioDecoder !== 'undefined'
  );
}

/**
 * @param {number} width
 * @param {number} height
 * @param {number} bitrate
 * @param {number} framerate
 */
async function pickVideoEncoderConfig(width, height, bitrate, framerate) {
  const candidates = ['avc1.640028', 'avc1.4D0028', 'avc1.42001f'];

  for (const codec of candidates) {
    const config = { codec, width, height, bitrate, framerate };
    const support = await VideoEncoder.isConfigSupported(config);
    if (support.supported && support.config) return support.config;
  }

  throw new Error('H.264 VideoEncoder недоступен');
}

/**
 * @param {import('web-demuxer').WebDemuxer} demuxer
 * @param {Muxer<ArrayBufferTarget>} muxer
 * @param {number} targetW
 * @param {number} targetH
 * @param {number} frameRate
 * @param {number} duration
 * @param {AbortSignal | undefined} signal
 * @param {(percent: number) => void} [onProgress]
 */
async function transcodeVideoTrack(
  demuxer,
  muxer,
  targetW,
  targetH,
  frameRate,
  duration,
  signal,
  onProgress
) {
  const decoderConfig = await demuxer.getDecoderConfig('video');
  const encoderConfig = await pickVideoEncoderConfig(
    targetW,
    targetH,
    VIDEO_TARGET_BITRATE,
    frameRate
  );

  const canvas = new OffscreenCanvas(targetW, targetH);
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D недоступен');

  let frameIndex = 0;

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (err) => {
      throw err;
    }
  });
  encoder.configure({ ...encoderConfig, framerate: frameRate });

  /** @type {Promise<void>} */
  let frameChain = Promise.resolve();

  const decoder = new VideoDecoder({
    output: (frame) => {
      frameChain = frameChain.then(async () => {
        signal?.throwIfAborted();

        ctx.drawImage(frame, 0, 0, targetW, targetH);
        const timestamp = frame.timestamp;
        const frameDuration = frame.duration ?? Math.round(1_000_000 / frameRate);
        frame.close();

        while (encoder.encodeQueueSize > 6) {
          await delay(4);
          signal?.throwIfAborted();
        }

        const scaled = new VideoFrame(canvas, {
          timestamp,
          duration: frameDuration
        });

        encoder.encode(scaled, {
          keyFrame: frameIndex === 0 || frameIndex % Math.max(1, Math.round(frameRate * 2)) === 0
        });
        scaled.close();
        frameIndex += 1;

        if (duration > 0) {
          onProgress?.(Math.min(98, (timestamp / 1_000_000 / duration) * 100));
        }
      });
    },
    error: (err) => {
      throw err;
    }
  });
  decoder.configure(decoderConfig);

  const stream = demuxer.read('video');
  const reader = stream.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    signal?.throwIfAborted();
    decoder.decode(value);
  }

  await decoder.flush();
  decoder.close();
  await frameChain;
  await encoder.flush();
  encoder.close();
}

/**
 * @param {import('web-demuxer').WebDemuxer} demuxer
 * @param {Muxer<ArrayBufferTarget>} muxer
 * @param {{ channels?: number, sample_rate?: number, codec_name?: string }} audioStream
 * @param {number} duration
 * @param {AbortSignal | undefined} signal
 * @param {(percent: number) => void} [onProgress]
 */
async function transcodeAudioTrack(
  demuxer,
  muxer,
  audioStream,
  duration,
  signal,
  onProgress
) {
  const decoderConfig = await demuxer.getDecoderConfig('audio');
  const channels = audioStream.channels || decoderConfig.numberOfChannels || 2;
  const sampleRate = audioStream.sample_rate || decoderConfig.sampleRate || 44100;

  const encoderConfig = {
    codec: 'mp4a.40.2',
    numberOfChannels: channels,
    sampleRate,
    bitrate: AUDIO_TARGET_BITRATE
  };

  const support = await AudioEncoder.isConfigSupported(encoderConfig);
  if (!support.supported || !support.config) {
    throw new Error('AAC AudioEncoder недоступен');
  }

  const encoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (err) => {
      throw err;
    }
  });
  encoder.configure(support.config);

  /** @type {Promise<void>} */
  let audioChain = Promise.resolve();

  const decoder = new AudioDecoder({
    output: (data) => {
      audioChain = audioChain.then(async () => {
        signal?.throwIfAborted();
        while (encoder.encodeQueueSize > 8) {
          await delay(4);
          signal?.throwIfAborted();
        }
        encoder.encode(data);
        data.close();
      });
    },
    error: (err) => {
      throw err;
    }
  });
  decoder.configure(decoderConfig);

  const stream = demuxer.read('audio');
  const reader = stream.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    signal?.throwIfAborted();
    decoder.decode(value);
    if (duration > 0 && value.timestamp) {
      onProgress?.(Math.min(99, (value.timestamp / 1_000_000 / duration) * 100));
    }
  }

  await decoder.flush();
  decoder.close();
  await audioChain;
  await encoder.flush();
  encoder.close();
}

/**
 * WebCodecs + web-demuxer + mp4-muxer.
 *
 * @param {File} file
 * @param {{ onProgress?: (percent: number) => void, signal?: AbortSignal }} [options]
 * @returns {Promise<File>}
 */
export async function compressVideoWebCodecs(file, { onProgress, signal } = {}) {
  if (!isWebCodecsCompressionAvailable()) {
    throw new Error('WebCodecs недоступен');
  }

  signal?.throwIfAborted();
  onProgress?.(1);

  const probe = await probeVideoMetadata(file);
  const { width: targetW, height: targetH } = fitVideoDimensions(
    probe.width,
    probe.height,
    VIDEO_MAX_BOX_W,
    VIDEO_MAX_BOX_H
  );

  const wasmBase = `${import.meta.env.BASE_URL}web-demuxer`.replace(/\/?$/, '/');
  const demuxer = new WebDemuxer({
    wasmFilePath: `${wasmBase}web-demuxer-mini.wasm`
  });

  try {
    await demuxer.load(file);
    signal?.throwIfAborted();
    onProgress?.(4);

    const mediaInfo = await demuxer.getMediaInfo();
    const duration = mediaInfo.duration || probe.duration || 1;
    const videoStream = mediaInfo.streams?.find((stream) => stream.codec_type_string === 'video');
    const audioStream = mediaInfo.streams?.find((stream) => stream.codec_type_string === 'audio');
    const frameRate = parseFrameRate(videoStream?.r_frame_rate);

    /** @type {import('mp4-muxer').MuxerOptions<ArrayBufferTarget>} */
    const muxerOptions = {
      target: new ArrayBufferTarget(),
      video: {
        codec: 'avc',
        width: targetW,
        height: targetH,
        frameRate
      },
      fastStart: 'in-memory',
      firstTimestampBehavior: 'offset'
    };

    if (audioStream) {
      muxerOptions.audio = {
        codec: 'aac',
        numberOfChannels: audioStream.channels || 2,
        sampleRate: audioStream.sample_rate || 44100
      };
    }

    const muxer = new Muxer(muxerOptions);

    await transcodeVideoTrack(
      demuxer,
      muxer,
      targetW,
      targetH,
      frameRate,
      duration,
      signal,
      (percent) => onProgress?.(Math.round(4 + percent * 0.76))
    );

    if (audioStream) {
      await transcodeAudioTrack(
        demuxer,
        muxer,
        audioStream,
        duration,
        signal,
        (percent) => onProgress?.(Math.round(80 + percent * 0.18))
      );
    }

    muxer.finalize();
    onProgress?.(100);

    const buffer = muxer.target.buffer;
    if (!buffer) throw new Error('Пустой результат muxer');

    return new File([buffer], toOutputFilename(file.name), {
      type: 'video/mp4',
      lastModified: Date.now()
    });
  } catch (err) {
    if (signal?.aborted) {
      throw new DOMException('Подготовка видео отменена', 'AbortError');
    }
    error('compressVideoWebCodecs:', err);
    throw err;
  } finally {
    demuxer.destroy();
  }
}
