import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import gsap from 'gsap';
import {
  formatScheduleDayWheelLabel,
  formatScheduleSendLabel,
  generateNextDays,
  isSameDay
} from '../../lib/format';
import { useOverlayClose } from '../../hooks/useOverlayClose';
import './Feed.css';

const ITEM_H = 40;
const VISIBLE = 5;
const PAD = Math.floor(VISIBLE / 2);

/**
 * @param {{
 *   items: Array<{ key: string, label: string }>,
 *   selectedKey: string,
 *   onChange: (key: string) => void,
 *   'aria-label'?: string
 * }} props
 */
function WheelColumn({ items, selectedKey, onChange, 'aria-label': ariaLabel }) {
  const scrollerRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const lockRef = useRef(false);
  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.key === selectedKey)
  );

  const scrollToIndex = useCallback((index, smooth) => {
    const el = scrollerRef.current;
    if (!el) return;
    const top = index * ITEM_H;
    if (smooth) {
      el.scrollTo({ top, behavior: 'smooth' });
    } else {
      el.scrollTop = top;
    }
  }, []);

  useEffect(() => {
    scrollToIndex(selectedIndex, false);
  }, [selectedIndex, scrollToIndex]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;

    let settleTimer = 0;
    const onScroll = () => {
      if (lockRef.current) return;
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        const idx = Math.round(el.scrollTop / ITEM_H);
        const clamped = Math.max(0, Math.min(items.length - 1, idx));
        scrollToIndex(clamped, true);
        const next = items[clamped];
        if (next && next.key !== selectedKey) onChange(next.key);
      }, 80);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.clearTimeout(settleTimer);
    };
  }, [items, onChange, scrollToIndex, selectedKey]);

  return (
    <div className="schedule-wheel__col" aria-label={ariaLabel}>
      <div
        ref={scrollerRef}
        className="schedule-wheel__scroller"
        style={{ height: ITEM_H * VISIBLE }}
      >
        <div style={{ height: ITEM_H * PAD }} aria-hidden="true" />
        {items.map((item, index) => (
          <button
            key={item.key}
            type="button"
            className={clsx(
              'schedule-wheel__item',
              item.key === selectedKey && 'is-selected'
            )}
            style={{ height: ITEM_H }}
            onClick={() => {
              lockRef.current = true;
              onChange(item.key);
              scrollToIndex(index, true);
              window.setTimeout(() => {
                lockRef.current = false;
              }, 280);
            }}
          >
            {item.label}
          </button>
        ))}
        <div style={{ height: ITEM_H * PAD }} aria-hidden="true" />
      </div>
    </div>
  );
}

/**
 * Bottom-sheet выбора даты/времени отправки (Telegram-style wheel).
 *
 * @param {{
 *   isOpen: boolean,
 *   initialDate?: Date | null,
 *   onClose: () => void,
 *   onConfirm: (date: Date) => void
 * }} props
 */
export default function ScheduleDateTimeSheet({
  isOpen,
  initialDate = null,
  onClose,
  onConfirm
}) {
  const sheetRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const backdropRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [mounted, setMounted] = useState(false);
  const [dayKey, setDayKey] = useState('');
  const [hour, setHour] = useState(0);
  const [minute, setMinute] = useState(0);

  useOverlayClose(isOpen, onClose, 'schedule-datetime-sheet');

  const days = useMemo(() => generateNextDays(60), []);

  const dayItems = useMemo(
    () =>
      days.map((d) => ({
        key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
        label: formatScheduleDayWheelLabel(d),
        date: d
      })),
    [days]
  );

  const hourItems = useMemo(
    () =>
      Array.from({ length: 24 }, (_, h) => ({
        key: String(h),
        label: String(h).padStart(2, '0')
      })),
    []
  );

  const minuteItems = useMemo(
    () =>
      Array.from({ length: 60 }, (_, m) => ({
        key: String(m),
        label: String(m).padStart(2, '0')
      })),
    []
  );

  useEffect(() => {
    if (!isOpen) return;
    const base = initialDate && !Number.isNaN(initialDate.getTime())
      ? new Date(initialDate)
      : (() => {
          const d = new Date();
          d.setMinutes(d.getMinutes() + 30);
          d.setSeconds(0, 0);
          return d;
        })();

    const match = dayItems.find((item) => isSameDay(item.date, base)) || dayItems[0];
    setDayKey(match.key);
    setHour(base.getHours());
    setMinute(base.getMinutes());
    setMounted(true);
  }, [isOpen, initialDate, dayItems]);

  useEffect(() => {
    if (!mounted) return undefined;
    const sheet = sheetRef.current;
    const backdrop = backdropRef.current;
    if (!sheet || !backdrop) return undefined;

    if (isOpen) {
      gsap.killTweensOf([sheet, backdrop]);
      gsap.set(backdrop, { opacity: 0 });
      gsap.set(sheet, { y: '100%' });
      gsap.to(backdrop, { opacity: 1, duration: 0.28, ease: 'power2.out' });
      gsap.to(sheet, { y: 0, duration: 0.38, ease: 'power3.out' });
      return undefined;
    }

    const tl = gsap.timeline({
      onComplete: () => setMounted(false)
    });
    tl.to(sheet, { y: '100%', duration: 0.28, ease: 'power2.in' }, 0);
    tl.to(backdrop, { opacity: 0, duration: 0.22, ease: 'power1.in' }, 0);
    return () => {
      tl.kill();
    };
  }, [isOpen, mounted]);

  const selectedDate = useMemo(() => {
    const day = dayItems.find((item) => item.key === dayKey)?.date || days[0];
    const next = new Date(day);
    next.setHours(hour, minute, 0, 0);
    return next;
  }, [dayItems, dayKey, days, hour, minute]);

  const confirmLabel = `Отправить ${formatScheduleSendLabel(selectedDate)}`;
  const canConfirm = selectedDate.getTime() > Date.now() - 30_000;

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div className="schedule-sheet-root" role="presentation">
      <div
        ref={backdropRef}
        className="schedule-sheet-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        className="schedule-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Отправить позже"
      >
        <header className="schedule-sheet__header">
          <h2 className="schedule-sheet__title">Отправить позже</h2>
        </header>

        <div className="schedule-wheel" aria-label="Дата и время">
          <div className="schedule-wheel__highlight" aria-hidden="true" />
          <WheelColumn
            items={dayItems}
            selectedKey={dayKey}
            onChange={setDayKey}
            aria-label="День"
          />
          <WheelColumn
            items={hourItems}
            selectedKey={String(hour)}
            onChange={(key) => setHour(Number(key))}
            aria-label="Часы"
          />
          <WheelColumn
            items={minuteItems}
            selectedKey={String(minute)}
            onChange={(key) => setMinute(Number(key))}
            aria-label="Минуты"
          />
        </div>

        <button
          type="button"
          className="schedule-sheet__confirm"
          disabled={!canConfirm}
          onClick={() => {
            if (!canConfirm) return;
            onConfirm(selectedDate);
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </div>,
    document.body
  );
}
