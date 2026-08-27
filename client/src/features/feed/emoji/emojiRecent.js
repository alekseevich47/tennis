// @ts-check

const STORAGE_KEY = 'tennis_emoji_recent_v1';
const MAX_RECENT = 48;

/** @returns {string[]} */
export function readRecentEmojis() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item === 'string' && item.length > 0).slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

/** @param {string} emoji */
export function pushRecentEmoji(emoji) {
  if (!emoji || typeof emoji !== 'string') return;
  try {
    const prev = readRecentEmojis().filter((item) => item !== emoji);
    const next = [emoji, ...prev].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
}
