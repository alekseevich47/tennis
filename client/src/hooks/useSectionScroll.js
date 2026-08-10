// @ts-check
import { useEffect } from 'react';
import { setSectionScrollElement } from '../lib/sectionScroll';

/**
 * Регистрирует DOM-элемент как скролл текущего раздела (пока компонент смонтирован).
 * @param {React.RefObject<HTMLElement | null>} scrollRef
 * @param {boolean} [enabled=true]
 */
export function useSectionScroll(scrollRef, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const el = scrollRef?.current;
    if (!el) return undefined;
    return setSectionScrollElement(el);
  }, [scrollRef, enabled]);
}
