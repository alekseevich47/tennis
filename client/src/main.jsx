import React from 'react';
import ReactDOM from 'react-dom/client';
import { SWRConfig } from 'swr';
import { ErrorBoundary } from 'react-error-boundary';
import App from './App';
import { AlertDialogProvider } from './components/ui/AlertDialog';
import { ToastProvider } from './components/ui/ToastContext';
import { PostUploadProvider } from './components/PostUploadProvider';
import { TournamentPostUploadProvider } from './components/TournamentPostUploadProvider';
import { GalleryUploadProvider } from './components/GalleryUploadProvider';
// Nunito Variable (self-hosted). Откат: закомментировать + --app-font-family-legacy в fonts.css
import '@fontsource-variable/nunito/wght.css';
import './styles/global.css';

function GlobalErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="app-error-fallback" role="alert">
      <h1>Что-то пошло не так</h1>
      <p>{error?.message || 'Неизвестная ошибка приложения'}</p>
      <button type="button" onClick={resetErrorBoundary}>
        Перезагрузить
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary
      FallbackComponent={GlobalErrorFallback}
      onReset={() => window.location.reload()}
    >
      <SWRConfig
        value={{
          revalidateOnFocus: false,
          dedupingInterval: 5000,
          shouldRetryOnError: false
        }}
      >
        <AlertDialogProvider>
          <ToastProvider>
            <PostUploadProvider>
              <TournamentPostUploadProvider>
                <GalleryUploadProvider>
                  <App />
                </GalleryUploadProvider>
              </TournamentPostUploadProvider>
            </PostUploadProvider>
          </ToastProvider>
        </AlertDialogProvider>
      </SWRConfig>
    </ErrorBoundary>
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/tt-api/sw.js', { scope: '/' });
}
