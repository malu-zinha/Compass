import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { getInterview as getInterviewMock, listInterviewQuestions as listQuestionsMock } from '../../../api/interviews';
import { useInterview } from './useInterview';

vi.mock('../../../api/interviews', () => ({ getInterview: vi.fn(), listInterviewQuestions: vi.fn().mockResolvedValue([]) }));

beforeEach(() => {
  vi.clearAllMocks();
  getInterviewMock.mockReset();
  listQuestionsMock.mockReset().mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
});

test('faz polling enquanto processa e para em done', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const { getInterview } = await import('../../../api/interviews');
  getInterview.mockResolvedValueOnce({ id: 1, status: 'transcribing' }).mockResolvedValueOnce({ id: 1, status: 'done' });
  const { result } = renderHook(() => useInterview(1));
  await waitFor(() => expect(result.current.interview.status).toBe('transcribing'));
  await act(async () => { vi.advanceTimersByTime(3000); });
  await waitFor(() => expect(result.current.interview.status).toBe('done'));
  await act(async () => { vi.advanceTimersByTime(9000); });
  expect(getInterview).toHaveBeenCalledTimes(2);
  vi.useRealTimers();
});

test('erro (404) fica em error e não faz polling', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const { getInterview } = await import('../../../api/interviews');
  getInterview.mockRejectedValueOnce({ status: 404, detail: 'Entrevista não encontrada.' });
  const { result } = renderHook(() => useInterview(2));
  await waitFor(() => expect(result.current.error).toBeTruthy());
  expect(result.current.loading).toBe(false);
  await act(async () => { vi.advanceTimersByTime(9000); });
  expect(getInterview).toHaveBeenCalledTimes(1);
  vi.useRealTimers();
});

test('reload() busca de novo e retoma o polling', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const { getInterview } = await import('../../../api/interviews');
  getInterview.mockResolvedValueOnce({ id: 3, status: 'done' }).mockResolvedValueOnce({ id: 3, status: 'transcribing' });
  const { result } = renderHook(() => useInterview(3));
  await waitFor(() => expect(result.current.interview.status).toBe('done'));
  getInterview.mockResolvedValueOnce({ id: 3, status: 'done' });
  act(() => { result.current.reload(); });
  await waitFor(() => expect(result.current.interview.status).toBe('transcribing'));
  expect(getInterview).toHaveBeenCalledTimes(2);
  // O polling foi retomado: depois de 3s há uma nova busca, que termina em done.
  await act(async () => { vi.advanceTimersByTime(3000); });
  await waitFor(() => expect(result.current.interview.status).toBe('done'));
  expect(getInterview).toHaveBeenCalledTimes(3);
  await act(async () => { vi.advanceTimersByTime(9000); });
  expect(getInterview).toHaveBeenCalledTimes(3);
});

test('para o polling ao desmontar', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const { getInterview } = await import('../../../api/interviews');
  getInterview.mockResolvedValue({ id: 4, status: 'analyzing' });
  const { result, unmount } = renderHook(() => useInterview(4));
  await waitFor(() => expect(result.current.interview.status).toBe('analyzing'));
  unmount();
  await act(async () => { vi.advanceTimersByTime(9000); });
  expect(getInterview).toHaveBeenCalledTimes(1);
});

test('ao trocar de id, descarta a entrevista anterior e o polling dela', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const { getInterview } = await import('../../../api/interviews');
  getInterview.mockImplementation(async (id) => ({ id, status: id === 5 ? 'transcribing' : 'done' }));
  const { result, rerender } = renderHook(({ id }) => useInterview(id), { initialProps: { id: 5 } });
  await waitFor(() => expect(result.current.interview.id).toBe(5));
  rerender({ id: 6 });
  expect(result.current.interview).toBeNull();
  await waitFor(() => expect(result.current.interview.id).toBe(6));
  await act(async () => { vi.advanceTimersByTime(9000); });
  expect(getInterview.mock.calls).toEqual([[5], [6]]);
});

test('erro transitório no polling não para o ciclo e termina em done', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  getInterviewMock
    .mockResolvedValueOnce({ id: 8, status: 'transcribing' })
    .mockRejectedValueOnce({ status: 0, detail: 'Não foi possível conectar ao servidor.' })
    .mockResolvedValueOnce({ id: 8, status: 'done' });
  const { result } = renderHook(() => useInterview(8));
  await waitFor(() => expect(result.current.interview.status).toBe('transcribing'));
  await act(async () => { vi.advanceTimersByTime(3000); });
  await waitFor(() => expect(result.current.error).toEqual(expect.objectContaining({ status: 0 })));
  expect(result.current.interview.status).toBe('transcribing');
  await act(async () => { vi.advanceTimersByTime(3000); });
  await waitFor(() => expect(result.current.interview.status).toBe('done'));
  expect(result.current.error).toBeNull();
  await act(async () => { vi.advanceTimersByTime(30000); });
  expect(getInterviewMock).toHaveBeenCalledTimes(3);
});

test('falhas seguidas usam backoff de 3s, 6s, 12s, até 15s', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  getInterviewMock.mockRejectedValue({ status: 500, detail: 'Erro interno.' });
  renderHook(() => useInterview(9));
  await waitFor(() => expect(getInterviewMock).toHaveBeenCalledTimes(1));
  const expectCallsAfter = async (ms, calls) => {
    await act(async () => { vi.advanceTimersByTime(ms); });
    await waitFor(() => expect(getInterviewMock).toHaveBeenCalledTimes(calls));
  };
  await expectCallsAfter(3000, 2);
  await expectCallsAfter(5000, 2);
  await expectCallsAfter(1000, 3);
  await expectCallsAfter(11000, 3);
  await expectCallsAfter(1000, 4);
  await expectCallsAfter(15000, 5);
  await expectCallsAfter(15000, 6);
});

test('falha nas perguntas não descarta a entrevista nem para o polling', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  getInterviewMock
    .mockResolvedValueOnce({ id: 10, status: 'analyzing' })
    .mockResolvedValueOnce({ id: 10, status: 'analyzing', score: 1 })
    .mockResolvedValueOnce({ id: 10, status: 'done' });
  listQuestionsMock
    .mockResolvedValueOnce([{ id: 1, text: 'Pergunta', asked: true }])
    .mockRejectedValueOnce({ status: 0, detail: 'Falha de rede.' });
  const { result } = renderHook(() => useInterview(10));
  await waitFor(() => expect(result.current.questions).toHaveLength(1));
  await act(async () => { vi.advanceTimersByTime(3000); });
  await waitFor(() => expect(result.current.interview.score).toBe(1));
  expect(result.current.questions).toHaveLength(1);
  expect(result.current.error).toBeNull();
  await act(async () => { vi.advanceTimersByTime(3000); });
  await waitFor(() => expect(result.current.interview.status).toBe('done'));
});
