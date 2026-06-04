import { useEffect, useState } from 'react';

/** Инкремент при pagehide / скрытии webview — для сброса локального UI-состояния через key. */
export function useSessionResetKey() {
  const [key, setKey] = useState(0);

  useEffect(() => {
    const bump = () => setKey((current) => current + 1);

    window.addEventListener('pagehide', bump);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') bump();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('pagehide', bump);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return key;
}
