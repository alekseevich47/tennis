import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { getMediaThumbUrl, isVideoMediaName, mediaNames } from '../../lib/media';
import { normalizeExternalMedia } from '../../lib/yadisk';
import { fetchYadiskObjectUrl, fetchYadiskPreview } from '../../services/yadisk';
import { getYadiskAlbumCache } from './yadiskAlbumCache';
import { getCachedMemberBytes, setCachedMemberBytes } from './yadiskMediaSessionCache';
import PostContentHtml from './PostContentHtml';
import { getFirstLine } from './postRichText';
import './Feed.css';

const CROSSFADE_MS = 200;

/**
 * PB-thumb или первое фото Яндекс.Диска (файл / обложка альбома) в формате плашки.
 * @param {{ media?: string | string[], external_media?: unknown, id?: string } | null | undefined} post
 * @param {'posts' | 'tournament_posts'} collection
 * @returns {string | null}
 */
function usePinnedThumbUrl(post, collection) {
  const mediaName = mediaNames(post?.media).find((name) => !isVideoMediaName(name));
  const pbUrl =
    mediaName && post
      ? getMediaThumbUrl(post, collection, mediaName, '400x0')
      : null;
  const [yadiskUrl, setYadiskUrl] = useState(/** @type {string | null} */ (null));
  const postId = post?.id || '';
  const externalKey = JSON.stringify(post?.external_media || []);

  useEffect(() => {
    if (pbUrl) {
      setYadiskUrl(null);
      return undefined;
    }

    const stored = normalizeExternalMedia(post?.external_media);
    if (!stored.length) {
      setYadiskUrl(null);
      return undefined;
    }

    const ac = new AbortController();
    let cancelled = false;

    const resolveBlob = async (publicUrl, path, isVideo, name) => {
      const cached = getCachedMemberBytes(publicUrl, path);
      if (cached?.previewUrl) return cached.previewUrl;
      const blobUrl = await fetchYadiskObjectUrl(publicUrl, 'preview', {
        signal: ac.signal,
        path
      });
      setCachedMemberBytes(publicUrl, path, {
        previewUrl: blobUrl,
        fileUrl: null,
        isVideo: Boolean(isVideo),
        name: name || 'media',
        displayUrl: blobUrl
      });
      return blobUrl;
    };

    void (async () => {
      for (const entry of stored) {
        if (entry.type === 'album') {
          const cachedAlbum = getYadiskAlbumCache(entry.publicUrl);
          const cachedPhoto = cachedAlbum?.find(
            (item) => !item.isVideo && (item.thumbUrl || item.previewUrl || item.url)
          );
          if (cachedPhoto) {
            const url =
              getCachedMemberBytes(cachedPhoto.publicUrl || entry.publicUrl, cachedPhoto.path)
                ?.previewUrl ||
              cachedPhoto.thumbUrl ||
              cachedPhoto.previewUrl ||
              cachedPhoto.url;
            if (url) {
              if (!cancelled) setYadiskUrl(url);
              return;
            }
          }

          try {
            const album = await fetchYadiskPreview(entry.publicUrl, { signal: ac.signal });
            if (cancelled) return;
            const members = Array.isArray(album.items) ? album.items : [];
            const cover =
              album.cover && album.cover.mediaType !== 'video' ? album.cover : null;
            const firstPhoto =
              cover ||
              members.find((member) => member.mediaType !== 'video') ||
              null;
            if (!firstPhoto) continue;
            const url = await resolveBlob(
              entry.publicUrl,
              firstPhoto.path || null,
              false,
              firstPhoto.name || entry.name
            );
            if (!cancelled) setYadiskUrl(url);
            return;
          } catch {
            continue;
          }
        }

        if (entry.mediaType === 'video') continue;

        try {
          const url = await resolveBlob(
            entry.publicUrl,
            entry.path || null,
            false,
            entry.name
          );
          if (!cancelled) setYadiskUrl(url);
          return;
        } catch {
          continue;
        }
      }

      if (!cancelled) setYadiskUrl(null);
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [pbUrl, postId, externalKey, post?.external_media]);

  return pbUrl || yadiskUrl;
}

/**
 * Sticky-плашка закреплённых публикаций (Лента / Турнир-Лента).
 * Показывает «следующий» закреп (куда ведёт клик); клик — фокус на него + сдвиг на следующий по кругу.
 *
 * @param {{
 *   pinnedPosts: Array<{ id: string, content?: string, text?: string, media?: string | string[], external_media?: unknown }>,
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

  const displayIndex = count > 0 ? (shownIndex < count ? shownIndex : safeIndex) : 0;
  const post = count > 0 ? pinnedPosts[displayIndex] : null;
  const thumbUrl = usePinnedThumbUrl(post, collection);
  const firstLineHtml = getFirstLine(post?.content || post?.text || '');

  if (count === 0 || !post) return null;

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
