// @ts-check
import { createContext, useCallback, useContext, useEffect, useRef } from 'react';

/**
 * @typedef {{
 *   register: (fn: () => void) => () => void,
 *   trigger: () => boolean
 * }} AddActionApi
 */

/** @type {AddActionApi} */
const DEFAULT_API = {
  register: () => () => {},
  trigger: () => false
};

const AddActionContext = createContext(DEFAULT_API);

/**
 * Провайдер действия «Добавить» для кнопки «+» в BottomNav.
 * Страницы регистрируют обработчик через `useRegisterAddAction`.
 * @param {{ children: React.ReactNode }} props
 */
export function AddActionProvider({ children }) {
  const handlerRef = useRef(/** @type {null | (() => void)} */ (null));

  const register = useCallback((fn) => {
    handlerRef.current = fn;
    return () => {
      if (handlerRef.current === fn) handlerRef.current = null;
    };
  }, []);

  const trigger = useCallback(() => {
    const fn = handlerRef.current;
    if (!fn) return false;
    fn();
    return true;
  }, []);

  return (
    <AddActionContext.Provider value={{ register, trigger }}>
      {children}
    </AddActionContext.Provider>
  );
}

/** @returns {() => boolean} */
export function useTriggerAddAction() {
  return useContext(AddActionContext).trigger;
}

/**
 * Регистрирует обработчик «Добавить» на время монтирования страницы.
 * @param {() => void} handler
 * @param {boolean} [enabled]
 */
export function useRegisterAddAction(handler, enabled = true) {
  const register = useContext(AddActionContext).register;
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return undefined;
    return register(() => {
      handlerRef.current?.();
    });
  }, [register, enabled]);
}
