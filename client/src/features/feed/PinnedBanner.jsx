import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { getMediaThumbUrl, isVideoMediaName, mediaNames } from '../../lib/media';
import PostContentHtml from './PostContentHtml';
import { getFirstLine } from './postRichText';
import './Feed.css';

const CROSSFADE_MS = 200;

/**
 * Sticky-плашка закреплённых публикаций (Лента / Турнир-Лента).
 * Показывает «следующий» закреп (куда ведёт клик); клик — фокус на него + сдвиг на следующий по кругу.
 *
 * @param {{
 *   pinnedPosts: Array<{ id: string, content?: string, text?: string, media?: string | string[] }>,
 *   collection?: 'posts' | 'tournament_posts',
 *   activeIndex?: number,
 *   onAdvance?: () => void,
 *   onOpen?: (post: any) => void
 * }} props
 */
export default function PinnedBanner({
  pinnedPosts = [],
  collection = 'posts',
  activeIndex = 0,
  onOpen
}) {
  const count = pinnedPosts.length;
  const safeIndex = count > 0 ? ((activeIndex % count) + count) % count : 0;
  const [shownIndex, setShownIndex] = useState(safeIndex);
  const [animClass, setAnimClass] = useState('is-enter');
  const lastChangeAtRef = useRef(0);

  useEffect(() => {
    if (count === 0) return undefined;
    if (shownIndex >= count) {
      setShownIndex(safeIndex);
      setAnimClass('is-enter');
      return undefined;
    }
    // Быстрый скролл может отменить exit-таймер и вернуть индекс к shownIndex —
    // без сброса is-exit текст остаётся opacity:0 (плашка «пустая»).
    if (safeIndex === shownIndex) {
      setAnimClass('is-enter');
      return undefined;
    }

    const now = Date.now();
    const rapid = now - lastChangeAtRef.current < CROSSFADE_MS + 40;
    lastChangeAtRef.current = now;

    // При частых сменах индекса пропускаем exit — иначе текст висит прозрачным.
    if (rapid) {
      setShownIndex(safeIndex);
      setAnimClass('is-enter');
      return undefined;
    }

    setAnimClass('is-exit');
    const t = window.setTimeout(() => {
      setShownIndex(safeIndex);
      setAnimClass('is-enter');
    }, CROSSFADE_MS);
    return () => window.clearTimeout(t);
  }, [safeIndex, shownIndex, count]);

  if (count === 0) return null;

  const displayIndex = shownIndex < count ? shownIndex : safeIndex;
  const post = pinnedPosts[displayIndex];
  const mediaName = mediaNames(post?.media)[0];
  const thumbUrl =
    mediaName && !isVideoMediaName(mediaName)
      ? getMediaThumbUrl(post, collection, mediaName, '400x0')
      : null;
  const firstLineHtml = getFirstLine(post?.content || post?.text || '');

  const handleClick = () => {
    const current = pinnedPosts[safeIndex];
    if (!current) return;
    // openPinned сам сдвигает индекс на следующий — без отдельного onAdvance,
    // иначе возможен двойной шаг.
    onOpen?.(current);
  };

  return (
    <button
      type="button"
      className="pinned-banner"
      onClick={handleClick}
      aria-label="Закреплённое сообщение"
    >
      <div className="pinned-banner__body">
        <div className="pinned-banner__segments" aria-hidden="true">
          {pinnedPosts.map((item, index) => (
            <span
              key={item.id || index}
              className={clsx(
                'pinned-banner__segment',
                index === safeIndex && 'pinned-banner__segment--active'
              )}
            />
          ))}
        </div>

        {thumbUrl ? (
          <img src={thumbUrl} alt="" className="pinned-banner__thumb" />
        ) : null}

        <div
          className={clsx(
            'pinned-banner__text',
            animClass === 'is-exit' && 'pinned-banner__text--exit',
            animClass === 'is-enter' && 'pinned-banner__text--enter'
          )}
        >
          <span className="pinned-banner__label">Закреплённое сообщение</span>
          {firstLineHtml ? (
            <PostContentHtml
              as="span"
              className="pinned-banner__preview"
              content={firstLineHtml}
            />
          ) : (
            <span className="pinned-banner__preview pinned-banner__preview--empty" />
          )}
        </div>
      </div>
    </button>
  );
}
