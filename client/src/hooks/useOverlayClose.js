// @ts-check
import { useEffect, useId, useRef } from 'react';
import { registerOverlay } from '../lib/overlayStack';

/**
 * Регистрирует `onClose` в глобальном стеке, пока `open === true`.
 * @param {boolean} open
 * @param {(() => void) | undefined | null} onClose
 * @param {string} [idSuffix]
 */
export function useOverlayClose(open, onClose, idSuffix = '') {
  const reactId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open || typeof onCloseRef.current !== 'function') return undefined;
    const id = `${reactId}${idSuffix ? `:${idSuffix}` : ''}`;
    return registerOverlay(id, () => {
      onCloseRef.current?.();
    });
  }, [open, reactId, idSuffix]);
}
