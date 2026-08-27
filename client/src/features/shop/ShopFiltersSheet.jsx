import React, { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import Modal from '../../components/ui/Modal';
import { pluralize } from '../../lib/format';
import PriceRangeSlider from './PriceRangeSlider';
import {
  DEFAULT_SHOP_FILTERS,
  getPriceBounds,
  productMatchesFilters,
  resolvePriceRange
} from './shopFilters';
import './ShopFiltersSheet.css';

/**
 * @param {number} n
 */
function formatRub(n) {
  return `${Math.round(n).toLocaleString('ru-RU')} ₽`;
}

/**
 * Segment с анимированным thumb (slide left↔right).
 * @param {{
 *   left: string,
 *   right: string,
 *   value: 'left' | 'right' | null,
 *   onChange: (next: 'left' | 'right') => void,
 *   ariaLabel: string
 * }} props
 */
function SegmentToggle({ left, right, value, onChange, ariaLabel }) {
  return (
    <div
      className={clsx(
        'shop-filters-segment',
        value === 'left' && 'is-left',
        value === 'right' && 'is-right',
        value && 'has-value'
      )}
      role="group"
      aria-label={ariaLabel}
    >
      <span className="shop-filters-segment__thumb" aria-hidden="true" />
      <button
        type="button"
        className={clsx(
          'shop-filters-segment__btn',
          value === 'left' && 'is-active'
        )}
        aria-pressed={value === 'left'}
        onClick={() => onChange('left')}
      >
        {left}
      </button>
      <button
        type="button"
        className={clsx(
          'shop-filters-segment__btn',
          value === 'right' && 'is-active'
        )}
        aria-pressed={value === 'right'}
        onClick={() => onChange('right')}
      >
        {right}
      </button>
    </div>
  );
}

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   filters: import('./shopFilters').ShopFiltersState,
 *   onApply: (next: import('./shopFilters').ShopFiltersState) => void,
 *   products: import('../../services/catalog').ProductRecord[]
 * }} props
 */
