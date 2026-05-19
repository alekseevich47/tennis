import React, { memo, useCallback } from 'react';
import { getMediaUrl } from '../../lib/media';

/**
 * @param {{
 *   product: import('../../services/catalog').ProductRecord,
 *   onOpen: (product: any) => void
 * }} props
 */
function ProductCard({ product, onOpen }) {
  const handleClick = useCallback(() => onOpen(product), [onOpen, product]);
  const firstImage = product.images?.[0];
  const url = firstImage ? getMediaUrl(product, 'products', firstImage) : null;

  return (
    <button type="button" className="product-card" onClick={handleClick}>
      <div className="product-image">
        {url ? (
          <img src={url} alt={`Фото товара ${product.title || 'без названия'}`} />
        ) : (
          <div className="no-image">Нет фото</div>
        )}
      </div>
      <div className="product-info">
        <h3>{product.title}</h3>
        <p className="price">{product.price} ₽</p>
      </div>
    </button>
  );
}

export default memo(ProductCard);
