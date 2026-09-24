import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';
import AppProviders from './AppProviders';

beforeEach(() => {
  global.fetch = vi.fn(() => {
    throw new Error('fetch não deveria ser chamado sem token');
  });
});

test('renderiza a landing page', () => {
  render(
    <AppProviders>
      <App />
    </AppProviders>,
  );
  expect(screen.getAllByRole('img', { name: 'Compass' }).length).toBeGreaterThan(0);
});
