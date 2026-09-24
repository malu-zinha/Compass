/*
 * Fumaça de acessibilidade: cada tela principal renderizada com dados
 * realistas e verificada pelo axe. Contraste de cor fica de fora porque o jsdom
 * não aplica CSS — ele é garantido por `npm run check:contrast`, que mede os
 * pares de tokens nos dois temas.
 */
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { axe } from 'vitest-axe';
import * as matchers from 'vitest-axe/matchers';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLayout, renderWithRouter, TestProviders } from './render';

expect.extend(matchers);

const analysis = {
  summary: 'Boa base técnica.',
  speaker_roles: [{ speaker: 'A', role: 'interviewer' }, { speaker: 'B', role: 'candidate' }],
  qa_pairs: [{ question: 'Projeto recente?', answer: 'Design system.' }],
  skills: ['React'],
  experiences: [{ company: 'Loja', role: 'Frontend', description: 'UI' }],
  positives: ['Clareza'],
  negatives: ['Pouco teste E2E'],
  ideal_profile_fit: 'Boa aderência.',
  score: { overall: 820, subscores: { technical: 900, communication: 800, work_culture: 700, experience: 650 } },
};

const summary = (id, extra = {}) => ({
  id,
  candidate_name: `Candidata ${id}`,
  candidate_email: `c${id}@x.com`,
  position_id: 3,
  position_name: 'Frontend',
  interviewer_name: 'Ana',
  status: 'done',
  score: 700 + id * 10,
  positives: ['Clareza'],
  negatives: ['Pouco teste E2E'],
  audio_duration_seconds: 600,
  created_at: '2026-09-20T12:00:00Z',
  ...extra,
});

const detail = (id) => ({
  ...summary(id),
  candidate_phone: '85 9999',
  mode: 'upload',
  notes: 'Boa conversa.',
  error_message: null,
  recording_consent: true,
  has_audio: false,
  transcript: [
    { speaker: 'A', text: 'Pode se apresentar?', start_ms: 0, end_ms: 2000 },
    { speaker: 'B', text: 'Claro.', start_ms: 2500, end_ms: 4000 },
  ],
  analysis,
});

const position = { id: 3, name: 'Frontend', description: 'React e CSS', vacancies: 2, skills: ['React'], ideal_profile: 'Autônoma' };

vi.mock('../api/interviews', () => ({
  listInterviews: vi.fn(async () => ({ items: [summary(1), summary(2, { status: 'analyzing', score: null })], total: 2, page: 1, pages: 1 })),
  getInterview: vi.fn(async (id) => detail(Number(id))),
  listInterviewQuestions: vi.fn(async () => []),
  getAudioUrl: vi.fn(),
  createInterview: vi.fn(),
  updateInterview: vi.fn(),
  deleteInterview: vi.fn(),
  reprocessInterview: vi.fn(),
  uploadInterviewAudio: vi.fn(),
  setQuestionAsked: vi.fn(),
}));
vi.mock('../api/positions', () => ({
  listPositions: vi.fn(async () => ({ items: [position], total: 1 })),
  getPosition: vi.fn(async () => position),
  createPosition: vi.fn(),
  updatePosition: vi.fn(),
  deletePosition: vi.fn(),
}));
vi.mock('../api/questions', () => ({
  listQuestions: vi.fn(async () => [{ id: 1, text: 'Por que esta vaga?', position_id: null }]),
  createQuestion: vi.fn(),
  updateQuestion: vi.fn(),
  deleteQuestion: vi.fn(),
}));
vi.mock('../api/comparisons', () => ({ compareInterviews: vi.fn() }));
vi.mock('../auth/SettingsContext', () => ({
  useUserSettings: () => ({
    settings: {
      suggest_questions: true,
      suggestion_interval_seconds: 40,
      transcription_language: 'pt',
      auto_save_notes: true,
      timezone: 'America/Sao_Paulo',
      date_format: 'DD/MM/YYYY',
    },
    saveSettings: vi.fn(),
  }),
}));

