import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { TestProviders, fakeAuthValue, LayoutOutlet } from '../../../test/render';
import { getInterview } from '../../../api/interviews';
import { compareInterviews } from '../../../api/comparisons';
import ComparePage from './ComparePage';

vi.mock('../../../api/interviews', () => ({ getInterview: vi.fn() }));
vi.mock('../../../api/comparisons', () => ({ compareInterviews: vi.fn() }));

const detail = (id) => ({
  id,
  candidate_name: `Candidato ${id}`,
  candidate_email: `c${id}@example.com`,
  position_id: 3,
  position_name: 'Dev Backend',
  status: 'done',
  score: 800 + id * 10,
  analysis: {
    summary: 'Resumo',
    skills: [`Skill ${id}`],
    positives: [`Positivo ${id}`],
    negatives: [`Negativo ${id}`],
    ideal_profile_fit: `Aderência ${id}`,
    score: { overall: 800, subscores: { technical: 900, communication: 700, work_culture: 600, experience: 500 } },
  },
});

function renderCompare(path) {
  const router = createMemoryRouter([
    {
      element: <LayoutOutlet />,
      children: [
        { path: '/vagas/:id/comparar', element: <ComparePage /> },
        { path: '/vagas/:id', element: <p>Página da vaga</p> },
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
  getInterview.mockImplementation((id) => Promise.resolve(detail(id)));
});

test('matriz com uma coluna por candidata, maior valor marcado e parecer da IA', async () => {
  let resolveComparison;
  compareInterviews.mockReturnValue(new Promise((resolve) => { resolveComparison = resolve; }));
  renderCompare('/vagas/3/comparar?ids=1,2,3');

  const matrix = await screen.findByRole('table', { name: 'Pontuação geral e por competência de cada candidata' });
  expect(getInterview.mock.calls).toEqual([[1], [2], [3]]);
  expect(screen.getByRole('heading', { level: 1, name: 'Comparar' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Dev Backend' })).toHaveAttribute('href', '/vagas/3');

  // Colunas = candidatas (com link), linhas = critérios.
  expect(within(matrix).getByRole('link', { name: 'Candidato 2' })).toHaveAttribute('href', '/entrevista/2');
  const tecnico = within(matrix).getByRole('row', { name: /Técnico/ });
  expect(within(tecnico).getAllByText('90%')).toHaveLength(3);
  // Pontuação geral 810, 820, 830: a maior é da 3ª e vem marcada.
  const geral = within(matrix).getByRole('row', { name: /Geral/ });
  expect(within(geral).getByText(/83%/)).toHaveTextContent('maior');
  expect(within(tecnico).queryByText('maior')).not.toBeInTheDocument();

  expect(screen.getByText('Positivo 1')).toBeInTheDocument();
  expect(screen.getByText('Negativo 3')).toBeInTheDocument();
  expect(screen.getByText('Skill 2')).toBeInTheDocument();
  expect(screen.getByText('Aderência 3')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Gerar parecer da IA' }));
  expect(compareInterviews).toHaveBeenCalledWith([1, 2, 3]);
  expect(screen.getByRole('button', { name: 'Gerando parecer...' })).toBeDisabled();

  resolveComparison({
    summary: 'O candidato 2 se destaca.',
    ranking: [
      { interview_id: 1, rank: 2, rationale: 'Boa comunicação' },
      { interview_id: 2, rank: 1, rationale: 'Mais experiência' },
      { interview_id: 3, rank: 3, rationale: 'Pouca vivência' },
    ],
  });

  expect(await screen.findByText('O candidato 2 se destaca.')).toBeInTheDocument();
  const items = screen.getAllByRole('listitem').filter((li) => li.textContent.includes(' — '));
  expect(items.map((li) => li.textContent)).toEqual([
    '1Candidato 2 — Mais experiência',
    '2Candidato 1 — Boa comunicação',
    '3Candidato 3 — Pouca vivência',
  ]);
});

test('erro ao gerar o parecer mostra o detail em toast', async () => {
  compareInterviews.mockRejectedValue({ detail: 'Selecione entrevistas do mesmo cargo.' });
  renderCompare('/vagas/3/comparar?ids=1,2');

  await userEvent.click(await screen.findByRole('button', { name: 'Gerar parecer da IA' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Selecione entrevistas do mesmo cargo.');
  expect(screen.getByRole('button', { name: 'Gerar parecer da IA' })).toBeEnabled();
});

test.each(['?ids=1', '?ids=1,2,3,4', ''])('comparar%s volta para a vaga', async (query) => {
  const { router } = renderCompare(`/vagas/3/comparar${query}`);
  await waitFor(() => expect(router.state.location.pathname).toBe('/vagas/3'));
  expect(getInterview).not.toHaveBeenCalled();
});
