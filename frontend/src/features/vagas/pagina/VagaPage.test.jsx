import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { TestProviders } from '../../../test/render';
import VagaPage from './VagaPage';

vi.mock('../../../api/positions', () => ({ getPosition: vi.fn(), deletePosition: vi.fn() }));
vi.mock('../../../api/interviews', () => ({ listInterviews: vi.fn() }));
vi.mock('../../../api/questions', () => ({
  listQuestions: vi.fn(async () => []),
  createQuestion: vi.fn(),
  updateQuestion: vi.fn(),
  deleteQuestion: vi.fn(),
}));
vi.mock('../../../auth/SettingsContext', () => ({
  useUserSettings: () => ({ settings: { timezone: 'America/Sao_Paulo', date_format: 'DD/MM/YYYY' } }),
}));

const vaga = { id: 3, name: 'Frontend', description: 'React e CSS', vacancies: 2, skills: ['React'], ideal_profile: 'Autônoma' };
const done = (id, score) => ({
  id, candidate_name: `Candidata ${id}`, position_id: 3, status: 'done', score, audio_duration_seconds: 600, created_at: '2026-09-20T12:00:00Z',
});

function renderVaga(url = '/vagas/3') {
  const router = createMemoryRouter(
    [
      { path: '/vagas/:id', element: <VagaPage /> },
      { path: '/vagas/:id/comparar', element: <p>comparar</p> },
      { path: '/vagas', element: <p>lista de vagas</p> },
    ],
    { initialEntries: [url] },
  );
  render(<TestProviders><RouterProvider router={router} /></TestProviders>);
  return router;
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { getPosition } = await import('../../../api/positions');
  const { listInterviews } = await import('../../../api/interviews');
  getPosition.mockResolvedValue(vaga);
  listInterviews.mockImplementation(({ status }) => Promise.resolve(
    status === 'done'
      ? { items: [done(1, 870), done(2, 640), done(4, 500), done(5, 300)], total: 4 }
      : { items: [{ ...done(9, null), status: 'analyzing', candidate_name: 'Júlia' }], total: 1 },
  ));
});

test('mostra a vaga, as abas e o ranking com links', async () => {
  renderVaga();
  expect(await screen.findByRole('heading', { level: 2, name: 'Frontend' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Nova entrevista para esta vaga' })).toHaveAttribute('href', '/nova-entrevista?vaga=3');
  expect(screen.getByRole('tab', { name: 'Candidatos' })).toHaveAttribute('aria-selected', 'true');

  const table = await screen.findByRole('table', { name: 'Ranking de candidatos da vaga' });
  expect(within(table).getByRole('link', { name: /Candidata 1/ })).toHaveAttribute('href', '/entrevista/1');
  expect(screen.getByRole('heading', { name: 'Sem resultado ainda' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Júlia/ })).toHaveTextContent('Analisando');
});

test('compara até 3 candidatas da vaga', async () => {
  const router = renderVaga();
  const compare = await screen.findByRole('button', { name: /Comparar selecionadas/ });
  expect(compare).toBeDisabled();
  await userEvent.click(screen.getByRole('checkbox', { name: 'Comparar Candidata 1' }));
  await userEvent.click(screen.getByRole('checkbox', { name: 'Comparar Candidata 2' }));
  await userEvent.click(screen.getByRole('checkbox', { name: 'Comparar Candidata 4' }));
  expect(screen.getByRole('checkbox', { name: 'Comparar Candidata 5' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Comparar selecionadas (3)' }));
  await waitFor(() => expect(router.state.location.pathname + router.state.location.search).toBe('/vagas/3/comparar?ids=1,2,4'));
});

test('a aba fica na URL e Perguntas lista as da vaga', async () => {
  const router = renderVaga('/vagas/3?aba=perguntas');
  const { listQuestions } = await import('../../../api/questions');
  expect(await screen.findByRole('tab', { name: 'Perguntas' })).toHaveAttribute('aria-selected', 'true');
  await waitFor(() => expect(listQuestions).toHaveBeenCalledWith(3));

  await userEvent.click(screen.getByRole('tab', { name: 'Perfil da vaga' }));
  expect(router.state.location.search).toBe('?aba=perfil');
  expect(screen.getByText('Autônoma')).toBeInTheDocument();
});

test('excluir pede confirmação e volta para a lista', async () => {
  const { deletePosition } = await import('../../../api/positions');
  deletePosition.mockResolvedValue(null);
  const router = renderVaga();
  await userEvent.click(await screen.findByRole('button', { name: 'Excluir vaga' }));
  const dialog = screen.getByRole('alertdialog', { name: 'Excluir vaga' });
  expect(dialog).toHaveTextContent('Excluir esta vaga também exclui todas as entrevistas, gravações e perguntas vinculadas. Deseja continuar?');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }));
  await waitFor(() => expect(deletePosition).toHaveBeenCalledWith(3));
  await waitFor(() => expect(router.state.location.pathname).toBe('/vagas'));
});

test('vaga inexistente mostra erro com volta para a lista', async () => {
  const { getPosition } = await import('../../../api/positions');
  getPosition.mockRejectedValue({ detail: 'Cargo não encontrado.' });
  renderVaga();
  expect(await screen.findByRole('alert')).toHaveTextContent('Cargo não encontrado.');
  expect(screen.getByRole('button', { name: 'Voltar para vagas' })).toBeInTheDocument();
});
