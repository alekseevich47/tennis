import React from 'react';
import './CustomAlert.css';

function CustomAlert({ isOpen, title, message, type = 'alert', onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="custom-alert-overlay" onClick={type === 'alert' ? onConfirm : onCancel}>
      <div className="custom-alert-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="custom-alert-title">{title}</h3>
        <p className="custom-alert-message">{message}</p>
        <div className="custom-alert-actions">
          {type === 'confirm' ? (
            <>
              <button className="alert-btn-cancel" onClick={onCancel}>Отмена</button>
              <button className="alert-btn-confirm" onClick={onConfirm}>Да, продолжить</button>
            </>
          ) : (
            <button className="alert-btn-ok" onClick={onConfirm}>Понятно</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CustomAlert;
