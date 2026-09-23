import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './app/App';
import { AuthProvider } from './auth/AuthContext';
import { SettingsProvider } from './auth/SettingsContext';
import { ThemeProvider } from './theme/ThemeProvider';
import { ConfirmProvider, ErrorBoundary, ToastProvider } from './components/ui';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <SettingsProvider>
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
            </SettingsProvider>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
