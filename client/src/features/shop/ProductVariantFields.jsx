import React, { useState } from 'react';
import clsx from 'clsx';
import Modal from '../../components/ui/Modal';
import FrameColorPicker from '../feed/FrameColorPicker';
import { normalizeHexColor } from '../feed/postRichText';

/**
 * @param {{
 *   mode: 'color' | 'size',
 *   onModeChange: (mode: 'color' | 'size') => void,
 *   colors: string[],
 *   onColorsChange: (colors: string[]) => void,
 *   sizes: string,
 *   onSizesChange: (value: string) => void
 * }} props
 */
function ProductVariantFields({
  mode,
  onModeChange,
  colors,
  onColorsChange,
  sizes,
  onSizesChange
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftColor, setDraftColor] = useState('#007AFF');

  const openPicker = () => {
    setDraftColor(colors[colors.length - 1] || '#007AFF');
    setPickerOpen(true);
  };

  const applyColor = (hex) => {
    const normalized = normalizeHexColor(hex);
    if (!normalized) return;
    if (!colors.includes(normalized)) {
      onColorsChange([...colors, normalized]);
    }
    setPickerOpen(false);
  };

  return (
    <div className="product-variant-fields">
      <div className="product-variant-segment" role="group" aria-label="Цвет или размер">
        <button
          type="button"
          className={clsx('product-variant-segment__btn', mode === 'color' && 'is-active')}
          onClick={() => onModeChange('color')}
        >
          Цвет
        </button>
        <button
          type="button"
          className={clsx('product-variant-segment__btn', mode === 'size' && 'is-active')}
          onClick={() => onModeChange('size')}
        >
          Размер
        </button>
        <span
          className="product-variant-segment__thumb"
          style={{ transform: mode === 'size' ? 'translateX(100%)' : 'translateX(0)' }}
          aria-hidden="true"
        />
      </div>

      {mode === 'color' ? (
        <div className="product-color-picker-row" aria-label="Цвета товара">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              className="product-color-dot product-color-dot--filled product-color-dot--editable"
              style={{ background: color }}
              onClick={() => onColorsChange(colors.filter((item) => item !== color))}
              aria-label={`Удалить цвет ${color}`}
              title={`${color} — нажмите, чтобы удалить`}
            />
          ))}
          <button
            type="button"
            className="product-color-dot product-color-dot--add"
            onClick={openPicker}
            aria-label="Добавить цвет"
          />
        </div>
      ) : (
        <input
          type="text"
          className="product-variant-size-input"
          value={sizes}
          onChange={(event) => onSizesChange(event.target.value)}
          placeholder="M, L, XL"
          aria-label="Размеры"
        />
      )}

      <Modal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Выбор цвета"
        size="default"
      >
        <FrameColorPicker
          color={draftColor}
          onChange={setDraftColor}
          onApply={applyColor}
          onClose={() => setPickerOpen(false)}
          applyLabel="Применить"
        />
      </Modal>
    </div>
  );
}

export default ProductVariantFields;
