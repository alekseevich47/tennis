import React, { memo } from 'react';

/**
 * Бейдж альбома: 3 контурных прямоугольника в правом нижнем углу.
 *
 * @param {{ className?: string }} [props]
 */
function AlbumStackBadge({ className }) {
  return (
    <span
      className={['album-stack-badge', className].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      <span className="album-stack-badge__rect album-stack-badge__rect--back" />
      <span className="album-stack-badge__rect album-stack-badge__rect--mid" />
      <span className="album-stack-badge__rect album-stack-badge__rect--front" />
    </span>
  );
}

export default memo(AlbumStackBadge);
