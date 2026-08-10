import React from 'react';
import clsx from 'clsx';
import './Skeleton.css';

/**
 * @param {{ className?: string, style?: React.CSSProperties }} props
 */
export function SkeletonBone({ className, style }) {
  return <span className={clsx('ui-skeleton-bone', className)} style={style} aria-hidden="true" />;
}

/**
 * @param {{ count?: number, className?: string }} props
 */
export function FeedListSkeleton({ count = 3, className }) {
  return (
    <div className={clsx('ui-skeleton-list', className)} role="status" aria-label="Загрузка">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="ui-skeleton-card ui-skeleton-card--feed">
          <div className="ui-skeleton-card__row">
            <SkeletonBone className="ui-skeleton-avatar" />
            <div className="ui-skeleton-card__meta">
              <SkeletonBone className="ui-skeleton-line ui-skeleton-line--sm" />
              <SkeletonBone className="ui-skeleton-line ui-skeleton-line--xs" />
            </div>
          </div>
          <SkeletonBone className="ui-skeleton-line" />
          <SkeletonBone className="ui-skeleton-line ui-skeleton-line--short" />
          <SkeletonBone className="ui-skeleton-media" />
        </div>
      ))}
    </div>
  );
}

/**
 * @param {{ count?: number, className?: string }} props
 */
export function TrainingListSkeleton({ count = 3, className }) {
  return (
    <div className={clsx('ui-skeleton-list', className)} role="status" aria-label="Загрузка">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="ui-skeleton-card ui-skeleton-card--training">
          <SkeletonBone className="ui-skeleton-line ui-skeleton-line--sm" />
          <SkeletonBone className="ui-skeleton-line" />
          <SkeletonBone className="ui-skeleton-line ui-skeleton-line--short" />
        </div>
      ))}
    </div>
  );
}

/**
 * @param {{ count?: number, className?: string }} props
 */
export function ShopGridSkeleton({ count = 6, className }) {
  return (
    <div className={clsx('ui-skeleton-grid', className)} role="status" aria-label="Загрузка">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="ui-skeleton-card ui-skeleton-card--product">
          <SkeletonBone className="ui-skeleton-media ui-skeleton-media--square" />
          <SkeletonBone className="ui-skeleton-line ui-skeleton-line--sm" />
          <SkeletonBone className="ui-skeleton-line ui-skeleton-line--xs" />
        </div>
      ))}
    </div>
  );
}

/**
 * @param {{ count?: number, className?: string }} props
 */
export function RatingListSkeleton({ count = 8, className }) {
  return (
    <div className={clsx('ui-skeleton-list', className)} role="status" aria-label="Загрузка">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="ui-skeleton-card ui-skeleton-card--rating">
          <SkeletonBone className="ui-skeleton-line ui-skeleton-line--rank" />
          <SkeletonBone className="ui-skeleton-avatar ui-skeleton-avatar--sm" />
          <SkeletonBone className="ui-skeleton-line ui-skeleton-line--grow" />
          <SkeletonBone className="ui-skeleton-line ui-skeleton-line--points" />
        </div>
      ))}
    </div>
  );
}
