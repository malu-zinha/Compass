import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { TestProviders, fakeAuthValue, LayoutOutlet } from '../../../test/render';
import { listInterviews } from '../../../api/interviews';
import { getPosition } from '../../../api/positions';
import ResultsPage from './ResultsPage';

vi.mock('../../../api/interviews', () => ({ listInterviews: vi.fn() }));
vi.mock('../../../api/positions', () => ({ getPosition: vi.fn() }));
vi.mock('../../../auth/SettingsContext', () => ({
  useUserSettings: () => ({ settings: { timezone: 'UTC', date_format: 'DD/MM/YYYY' } }),
}));

const item = (id, overrides = {}) => ({
  id,
  candidate_name: `Candidato ${id}`,
  candidate_email: `c${id}@example.com`,
  position_id: 3,
  position_name: 'Dev Backend',
  interviewer_name: 'Ana Souza',
  status: 'done',
  score: 800,
  positives: [`Positivo ${id}`],
  negatives: [`Negativo ${id}`],
  audio_duration_seconds: 200,
  created_at: '2026-03-01T12:00:00+00:00',
  ...overrides,
});

const pageOf = (items, { page = 1, pages = 1 } = {}) => ({
  items, total: items.length, page, per_page: 20, pages,
});

// `listPages` são as páginas de "Entrevistados" (1, 2, ...); `ranking`, os itens do top 5.
function mockList(listPages, ranking = []) {
  listInterviews.mockImplementation(({ status, page = 1 }) => {
    if (status === 'done') return Promise.resolve(pageOf(ranking));
    return Promise.resolve(pageOf(listPages[page - 1], { page, pages: listPages.length }));
  });
}

function renderResults(path) {
  const router = createMemoryRouter([
    {
      element: <LayoutOutlet />,
      children: [
        { path: '/entrevistas', element: <ResultsPage /> },
        { path: '/entrevistas/:positionId', element: <ResultsPage /> },
        { path: '/comparar', element: <p>Página de comparação</p> },
      ],
    },
  ], { initialEntries: [path] });
  const view = render(
    <TestProviders auth={fakeAuthValue()}>
      <RouterProvider router={router} />
    </TestProviders>,
  );
  return { router, ...view };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.alert = vi.fn();
  getPosition.mockResolvedValue({ id: 3, name: 'Dev Backend', vacancies: 2 });
});

test('(a) busca a primeira página e o top 5 do cargo, e usa o nome do cargo no título', async () => {
  mockList([[item(1)]], [item(1)]);
  renderResults('/entrevistas/3');

  expect(await screen.findByRole('heading', { name: 'Ranking - Dev Backend' })).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'Candidato 1' })).toBeInTheDocument();
  expect(getPosition).toHaveBeenCalledWith(3);
  expect(listInterviews).toHaveBeenCalledWith({ positionId: 3, sort: '-created_at', page: 1, perPage: 20 });
  expect(listInterviews).toHaveBeenCalledWith({ positionId: 3, status: 'done', sort: '-score', perPage: 5 });
});

test('(b) mostra a duração vinda do servidor sem instanciar Audio', async () => {
  const audioSpy = vi.spyOn(window, 'Audio');
  mockList([[item(1)]], [item(1)]);
  renderResults('/entrevistas/3');

  expect(await screen.findByText('3m 20s')).toBeInTheDocument();
  expect(screen.getByText('01/03/2026')).toBeInTheDocument();
  expect(screen.getByText('80% match')).toBeInTheDocument();
  expect(audioSpy).not.toHaveBeenCalled();
  audioSpy.mockRestore();
});

test('(c) "Carregar mais" busca a página 2 e concatena os itens', async () => {
  mockList([[item(1), item(2)], [item(3)]]);
  renderResults('/entrevistas/3');

  await userEvent.click(await screen.findByRole('button', { name: 'Carregar mais' }));

  expect(await screen.findByRole('heading', { name: 'Candidato 3' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Candidato 1' })).toBeInTheDocument();
  expect(listInterviews).toHaveBeenCalledWith({ positionId: 3, sort: '-created_at', page: 2, perPage: 20 });
  expect(screen.queryByRole('button', { name: 'Carregar mais' })).not.toBeInTheDocument();
});

test('(d) no modo comparar, 3 selecionados desabilitam o 4º e o botão navega para /comparar', async () => {
  mockList([[item(1), item(2), item(3), item(4)]]);
  const { router } = renderResults('/entrevistas/3');

  await userEvent.click(await screen.findByRole('button', { name: 'Comparar' }));
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('checkbox', { name: 'Selecionar Candidato 1' }));
  expect(screen.queryByRole('button', { name: /Comparar selecionados/ })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('checkbox', { name: 'Selecionar Candidato 2' }));
  await userEvent.click(screen.getByRole('checkbox', { name: 'Selecionar Candidato 3' }));

  expect(screen.getByRole('checkbox', { name: 'Selecionar Candidato 4' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Comparar selecionados (3)' }));

  await waitFor(() => expect(router.state.location.pathname).toBe('/comparar'));
  expect(router.state.location.search).toBe('?ids=1,2,3');
});

test('(e) em /entrevistas só deixa selecionar o mesmo cargo e mostra o status dos não concluídos', async () => {
  mockList([[
    item(1),
    item(2, { position_id: 7, position_name: 'Designer' }),
    item(3),
    item(4, { status: 'analyzing', score: null, positives: [], negatives: [] }),
    item(5, { status: 'error', score: null, positives: [], negatives: [] }),
  ]]);
  renderResults('/entrevistas');

  expect(await screen.findByRole('heading', { name: 'Análise de candidatos' })).toBeInTheDocument();
  expect(getPosition).not.toHaveBeenCalled();
  expect(listInterviews).toHaveBeenCalledWith({ sort: '-created_at', page: 1, perPage: 20 });
  expect(screen.getAllByText('[Aguardando análise]')).toHaveLength(2);
  expect(screen.getAllByText('[Falha no processamento]')).toHaveLength(2);

  await userEvent.click(screen.getByRole('button', { name: 'Comparar' }));
  expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  await userEvent.click(screen.getByRole('checkbox', { name: 'Selecionar Candidato 1' }));

  expect(screen.getByRole('checkbox', { name: 'Selecionar Candidato 2' })).toBeDisabled();
  expect(screen.getByRole('checkbox', { name: 'Selecionar Candidato 3' })).toBeEnabled();

  await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
});
