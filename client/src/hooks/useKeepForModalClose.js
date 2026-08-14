import { useEffect, useRef, useState } from 'react';
import { MODAL_CLOSE_MS } from '../lib/modalOrigin';

/**
 * Держит последнее ненулевое value, пока модалка закрывается (isOpen → false),
 * чтобы `Modal` успел отыграть схлапывание до `if (!data) return null`.
 *
 * @template T
 * @param {boolean} isOpen
 * @param {T | null | undefined} value
 * @returns {T | null | undefined}
 */
export function useKeepForModalClose(isOpen, value) {
  const [kept, setKept] = useState(value);
  const timerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));

  useEffect(() => {
    if (value != null) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setKept(value);
    }
  }, [value]);

  useEffect(() => {
    if (isOpen) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return undefined;
    }
    if (kept == null) return undefined;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setKept(null);
    }, MODAL_CLOSE_MS + 30);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOpen, kept]);

  return isOpen ? value ?? kept : kept;
}
