// @ts-check
import pb from './pb';

/**
 * @param {'bot' | 'app'} channel
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function listSystemTemplates(channel) {
  const res = await pb.send(`/api/system-templates?channel=${encodeURIComponent(channel)}`, {
    method: 'GET'
  });
  return /** @type {Array<Record<string, unknown>>} */ (res?.items || []);
}

/**
 * @param {{
 *   id: string,
 *   title?: string,
 *   body?: string,
 *   action_label?: string,
 *   enabled?: boolean
 * }} patch
 */
export async function updateSystemTemplate(patch) {
  return pb.send('/api/system-templates-update', {
    method: 'POST',
    body: patch
  });
}
