import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useInterview } from './useInterview';

vi.mock('../../../api/interviews', () => ({ getInterview: vi.fn(), listInterviewQuestions: vi.fn().mockResolvedValue([]) }));

beforeEach(() => {
  vi.clearAllMocks();
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
  act(() => { result.current.reload(); });
  await waitFor(() => expect(result.current.interview.status).toBe('transcribing'));
  expect(getInterview).toHaveBeenCalledTimes(2);
  vi.useRealTimers();
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
