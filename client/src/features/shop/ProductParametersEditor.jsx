import React, { useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';

/**
 * @param {{
 *   items: Array<{ name: string, value: string }>,
 *   onChange: (items: Array<{ name: string, value: string }>) => void,
 *   templateNames: string[]
 * }} props
 */
export function ProductParametersEditor({ items, onChange, templateNames }) {
  const baseId = useId();

  const updateRow = (rowIndex, patch) => {
    onChange(items.map((item, index) => (index === rowIndex ? { ...item, ...patch } : item)));
  };

  const addRow = () => {
    onChange([...items, { name: '', value: '' }]);
  };

  const removeRow = (rowIndex) => {
    onChange(items.filter((_, index) => index !== rowIndex));
  };

  const rows = items.length > 0 ? items : [{ name: '', value: '' }];

  return (
    <div className="product-parameters-editor">
      {rows.map((row, rowIndex) => (
        <ProductParameterRow
          key={`${baseId}-${rowIndex}`}
          row={row}
          rowIndex={rowIndex}
          templateNames={templateNames}
          canRemove={rows.length > 1}
          onUpdate={(patch) => updateRow(rowIndex, patch)}
          onRemove={() => removeRow(rowIndex)}
        />
      ))}
      {rows.length > 0 && rows.some((row) => row.name.trim() || row.value.trim()) && (
        <button type="button" className="product-parameters-editor__add" onClick={addRow}>
          +
        </button>
      )}
    </div>
  );
}

/**
 * @param {{
 *   row: { name: string, value: string },
 *   rowIndex: number,
 *   templateNames: string[],
 *   canRemove: boolean,
 *   onUpdate: (patch: Partial<{ name: string, value: string }>) => void,
 *   onRemove: () => void
 * }} props
 */
function ProductParameterRow({ row, rowIndex, templateNames, canRemove, onUpdate, onRemove }) {
  const listId = useId();
  const rootRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    if (menuOpen) {
      setMenuVisible(true);
      return undefined;
    }
    const timer = window.setTimeout(() => setMenuVisible(false), 180);
    return () => window.clearTimeout(timer);
  }, [menuOpen]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const filteredTemplates = templateNames.filter((name) =>
    !row.name.trim() || name.toLowerCase().includes(row.name.trim().toLowerCase())
  );

  return (
    <div className="product-parameters-editor__row" ref={rootRef}>
      <div className="product-parameters-editor__name-col">
        <input
          type="text"
          value={row.name}
          onChange={(event) => onUpdate({ name: event.target.value })}
          onFocus={() => setMenuOpen(true)}
          placeholder="Параметр"
          aria-label={`Параметр ${rowIndex + 1}`}
          aria-expanded={menuOpen}
          aria-controls={listId}
        />
        {menuVisible && filteredTemplates.length > 0 && (
          <div
            id={listId}
            className={clsx('product-param-suggest', menuOpen && 'is-open')}
            role="listbox"
          >
            {filteredTemplates.map((name) => (
              <button
                key={name}
                type="button"
                role="option"
                className="product-param-suggest__option"
                onClick={() => {
                  onUpdate({ name });
                  setMenuOpen(false);
                }}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="product-parameters-editor__value-col">
        <input
          type="text"
          value={row.value}
          onChange={(event) => onUpdate({ value: event.target.value })}
          placeholder="Описание"
          aria-label={`Описание параметра ${rowIndex + 1}`}
        />
      </div>
      {canRemove && (
        <button
          type="button"
          className="product-parameters-editor__remove"
          onClick={onRemove}
          aria-label={`Удалить параметр ${rowIndex + 1}`}
        >
          ×
        </button>
      )}
    </div>
  );
}

export default ProductParametersEditor;
