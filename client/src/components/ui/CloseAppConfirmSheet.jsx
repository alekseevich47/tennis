import React from 'react';
import Modal from './Modal';
import './CloseAppConfirmSheet.css';

/**
 * Bottom sheet подтверждения выхода из мини-приложения MAX.
 *
 * @param {{
 *   isOpen: boolean,
 *   onCancel: () => void,
 *   onConfirm: () => void,
 *   confirming?: boolean
 * }} props
 */
export default function CloseAppConfirmSheet({
  isOpen,
  onCancel,
  onConfirm,
  confirming = false
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Закрыть приложение?"
      ariaLabel="Подтверждение закрытия"
      overlayClassName="close-app-confirm-overlay"
      className="close-app-confirm-sheet"
      showCloseButton={false}
      closeOnOverlay={!confirming}
    >
      <p className="close-app-confirm-message">
        Вы уверены, что хотите выйти? Несохранённые действия могут быть потеряны.
      </p>

      <div className="close-app-confirm-actions">
        <button
          type="button"
          className="close-app-confirm-btn close-app-confirm-btn--cancel"
          onClick={onCancel}
          disabled={confirming}
        >
          Остаться
        </button>
        <button
          type="button"
          className="close-app-confirm-btn close-app-confirm-btn--confirm"
          onClick={onConfirm}
          disabled={confirming}
        >
          {confirming ? 'Закрытие…' : 'Закрыть'}
        </button>
      </div>
    </Modal>
  );
}