const { default: LandingPage } = await import('../features/landing/LandingPage');
const { default: HomePage } = await import('../features/home/HomePage');
const { default: VagasPage } = await import('../features/vagas/lista/VagasPage');
const { default: VagaEditorPage } = await import('../features/vagas/editor/VagaEditorPage');
const { default: PerguntasPage } = await import('../features/perguntas/PerguntasPage');
const { default: EntrevistasPage } = await import('../features/entrevistas/lista/EntrevistasPage');
const { default: ComparePage } = await import('../features/interviews/results/ComparePage');
const { default: InterviewDetailPage } = await import('../features/interviews/detail/InterviewDetailPage');
const { default: SettingsPage } = await import('../features/settings/SettingsPage');
const { default: ProfilePage } = await import('../features/profile/ProfilePage');
const { default: NewInterviewPage } = await import('../features/interviews/new/NewInterviewPage');
const { default: NotFoundPage } = await import('../features/not-found/NotFoundPage');
const { default: AppLayout } = await import('../app/AppLayout');

// Contraste é coberto por check:contrast; `region` exigiria o shell inteiro em cada tela.
const OPTIONS = { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } };

// Rota com parâmetro (`pattern`) aberta num endereço concreto (`url`).
function renderAt(ui, pattern, url) {
  const router = createMemoryRouter([{ path: pattern, element: ui }], { initialEntries: [url] });
  return render(<TestProviders><RouterProvider router={router} /></TestProviders>);
}

async function expectAccessible(container) {
  expect(await axe(container, OPTIONS)).toHaveNoViolations();
}

describe('acessibilidade das telas (axe)', () => {
  it.each([
    ['Landing', () => renderWithRouter(<LandingPage />, '/'), 'Entrevistas que viram'],
    ['Início', () => renderWithLayout(<HomePage />, '/inicio'), 'Candidata 1'],
    ['Vagas', () => renderWithLayout(<VagasPage />, '/vagas'), 'React e CSS'],
    ['Perguntas', () => renderWithLayout(<PerguntasPage />, '/perguntas'), 'Por que esta vaga?'],
    ['Entrevistas', () => renderWithLayout(<EntrevistasPage />, '/entrevistas'), 'Candidata 2'],
    ['Configurações', () => renderWithLayout(<SettingsPage />, '/configuracoes'), 'Fuso horário'],
    ['Perfil', () => renderWithLayout(<ProfilePage />, '/perfil'), 'Informações pessoais'],
    ['Nova entrevista', () => renderWithLayout(<NewInterviewPage />, '/nova-entrevista'), 'Frontend'],
    ['404', () => renderWithRouter(<NotFoundPage />, '/x'), 'Esta página saiu do mapa'],
  ])('%s', async (_name, render, ready) => {
    const { container } = render();
    await screen.findAllByText(new RegExp(ready));
    await expectAccessible(container);
  });

  it('Editor de cargo', async () => {
    const { container } = renderAt(<VagaEditorPage />, '/vagas/:id/editar', '/vagas/3/editar');
    await screen.findByDisplayValue('Frontend');
    await expectAccessible(container);
  });

  it('Detalhe da entrevista', async () => {
    const { container } = renderAt(<InterviewDetailPage />, '/entrevista/:id', '/entrevista/1');
    await screen.findAllByText('Candidata 1');
    await expectAccessible(container);
  });

  it('Comparar', async () => {
    const { container } = renderAt(<ComparePage />, '/comparar', '/comparar?ids=1,2');
    await screen.findAllByText('Candidata 2');
    await expectAccessible(container);
  });

  it('Shell completo (sidebar, cabeçalho, conteúdo) com a regra de regiões ligada', async () => {
    const router = createMemoryRouter(
      [{ element: <AppLayout />, children: [{ path: '/inicio', element: <HomePage /> }] }],
      { initialEntries: ['/inicio'] },
    );
    const { container } = render(<TestProviders><RouterProvider router={router} /></TestProviders>);
    await screen.findAllByText('Candidata 1');
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations();
  });
});
