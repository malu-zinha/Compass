import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { TestProviders } from '../../../test/render';
import EntrevistasPage from './EntrevistasPage';

vi.mock('../../../api/interviews', () => ({ listInterviews: vi.fn() }));
vi.mock('../../../api/positions', () => ({ listPositions: vi.fn(async () => ({ items: [{ id: 3, name: 'Frontend' }] })) }));
vi.mock('../../../auth/SettingsContext', () => ({
  useUserSettings: () => ({ settings: { timezone: 'America/Sao_Paulo', date_format: 'DD/MM/YYYY' } }),
}));

const item = (id, extra = {}) => ({
  id,
  candidate_name: `Candidata ${id}`,
  candidate_email: `c${id}@x.com`,
  position_id: 3,
  position_name: 'Frontend',
  status: 'done',
  score: 700 + id,
  audio_duration_seconds: 200,
  created_at: '2026-03-01T12:00:00Z',
  ...extra,
});

function renderPage(url = '/entrevistas') {
  const router = createMemoryRouter([{ path: '/entrevistas', element: <EntrevistasPage /> }], { initialEntries: [url] });
  render(<TestProviders><RouterProvider router={router} /></TestProviders>);
  return router;
}

let listInterviews;
beforeEach(async () => {
  vi.clearAllMocks();
  ({ listInterviews } = await import('../../../api/interviews'));
  listInterviews.mockImplementation(async ({ page }) => (page === 1
    ? { items: [item(1), item(2, { status: 'analyzing', score: null, candidate_name: 'Júlia' })], total: 3, page: 1, pages: 2 }
    : { items: [item(3)], total: 3, page: 2, pages: 2 }));
});

test('lista em tabela com link, status e total', async () => {
  renderPage();
  const table = await screen.findByRole('table', { name: 'Entrevistas' });
  expect(within(table).getByRole('link', { name: 'Candidata 1' })).toHaveAttribute('href', '/entrevista/1');
  expect(within(table).getByText('Analisando')).toBeInTheDocument();
  expect(screen.getByText('3 entrevistas')).toBeInTheDocument();
  expect(listInterviews).toHaveBeenCalledWith({ positionId: undefined, status: undefined, sort: '-created_at', page: 1, perPage: 100 });
});

test('filtros vão para a URL e para a busca no backend', async () => {
  const router = renderPage();
  await screen.findByRole('table');
  await userEvent.click(screen.getByRole('radio', { name: 'Em andamento' }));
  await waitFor(() => expect(listInterviews).toHaveBeenLastCalledWith(expect.objectContaining({
    status: ['draft', 'recording', 'uploaded', 'transcribing', 'analyzing'],
  })));
  await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Vaga' }), '3');
  await waitFor(() => expect(listInterviews).toHaveBeenLastCalledWith(expect.objectContaining({ positionId: 3 })));
  expect(router.state.location.search).toBe('?status=andamento&vaga=3');
});

test('abre com os filtros que já estão na URL', async () => {
  renderPage('/entrevistas?status=falha&ordem=pontuacao');
  await screen.findByRole('table');
  expect(listInterviews).toHaveBeenCalledWith(expect.objectContaining({ status: 'error', sort: '-score' }));
  expect(screen.getByRole('radio', { name: 'Com falha' })).toBeChecked();
  expect(screen.getByRole('columnheader', { name: /Pontuação/ })).toHaveAttribute('aria-sort', 'descending');
});

test('ordenar pela coluna troca o critério', async () => {
  const router = renderPage();
  await screen.findByRole('table');
  await userEvent.click(screen.getByRole('button', { name: /Pontuação/ }));
  expect(router.state.location.search).toBe('?ordem=pontuacao');
});

test('busca filtra o que foi carregado', async () => {
  renderPage();
  await screen.findByRole('table');
  await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar por nome ou e-mail' }), 'júl');
  expect(screen.queryByRole('link', { name: 'Candidata 1' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Júlia' })).toBeInTheDocument();
  expect(screen.getByText('1 de 2 carregadas')).toBeInTheDocument();
});

test('Carregar mais busca a próxima página', async () => {
  renderPage();
  await userEvent.click(await screen.findByRole('button', { name: 'Carregar mais' }));
  expect(await screen.findByRole('link', { name: 'Candidata 3' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Carregar mais' })).not.toBeInTheDocument();
});

test('sem resultado com filtros explica que é o filtro', async () => {
  listInterviews.mockResolvedValue({ items: [], total: 0, page: 1, pages: 0 });
  renderPage('/entrevistas?status=falha');
  expect(await screen.findByRole('heading', { name: 'Nenhuma entrevista com esses filtros' })).toBeInTheDocument();
});
