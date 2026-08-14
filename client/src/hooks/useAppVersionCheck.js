// @ts-check
import { useEffect, useState } from 'react'
import { APP_BUILD, fetchRemoteAppVersion } from '../lib/appVersion'
import { IS_DEV } from '../config'

const POLL_MS = 60_000

/**
 * Сверяет запечённую версию бандла с `/version.json` на сервере.
 * В DEV не блокирует. Сеть упала — не блокирует.
 * @returns {boolean} true — нужна принудительная перезагрузка
 */
export function useAppVersionCheck() {
  const [stale, setStale] = useState(false)

  useEffect(() => {
    if (IS_DEV || !APP_BUILD || APP_BUILD === 'dev') return undefined

    let cancelled = false

    const check = async () => {
      try {
        const remote = await fetchRemoteAppVersion()
        if (cancelled || !remote) return
        if (remote !== APP_BUILD) setStale(true)
      } catch {
        // fail-open
      }
    }

    check()
    const id = window.setInterval(check, POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', check)

    return () => {
      cancelled = true
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', check)
    }
  }, [])

  return stale
}
