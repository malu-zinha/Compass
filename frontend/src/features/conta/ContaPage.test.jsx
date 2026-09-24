import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { TestProviders } from '../../test/render';
import ContaPage from './ContaPage';

vi.mock('../../api/users', () => ({ updateMe: vi.fn(), uploadAvatar: vi.fn() }));
vi.mock('../../auth/SettingsContext', () => ({
  useUserSettings: () => ({
    settings: {
      suggest_questions: true, suggestion_interval_seconds: 40, transcription_language: 'pt',
      auto_save_notes: true, timezone: 'America/Sao_Paulo', date_format: 'DD/MM/YYYY',
    },
    saveSettings: vi.fn(),
  }),
}));

function renderConta(url) {
  const router = createMemoryRouter([{ path: '/conta', element: <ContaPage /> }], { initialEntries: [url] });
  render(<TestProviders><RouterProvider router={router} /></TestProviders>);
  return router;
}

test('abre no perfil e troca para preferências pela aba, guardando na URL', async () => {
  const router = renderConta('/conta');
  expect(screen.getByRole('heading', { level: 1, name: 'Minha conta' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Perfil' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('heading', { name: 'Informações pessoais' })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('tab', { name: 'Preferências' }));
  expect(router.state.location.search).toBe('?aba=preferencias');
  expect(screen.getByRole('group', { name: 'Tema' })).toBeInTheDocument();
});

test('/conta?aba=preferencias abre direto nas preferências', () => {
  renderConta('/conta?aba=preferencias');
  expect(screen.getByRole('tab', { name: 'Preferências' })).toHaveAttribute('aria-selected', 'true');
});
