// @ts-check
import { PB_URL } from '../config';
import pb from './pb';
import { error } from '../lib/log';

/**
 * @typedef {{
 *   source: string,
 *   publicUrl: string,
 *   publicKey?: string,
 *   name: string,
 *   mediaType: 'image' | 'video',
 *   mimeType?: string,
 *   size?: number | null,
 *   previewUrl?: string | null,
 *   fileUrl?: string | null
 * }} YadiskPreviewItem
 */

/**
 * @param {string} url
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<YadiskPreviewItem>}
 */
export async function fetchYadiskPreview(url, { signal } = {}) {
  const res = await fetch(`${PB_URL}/api/yadisk-preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(pb.authStore.token ? { Authorization: pb.authStore.token } : {})
    },
    body: JSON.stringify({ url }),
    signal
  });

  /** @type {{ error?: string } & Partial<YadiskPreviewItem>} */
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const message = data.error || `Ошибка Яндекс.Диска (${res.status})`;
    error('yadisk preview:', message);
    throw new Error(message);
  }

  return /** @type {YadiskPreviewItem} */ (data);
}

/**
 * Скачивает preview/file через наш прокси (с Authorization) → blob URL для &lt;img&gt;/&lt;video&gt;.
 *
 * @param {string} publicUrl
 * @param {'preview' | 'file'} [kind]
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<string>}
 */
export async function fetchYadiskObjectUrl(publicUrl, kind = 'preview', { signal } = {}) {
  const qs = new URLSearchParams({
    url: publicUrl,
    kind
  });
  const res = await fetch(`${PB_URL}/api/yadisk-content?${qs}`, {
    headers: {
      ...(pb.authStore.token ? { Authorization: pb.authStore.token } : {})
    },
    signal
  });

  if (!res.ok) {
    /** @type {{ error?: string }} */
    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    const message = data.error || `Не удалось загрузить файл (${res.status})`;
    error('yadisk content:', message);
    throw new Error(message);
  }

  const blob = await res.blob();
  if (!blob || blob.size === 0) {
    throw new Error('Пустой ответ Яндекс.Диска');
  }
  return URL.createObjectURL(blob);
}
