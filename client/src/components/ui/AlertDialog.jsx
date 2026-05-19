import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from 'react';
import Modal from './Modal';
import './AlertDialog.css';

const AlertDialogContext = createContext(null);

const INITIAL_STATE = {
  isOpen: false,
  title: '',
  message: '',
  variant: 'alert', // 'alert' | 'confirm'
  confirmText: 'Понятно',
  cancelText: 'Отмена',
  onConfirm: undefined,
  onCancel: undefined
};

/**
 * Глобальный провайдер для замены `window.alert`/`window.confirm` на единый UI-диалог.
 * Решает C13 везде в приложении.
 */
export function AlertDialogProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const alert = useCallback(
    ({ title = 'Уведомление', message, confirmText = 'Понятно' } = {}) =>
      new Promise((resolve) => {
        setState({
          ...INITIAL_STATE,
          isOpen: true,
          title,
          message: message || '',
          variant: 'alert',
          confirmText,
          onConfirm: () => {
            close();
            resolve(true);
          }
        });
      }),
    [close]
  );

  const confirm = useCallback(
    ({
      title = 'Подтверждение',
      message,
      confirmText = 'Да, продолжить',
      cancelText = 'Отмена'
    } = {}) =>
      new Promise((resolve) => {
        setState({
          ...INITIAL_STATE,
          isOpen: true,
          title,
          message: message || '',
          variant: 'confirm',
          confirmText,
          cancelText,
          onConfirm: () => {
            close();
            resolve(true);
          },
          onCancel: () => {
            close();
            resolve(false);
          }
        });
      }),
    [close]
  );

  const value = useMemo(() => ({ alert, confirm }), [alert, confirm]);

  return (
    <AlertDialogContext.Provider value={value}>
      {children}

      <Modal
        isOpen={state.isOpen}
        onClose={state.variant === 'confirm' ? state.onCancel : state.onConfirm}
        title={state.title}
        size="default"
        showCloseButton={false}
        closeOnOverlay={state.variant === 'alert'}
      >
        <p className="ui-alert-message">{state.message}</p>

        <div className="ui-alert-actions">
          {state.variant === 'confirm' && (
            <button
              type="button"
              className="ui-alert-btn ui-alert-btn--cancel"
              onClick={state.onCancel}
            >
              {state.cancelText}
            </button>
          )}
          <button
            type="button"
            className="ui-alert-btn ui-alert-btn--confirm"
            onClick={state.onConfirm}
          >
            {state.confirmText}
          </button>
        </div>
      </Modal>
    </AlertDialogContext.Provider>
  );
}

/**
 * @returns {{
 *   alert: (opts?: { title?: string, message?: string, confirmText?: string }) => Promise<true>,
 *   confirm: (opts?: { title?: string, message?: string, confirmText?: string, cancelText?: string }) => Promise<boolean>
 * }}
 */
export function useAlertDialog() {
  const ctx = useContext(AlertDialogContext);
  if (!ctx) {
    throw new Error('useAlertDialog должен использоваться внутри <AlertDialogProvider>');
  }
  return ctx;
}
