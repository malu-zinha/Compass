import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { TestProviders, fakeAuthValue } from '../../../test/render';
import {
  getInterview, listInterviewQuestions, setQuestionAsked, updateInterview,
} from '../../../api/interviews';
import { useLiveSession } from './useLiveSession';
import { useMicrophonePcm } from './useMicrophonePcm';
import RecordPage from './RecordPage';

const settingsValue = vi.hoisted(() => ({ settings: { auto_save_notes: true } }));

vi.mock('../../../api/interviews', () => ({
  getInterview: vi.fn(),
  listInterviewQuestions: vi.fn(),
  setQuestionAsked: vi.fn(),
  updateInterview: vi.fn(),
}));
vi.mock('../../../auth/SettingsContext', () => ({ useUserSettings: () => settingsValue }));
vi.mock('./useLiveSession', () => ({ useLiveSession: vi.fn() }));
vi.mock('./useMicrophonePcm', () => ({ useMicrophonePcm: vi.fn() }));

const NOTES_PLACEHOLDER = 'Aqui serão anotados detalhes adicionais sobre a entrevista!';
const registered = { id: 11, text: 'Fale sobre você', source: 'registered', based_on: '', asked: false };
let session;
let mic;
let auth;

function renderRecordPage() {
  const router = createMemoryRouter(
    [
      { path: '/gravar/:id', element: <RecordPage /> },
      { path: '/entrevista/:id', element: <p>detalhe</p> },
    ],
    { initialEntries: ['/gravar/7'] },
  );
  render(
    <TestProviders auth={auth}>
      <RouterProvider router={router} />
    </TestProviders>,
  );
  return router;
}

