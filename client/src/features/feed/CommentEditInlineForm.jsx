import React, { useMemo, useState } from 'react';
import PostRichTextField from './PostRichTextField';
import SortableMediaPreviewGrid from './SortableMediaPreviewGrid';
import { findScrollParent, restoreAndKeepCommentEditInView } from './keepCommentEditInView';
import { hasVisibleText, toDisplayHtml } from './postRichText';
import { getMediaUrl, isVideoMediaName, mediaNames } from '../../lib/media';

/**
 * @param {string[]} left
 * @param {string[]} right
 */
function areStringArraysEqual(left, right) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

/**
 * @param {any} comment
 * @param {'comments' | 'tournament_comments'} collection
 */
function buildEditMediaItems(comment, collection) {
  return mediaNames(comment?.media).flatMap((filename) => {
    const url = getMediaUrl(comment, collection, filename);
    if (!url) return [];
    return [{
      key: `existing-${filename}`,
      filename,
      url,
      name: filename,
      isVideo: isVideoMediaName(filename)
    }];
  });
}

/**
 * @param {{
 *   comment: any,
 *   collection: 'comments' | 'tournament_comments',
 *   formRef?: React.Ref<HTMLFormElement>,
 *   fieldRef?: React.Ref<{ focus: () => void, clear: () => void }>,
 *   onSave: (payload: {
 *     text: string,
 *     orderedMedia: Array<{ filename: string, url: string }>,
 *     orderChanged: boolean,
 *     originalNames: string[]
 *   }) => void | Promise<void>,
 *   onCancel: () => void
 * }} props
 */
function CommentEditInlineForm({
  comment,
  collection,
  formRef,
  fieldRef,
  onSave,
  onCancel
}) {
  const originalHtml = useMemo(() => toDisplayHtml(comment?.text || ''), [comment]);
  const originalNames = useMemo(() => mediaNames(comment?.media), [comment]);

  const [text, setText] = useState(originalHtml);
  const [orderedMedia, setOrderedMedia] = useState(() => buildEditMediaItems(comment, collection));
  const scrollTopBeforeFocusRef = React.useRef(/** @type {number | null} */ (null));

  const currentNames = useMemo(
    () => orderedMedia.map((item) => item.filename),
    [orderedMedia]
  );
  const orderChanged = !areStringArraysEqual(currentNames, originalNames);
  const textChanged = text !== originalHtml;
  const hasChanges = textChanged || orderChanged;
  const canSave =
    hasChanges && (hasVisibleText(text) || orderedMedia.length > 0);

  const previewItems = useMemo(
    () =>
      orderedMedia.map((item) => ({
        key: item.key,
        url: item.url,
        name: item.name,
        isVideo: item.isVideo,
        status: 'ready'
      })),
    [orderedMedia]
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSave) return;
    void onSave({
      text,
      orderedMedia,
      orderChanged,
      originalNames
    });
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="comment-edit-inline-form"
      onPointerDownCapture={() => {
        const formEl = /** @type {HTMLFormElement | null} */ (
          formRef && typeof formRef === 'object' && 'current' in formRef ? formRef.current : null
        );
        const sp = findScrollParent(formEl);
        scrollTopBeforeFocusRef.current = sp?.scrollTop ?? null;
      }}
    >
      <label htmlFor={`edit-comment-${comment.id}`} className="visually-hidden">
        Редактирование комментария
      </label>
      <PostRichTextField
        ref={fieldRef}
        id={`edit-comment-${comment.id}`}
        value={text}
        onChange={setText}
        enableFrame={false}
        compact
        placeholder="Текст комментария…"
        aria-label="Редактирование комментария"
        onFocus={() => {
          const formEl = /** @type {HTMLFormElement | null} */ (
            formRef && typeof formRef === 'object' && 'current' in formRef ? formRef.current : null
          );
          restoreAndKeepCommentEditInView(formEl, scrollTopBeforeFocusRef.current);
        }}
      />
      {previewItems.length > 1 ? (
        <div className="comment-edit-inline-form__media">
          <SortableMediaPreviewGrid
            items={previewItems}
            layout="strip"
            className="comment-edit-media-strip"
            onReorder={(next) => {
              const byKey = new Map(orderedMedia.map((item) => [item.key, item]));
              setOrderedMedia(
                next.map((item) => byKey.get(item.key)).filter(Boolean)
              );
            }}
          />
        </div>
      ) : null}
      <div className="comment-edit-inline-form__actions">
        <button type="submit" disabled={!canSave}>
          Изменить
        </button>
        <button type="button" onClick={onCancel}>
          Отмена
        </button>
      </div>
    </form>
  );
}

export default CommentEditInlineForm;
