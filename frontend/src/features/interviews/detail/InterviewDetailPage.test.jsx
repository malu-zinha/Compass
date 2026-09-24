import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { TestProviders, fakeAuthValue, LayoutOutlet } from '../../../test/render';
import InterviewDetailPage from './InterviewDetailPage';

vi.mock('./useInterview', () => ({ useInterview: vi.fn() }));
vi.mock('../../../api/interviews', () => ({
  getAudioUrl: vi.fn(),
  reprocessInterview: vi.fn().mockResolvedValue(null),
  updateInterview: vi.fn().mockResolvedValue(null),
  deleteInterview: vi.fn().mockResolvedValue(null),
}));
vi.mock('../../../auth/SettingsContext', () => ({
  useUserSettings: () => ({ settings: { timezone: 'UTC', date_format: 'DD/MM/YYYY' } }),
}));

const baseInterview = {
  id: 1,
  candidate_name: 'Bruno Lima',
  candidate_email: 'bruno@example.com',
  candidate_phone: '11888887777',
  notes: '',
  status: 'done',
  error_message: null,
  has_audio: false,
  transcript: [],
  audio_duration_seconds: null,
  position_name: 'Dev Backend',
  created_at: '2026-01-10T12:00:00Z',
  analysis: {
    summary: 'Bom candidato',
    speaker_roles: [],
    qa_pairs: [],
    skills: [],
    experiences: [],
    positives: [],
    negatives: [],
    ideal_profile_fit: null,
    score: null,
  },
};

function renderDetail(path = '/entrevista/1') {
  const router = createMemoryRouter([
    {
      element: <LayoutOutlet />,
      children: [
        { path: '/entrevista/:id', element: <InterviewDetailPage /> },
        { path: '/entrevistas', element: <p>Lista de entrevistas</p> },
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
});

test('(a) done com analysis.qa_pairs mostra as perguntas na aba Perguntas', async () => {
  const { useInterview } = await import('./useInterview');
  useInterview.mockReturnValue({
    interview: {
      ...baseInterview,
      analysis: {
        ...baseInterview.analysis,
        qa_pairs: [{ question: 'Qual sua experiência com Python?', answer: 'Cinco anos.' }],
      },
    },
    questions: [],
    loading: false,
    error: null,
    reload: vi.fn(),
  });

  renderDetail();

  expect(screen.getByRole('tab', { name: 'Resumo' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.queryByText('Qual sua experiência com Python?')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('tab', { name: 'Perguntas' }));
  expect(screen.getByRole('heading', { name: 'Perguntas e respostas' })).toBeInTheDocument();
  expect(screen.getByText('Qual sua experiência com Python?')).toBeInTheDocument();
  expect(screen.getByText(/Cinco anos\./)).toBeInTheDocument();
});

test('(b) error com transcrição chama reprocessInterview(id, "analysis")', async () => {
  const { useInterview } = await import('./useInterview');
  const { reprocessInterview } = await import('../../../api/interviews');
  const reload = vi.fn();
  useInterview.mockReturnValue({
    interview: {
      ...baseInterview,
      status: 'error',
      error_message: 'Falha na análise. Tente novamente.',
      transcript: [{ speaker: 'A', text: 'Oi', start_ms: 0, end_ms: 500 }],
      analysis: null,
    },
    questions: [],
    loading: false,
    error: null,
    reload,
  });

  renderDetail();

  expect(screen.getByText('Falha na análise. Tente novamente.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await waitFor(() => expect(reprocessInterview).toHaveBeenCalledWith('1', 'analysis'));
  await waitFor(() => expect(reload).toHaveBeenCalled());
});

test('(b) error sem transcrição chama reprocessInterview(id, "full")', async () => {
  const { useInterview } = await import('./useInterview');
  const { reprocessInterview } = await import('../../../api/interviews');
  useInterview.mockReturnValue({
    interview: {
      ...baseInterview,
      status: 'error',
      error_message: 'Falha na transcrição.',
      transcript: null,
      analysis: null,
    },
    questions: [],
    loading: false,
    error: null,
    reload: vi.fn(),
  });

  renderDetail();

  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await waitFor(() => expect(reprocessInterview).toHaveBeenCalledWith('1', 'full'));
});

test('(c) Excluir entrevista com confirm true chama deleteInterview e navega para /entrevistas', async () => {
  const { useInterview } = await import('./useInterview');
  const { deleteInterview } = await import('../../../api/interviews');
  useInterview.mockReturnValue({
    interview: baseInterview,
    questions: [],
    loading: false,
    error: null,
    reload: vi.fn(),
  });

  const { router } = renderDetail();

  await userEvent.click(screen.getByRole('button', { name: 'Excluir entrevista' }));

  const dialog = screen.getByRole('alertdialog', { name: 'Excluir entrevista' });
  expect(dialog).toHaveTextContent('Excluir esta entrevista e a gravação? Esta ação não pode ser desfeita.');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }));
  await waitFor(() => expect(deleteInterview).toHaveBeenCalledWith('1'));
  await waitFor(() => expect(router.state.location.pathname).toBe('/entrevistas'));
});

test('(d) transcribing mostra "Transcrevendo o áudio..."', async () => {
  const { useInterview } = await import('./useInterview');
  useInterview.mockReturnValue({
    interview: { ...baseInterview, status: 'transcribing', analysis: null },
    questions: [],
    loading: false,
    error: null,
    reload: vi.fn(),
  });

  renderDetail();

  expect(screen.getAllByText('Transcrevendo o áudio...').length).toBeGreaterThan(0);
});