beforeEach(() => {
  vi.clearAllMocks();
  settingsValue.settings = { auto_save_notes: true };
  auth = fakeAuthValue();
  session = {
    status: 'live',
    turns: [],
    suggestions: [],
    errorMessage: null,
    sendAudio: vi.fn(),
    stop: vi.fn().mockResolvedValue(undefined),
  };
  mic = { start: vi.fn().mockResolvedValue(undefined), stop: vi.fn(), error: null };
  useLiveSession.mockImplementation(() => session);
  useMicrophonePcm.mockImplementation(() => mic);
  getInterview.mockResolvedValue({ id: 7, status: 'recording', notes: '' });
  listInterviewQuestions.mockResolvedValue([registered]);
  setQuestionAsked.mockResolvedValue({ ...registered, asked: true });
  updateInterview.mockResolvedValue({ id: 7 });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('liga o microfone quando a sessão fica ao vivo e usa o token da sessão', async () => {
  renderRecordPage();
  await screen.findByText('Fale sobre você');

  expect(useLiveSession).toHaveBeenCalledWith('7', 'tok', expect.any(Object));
  expect(useMicrophonePcm).toHaveBeenCalledWith({ onChunk: session.sendAudio });
  expect(mic.start).toHaveBeenCalledTimes(1);
  expect(screen.getByText('● AO VIVO')).toBeInTheDocument();
});

test('clicar na pergunta marca como feita', async () => {
  renderRecordPage();
  await userEvent.click(await screen.findByText('Fale sobre você'));

  expect(setQuestionAsked).toHaveBeenCalledWith('7', 11, true);
  expect(screen.getByText('Fale sobre você').closest('.question-item')).toHaveClass('selected');
});

test('lista cadastradas e sugestões da IA sem duplicar ids', async () => {
  session.suggestions = [
    { id: 12, text: 'Pode dar um exemplo?', source: 'ai', based_on: '', asked: false },
    registered,
  ];
  renderRecordPage();
  await screen.findByText('Fale sobre você');

  expect(screen.getAllByText('Fale sobre você')).toHaveLength(1);
  expect(screen.getByText('Pode dar um exemplo?')).toBeInTheDocument();
  expect(screen.getByText('IA')).toBeInTheDocument();
  expect(screen.getByText('Cadastrada')).toBeInTheDocument();
});

test('Encerrar gravação para a sessão e o microfone, salva as anotações e vai para o detalhe', async () => {
  settingsValue.settings = { auto_save_notes: false };
  const router = renderRecordPage();
  await screen.findByText('Fale sobre você');
  fireEvent.change(screen.getByPlaceholderText(NOTES_PLACEHOLDER), { target: { value: 'Boa comunicação' } });

  await userEvent.click(screen.getByRole('button', { name: 'Encerrar gravação' }));

  await waitFor(() => expect(router.state.location.pathname).toBe('/entrevista/7'));
  expect(session.stop).toHaveBeenCalledTimes(1);
  expect(mic.stop).toHaveBeenCalled();
  expect(updateInterview).toHaveBeenCalledWith('7', { notes: 'Boa comunicação' });
  expect(session.stop.mock.invocationCallOrder[0]).toBeLessThan(mic.stop.mock.invocationCallOrder[0]);
  expect(mic.stop.mock.invocationCallOrder[0]).toBeLessThan(updateInterview.mock.invocationCallOrder[0]);
});

test('entrevista já encerrada redireciona para o detalhe', async () => {
  getInterview.mockResolvedValue({ id: 7, status: 'done', notes: '' });
  const router = renderRecordPage();

  await waitFor(() => expect(router.state.location.pathname).toBe('/entrevista/7'));
});

test('sessão recusada (4409) leva ao detalhe e 4401 desloga', async () => {
  const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
  const router = renderRecordPage();
  await screen.findByText('Fale sobre você');
  const options = useLiveSession.mock.calls.at(-1)[2];

  expect(options.onUnauthorized).toBe(auth.logout);
  act(() => { options.onRejected(4409); });
  await waitFor(() => expect(router.state.location.pathname).toBe('/entrevista/7'));
  expect(alertSpy).not.toHaveBeenCalled();
});

test('sessão assumida por outra aba (4000) avisa e vai para o detalhe', async () => {
  const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
  const router = renderRecordPage();
  await screen.findByText('Fale sobre você');
  const options = useLiveSession.mock.calls.at(-1)[2];

  act(() => { options.onRejected(4000); });
  expect(alertSpy).toHaveBeenCalledWith('Esta entrevista foi aberta em outra aba ou janela.');
  await waitFor(() => expect(router.state.location.pathname).toBe('/entrevista/7'));
});

test('com auto_save_notes, salva as anotações 2s depois de digitar', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  renderRecordPage();
  await screen.findByText('Fale sobre você');

  fireEvent.change(screen.getByPlaceholderText(NOTES_PLACEHOLDER), { target: { value: 'Ótimo' } });
  act(() => { vi.advanceTimersByTime(1500); });
  expect(updateInterview).not.toHaveBeenCalled();
  act(() => { vi.advanceTimersByTime(600); });
  expect(updateInterview).toHaveBeenCalledWith('7', { notes: 'Ótimo' });
});

test('sem auto_save_notes, não salva as anotações sozinho', async () => {
  settingsValue.settings = { auto_save_notes: false };
  vi.useFakeTimers({ shouldAdvanceTime: true });
  renderRecordPage();
  await screen.findByText('Fale sobre você');

  fireEvent.change(screen.getByPlaceholderText(NOTES_PLACEHOLDER), { target: { value: 'Ótimo' } });
  act(() => { vi.advanceTimersByTime(5000); });
  expect(updateInterview).not.toHaveBeenCalled();
});

test('mostra a mensagem de erro da sessão', async () => {
  session.status = 'reconnecting';
  session.errorMessage = 'Falha na transcrição.';
  renderRecordPage();
  await screen.findByText('Fale sobre você');

  expect(screen.getByText('⚠ Conectando...')).toBeInTheDocument();
  expect(screen.getByText('Falha na transcrição.')).toBeInTheDocument();
  expect(mic.start).not.toHaveBeenCalled();
});
