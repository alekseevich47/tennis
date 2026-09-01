import React, { useMemo } from 'react';
import MediaPreviewGrid from './MediaPreviewGrid';
import PostContentHtml from './PostContentHtml';
import {
  getMediaThumbUrl,
  getMediaUrl,
  isVideoMediaName,
  mediaNames,
  MEDIA_CARD_THUMB,
  MEDIA_LQIP_THUMB
} from '../../lib/media';

/**
 * Текст + медиа комментария с учётом caption_above.
 * @param {{
 *   comment: any,
 *   collection: 'comments' | 'tournament_comments',
 *   variant?: 'own' | 'other',
 *   onOpenMedia?: (items: any[], index: number, event: React.MouseEvent) => void
 * }} props
 */
export default function CommentMediaBody({ comment, collection, variant = 'other', onOpenMedia }) {
  const names = mediaNames(comment?.media);
  const items = useMemo(
    () =>
      names.flatMap((filename) => {
        const fullUrl = getMediaUrl(comment, collection, filename);
        const previewUrl =
          getMediaThumbUrl(comment, collection, filename, MEDIA_LQIP_THUMB) ||
          getMediaThumbUrl(comment, collection, filename);
        const cardUrl =
          getMediaThumbUrl(comment, collection, filename, MEDIA_CARD_THUMB) || fullUrl;
        if (!fullUrl) return [];
        return [
          {
            key: filename,
            url: cardUrl || previewUrl || fullUrl,
            previewUrl: previewUrl || cardUrl || fullUrl,
            fullUrl,
            name: filename,
            isVideo: isVideoMediaName(filename),
            status: 'ready'
          }
        ];
      }),
    [comment, collection, names]
  );

  const text = comment?.text || '';
  const captionAbove = Boolean(comment?.caption_above);
  const textNode = text ? (
    <PostContentHtml
      as="p"
      className={[
        'comment-content-text',
        variant === 'own' ? 'comment-content-text--own' : ''
      ]
        .filter(Boolean)
        .join(' ')}
      content={text}
    />
  ) : null;
  const mediaNode =
    items.length > 0 ? (
      <MediaPreviewGrid
        items={items}
        className="comment-media-grid"
        showCaption={false}
        progressive
        originKeyPrefix={`comment-${comment.id}`}
        onItemClick={
          onOpenMedia
            ? (item, index, event) => {
                const viewerItems = items.map((entry) => ({
                  ...entry,
                  url: entry.fullUrl || entry.url
                }));
                onOpenMedia(viewerItems, index, event);
              }
            : undefined
        }
      />
    ) : null;

  if (!textNode && !mediaNode) return null;

  return (
    <div className="comment-media-body">
      {captionAbove ? (
        <>
          {textNode}
          {mediaNode}
        </>
      ) : (
        <>
          {mediaNode}
          {textNode}
        </>
      )}
    </div>
  );
}
