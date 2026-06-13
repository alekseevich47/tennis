import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Toast from './Toast';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback(({ text, actionLabel, onAction, autoDismissMs } = {}) => {
    if (!text) return;
    setToast({ text, actionLabel, onAction, autoDismissMs, key: Date.now() });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <Toast
          key={toast.key}
          text={toast.text}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
          autoDismissMs={toast.autoDismissMs}
          onDismiss={hideToast}
        />
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast должен использоваться внутри <ToastProvider>');
  }
  return ctx;
}
