import React from 'react';
import ReactDOM from 'react-dom/client';
import { SWRConfig } from 'swr';
import { ErrorBoundary } from 'react-error-boundary';
import App from './App';
import { AlertDialogProvider } from './components/ui/AlertDialog';
import { PostUploadProvider } from './components/PostUploadProvider';
import { GalleryUploadProvider } from './components/GalleryUploadProvider';
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
          <PostUploadProvider>
            <GalleryUploadProvider>
              <App />
            </GalleryUploadProvider>
          </PostUploadProvider>
        </AlertDialogProvider>
      </SWRConfig>
    </ErrorBoundary>
  </React.StrictMode>
);
