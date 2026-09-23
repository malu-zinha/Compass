import { AuthProvider } from '../auth/AuthContext';
import { SettingsProvider } from '../auth/SettingsContext';
import { ConfirmProvider, ErrorBoundary, ToastProvider } from '../components/ui';
import { ThemeProvider } from '../theme/ThemeProvider';

// Todos os providers globais do app, na ordem certa. Usado por main.jsx e pelo teste do App.
export default function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <SettingsProvider>
              <ErrorBoundary>{children}</ErrorBoundary>
            </SettingsProvider>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
