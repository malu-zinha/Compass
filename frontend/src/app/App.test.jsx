import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { SettingsProvider } from '../auth/SettingsContext';
import App from './App';

beforeEach(() => {
  global.fetch = vi.fn(() => {
    throw new Error('fetch não deveria ser chamado sem token');
  });
});

test('renderiza a landing page', () => {
  render(
    <AuthProvider>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </AuthProvider>,
  );
  expect(screen.getAllByRole('img', { name: 'Compass' }).length).toBeGreaterThan(0);
});