export default function ShopFiltersSheet({
  isOpen,
  onClose,
  filters,
  onApply,
  products
}) {
  const [draft, setDraft] = useState(filters);

  const bounds = useMemo(() => getPriceBounds(products), [products]);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(filters);
  }, [isOpen, filters]);

  const range = resolvePriceRange(draft, bounds);

  const previewCount = useMemo(() => {
    return products.filter((product) => productMatchesFilters(product, draft, bounds)).length;
  }, [products, draft, bounds]);

  const patchDraft = useCallback((patch) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const handlePriceInputs = (side, raw) => {
    const digits = String(raw).replace(/[^\d]/g, '');
    if (digits === '') {
      if (side === 'min') patchDraft({ priceMin: bounds.min });
      else patchDraft({ priceMax: bounds.max });
      return;
    }
    const num = Number(digits);
    if (!Number.isFinite(num)) return;
    if (side === 'min') {
      patchDraft({ priceMin: Math.min(Math.max(num, bounds.min), range.max) });
    } else {
      patchDraft({ priceMax: Math.max(Math.min(num, bounds.max), range.min) });
    }
  };

  const handleReset = () => {
    setDraft({
      ...DEFAULT_SHOP_FILTERS,
      categoryId: filters.categoryId,
      priceMin: null,
      priceMax: null
    });
  };

  const handleApply = () => {
    const nextRange = resolvePriceRange(draft, bounds);
    const priceMin =
      nextRange.min <= bounds.min ? null : nextRange.min;
    const priceMax =
      nextRange.max >= bounds.max ? null : nextRange.max;
    onApply({
      ...draft,
      categoryId: filters.categoryId,
      priceMin,
      priceMax
    });
    onClose();
  };

  const nameToggleValue =
    draft.sort === 'name_asc' ? 'left' : draft.sort === 'name_desc' ? 'right' : null;
  const priceToggleValue =
    draft.sort === 'price_asc' ? 'left' : draft.sort === 'price_desc' ? 'right' : null;

  const showLabel = `Показать ${previewCount} ${pluralize(previewCount, 'товар', 'товара', 'товаров')}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Фильтры"
      ariaLabel="Фильтры магазина"
      overlayClassName="shop-filters-overlay"
      className="shop-filters-sheet"
      headerActions={(
        <button
          type="button"
          className="shop-filters-reset"
          onClick={handleReset}
        >
          Сбросить все
        </button>
      )}
      footer={(
        <button type="button" className="shop-filters-apply" onClick={handleApply}>
          {showLabel}
        </button>
      )}
    >
      <section className="shop-filters-section">
        <h3 className="shop-filters-section__title">Цена</h3>
        <div className="shop-filters-price-inputs">
          <label className="shop-filters-price-field">
            <span className="visually-hidden">Цена от</span>
            <input
              type="text"
              inputMode="numeric"
              value={formatRub(range.min)}
              onChange={(e) => handlePriceInputs('min', e.target.value)}
              onFocus={(e) => e.target.select()}
              aria-label="Цена от"
            />
          </label>
          <label className="shop-filters-price-field">
            <span className="visually-hidden">Цена до</span>
            <input
              type="text"
              inputMode="numeric"
              value={formatRub(range.max)}
              onChange={(e) => handlePriceInputs('max', e.target.value)}
              onFocus={(e) => e.target.select()}
              aria-label="Цена до"
            />
          </label>
        </div>
        <PriceRangeSlider
          min={bounds.min}
          max={bounds.max}
          valueMin={range.min}
          valueMax={range.max}
          step={bounds.max - bounds.min > 500 ? 50 : 1}
          onChange={({ min: nextMin, max: nextMax }) => {
            patchDraft({
              priceMin: nextMin,
              priceMax: nextMax
            });
          }}
        />
      </section>

      <section className="shop-filters-section shop-filters-section--sort">
        <h3 className="shop-filters-section__title">Сортировка</h3>

        <div className="shop-filters-sort-row">
          <div className="shop-filters-sort-row__meta">
            <span className="shop-filters-sort-row__icon" aria-hidden="true">Ая</span>
            <span className="shop-filters-sort-row__label">По названию</span>
          </div>
          <SegmentToggle
            left="Ая"
            right="Яа"
            value={nameToggleValue}
            ariaLabel="Сортировка по названию"
            onChange={(side) => {
              patchDraft({ sort: side === 'left' ? 'name_asc' : 'name_desc' });
            }}
          />
        </div>

        <div className="shop-filters-sort-row">
          <div className="shop-filters-sort-row__meta">
            <span className="shop-filters-sort-row__icon" aria-hidden="true">₽</span>
            <span className="shop-filters-sort-row__label">По цене</span>
          </div>
          <SegmentToggle
            left="₽↑"
            right="₽↓"
            value={priceToggleValue}
            ariaLabel="Сортировка по цене"
            onChange={(side) => {
              patchDraft({ sort: side === 'left' ? 'price_asc' : 'price_desc' });
            }}
          />
        </div>

        <div className="shop-filters-sort-row">
          <div className="shop-filters-sort-row__meta">
            <span className="shop-filters-sort-row__icon shop-filters-sort-row__icon--calendar" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.75" />
                <path d="M3 10h18M8 3v4M16 3v4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </span>
            <span className="shop-filters-sort-row__label">По новизне</span>
          </div>
          <button
            type="button"
            className={clsx(
              'shop-filters-chip',
              draft.sort === 'newest' && 'is-active'
            )}
            aria-pressed={draft.sort === 'newest'}
            onClick={() => {
              patchDraft({
                sort: draft.sort === 'newest' ? DEFAULT_SHOP_FILTERS.sort : 'newest'
              });
            }}
          >
            Новинки
          </button>
        </div>

        <div className="shop-filters-sort-row">
          <div className="shop-filters-sort-row__meta">
            <span className="shop-filters-sort-row__icon shop-filters-sort-row__icon--flame" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path
                  d="M12 3c2.5 3 3 5.2 3 7.2 0 1.4-.4 2.6-1.1 3.5.9-.3 1.6-1.2 1.6-2.4 0-.4 0-.8-.1-1.2C18 12 19 14.2 19 16.2 19 19.5 16.1 22 12 22s-7-2.5-7-5.8c0-3.2 2.2-5.7 4.2-7.7.5 1.3 1.3 2.2 2.3 2.7-.2-1.4.1-3.1.5-4.5.3-1 .8-1.9 1-2.7z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="shop-filters-sort-row__label">По популярности</span>
          </div>
          <button
            type="button"
            className={clsx(
              'shop-filters-chip',
              draft.sort === 'popular' && 'is-active'
            )}
            aria-pressed={draft.sort === 'popular'}
            onClick={() => patchDraft({ sort: 'popular' })}
          >
            Популярное
          </button>
        </div>
      </section>
    </Modal>
  );
}
