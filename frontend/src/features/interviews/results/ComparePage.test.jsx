import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { AuthContext } from '../../../auth/AuthContext';
import { fakeAuthValue, LayoutOutlet } from '../../../test/render';
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
        { path: '/comparar', element: <ComparePage /> },
        { path: '/ranking', element: <p>Selecionar ranking</p> },
      ],
    },
  ], { initialEntries: [path] });
  const view = render(
    <AuthContext.Provider value={fakeAuthValue()}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  );
  return { router, ...view };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.alert = vi.fn();
  getInterview.mockImplementation((id) => Promise.resolve(detail(id)));
});

test('renderiza uma coluna por id e gera o parecer da IA', async () => {
  let resolveComparison;
  compareInterviews.mockReturnValue(new Promise((resolve) => { resolveComparison = resolve; }));
  renderCompare('/comparar?ids=1,2,3');

  expect(await screen.findByRole('heading', { name: 'Comparar candidatos' })).toBeInTheDocument();
  expect(await screen.findAllByRole('heading', { level: 3 })).toHaveLength(3);
  expect(getInterview.mock.calls).toEqual([[1], [2], [3]]);
  expect(screen.getByRole('heading', { name: 'Candidato 2' })).toBeInTheDocument();
  expect(screen.getByText('[Positivo 1]')).toBeInTheDocument();
  expect(screen.getByText('[Negativo 3]')).toBeInTheDocument();
  expect(screen.getByText('Skill 2')).toBeInTheDocument();
  expect(screen.getByText('Aderência 3')).toBeInTheDocument();
  expect(screen.getAllByText('Técnico: 90%')).toHaveLength(3);

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
  expect(screen.getByText('1. Candidato 2 — Mais experiência')).toBeInTheDocument();
  expect(screen.getByText('2. Candidato 1 — Boa comunicação')).toBeInTheDocument();
  expect(screen.getByText('3. Candidato 3 — Pouca vivência')).toBeInTheDocument();
});

test('erro ao gerar o parecer mostra o detail em alert', async () => {
  compareInterviews.mockRejectedValue({ detail: 'Selecione entrevistas do mesmo cargo.' });
  renderCompare('/comparar?ids=1,2');

  await userEvent.click(await screen.findByRole('button', { name: 'Gerar parecer da IA' }));

  await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Selecione entrevistas do mesmo cargo.'));
  expect(screen.getByRole('button', { name: 'Gerar parecer da IA' })).toBeEnabled();
});

test.each(['/comparar?ids=1', '/comparar?ids=1,2,3,4', '/comparar'])('%s volta para /ranking', async (path) => {
  const { router } = renderCompare(path);
  await waitFor(() => expect(router.state.location.pathname).toBe('/ranking'));
  expect(getInterview).not.toHaveBeenCalled();
});
