// @ts-check
import { compressImage } from './compress';

/**
 * @param {File} file
 * @returns {Promise<File>}
 */
export async function prepareUploadMedia(file) {
  if (file.type.startsWith('image/') && !/\.gif$/i.test(file.name)) {
    return compressImage(file);
  }
  return file;
}

/**
 * @param {File[]} files
 * @returns {Promise<File[]>}
 */
export async function prepareUploadMediaList(files) {
  return Promise.all(files.map((file) => prepareUploadMedia(file)));
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<Record<string, unknown>>}
 */
export async function prepareMediaInBody(body) {
  const media = body.media;
  if (!media) return body;

  const files = Array.isArray(media) ? media : [media];
  const fileList = files.filter((item) => item instanceof File);
  if (!fileList.length) return body;

  const prepared = await prepareUploadMediaList(fileList);

  return {
    ...body,
    media: Array.isArray(media) ? prepared : prepared[0]
  };
}
