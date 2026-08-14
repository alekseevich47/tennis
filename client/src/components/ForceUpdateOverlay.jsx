import React, { useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useOverlayClose } from '../hooks/useOverlayClose'
import './ForceUpdateOverlay.css'

function hardReload() {
  const url = new URL(window.location.href)
  url.searchParams.set('_v', String(Date.now()))
  window.location.replace(url.toString())
}

/**
 * Незакрываемый оверлей: на сервере новая сборка, webview держит старый JS.
 * ⋯ MAX → «Обновить», либо кнопка (reload). Back не закрывает.
 *
 * @param {{ open: boolean }} props
 */
export default function ForceUpdateOverlay({ open }) {
  const swallow = useCallback(() => {}, [])
  useOverlayClose(open, swallow, 'force-update')

  if (!open) return null

  return createPortal(
    <div
      className="force-update-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="force-update-title"
      aria-describedby="force-update-desc"
    >
      <div className="force-update-card">
        <h2 id="force-update-title" className="force-update-title">
          Доступна новая версия
        </h2>
        <p id="force-update-desc" className="force-update-text">
          Чтобы продолжить, обновите приложение: нажмите ⋯ справа сверху
          и выберите «Обновить».
        </p>
        <button type="button" className="force-update-btn" onClick={hardReload}>
          Обновить
        </button>
      </div>
    </div>,
    document.body
  )
}
