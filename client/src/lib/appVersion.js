// @ts-check

/** Git short hash текущего бандла — для сверки с /version.json. */
export const APP_BUILD = String(import.meta.env.VITE_APP_VERSION || '').trim()

/** Человекочитаемая версия из client/package.json (например 1.0.0). */
export const APP_DISPLAY_VERSION = String(import.meta.env.VITE_APP_DISPLAY_VERSION || '').trim()

const BASE = import.meta.env.BASE_URL || '/'

/** URL манифеста на сервере — не кэшировать. */
export function getVersionManifestUrl() {
  const base = BASE.endsWith('/') ? BASE : `${BASE}/`
  return `${base}version.json`
}

/**
 * @returns {Promise<string | null>}
 */
export async function fetchRemoteAppVersion() {
  const url = `${getVersionManifestUrl()}?t=${Date.now()}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null
  const data = await res.json()
  const version = typeof data?.version === 'string' ? data.version.trim() : ''
  return version || null
}
