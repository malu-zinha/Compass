import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useLiveSession } from './useLiveSession';

class MockSocket {
  static instances = [];
  constructor(url) { this.url = url; this.sent = []; this.readyState = 0; MockSocket.instances.push(this); }
  send(data) { this.sent.push(data); }
  close() { this.readyState = 3; this.onclose?.({ code: 1000 }); }
  open() { this.readyState = 1; this.onopen?.(); }
  message(data) { this.onmessage?.({ data: JSON.stringify(data) }); }
  drop() { this.readyState = 3; this.onclose?.({ code: 1006 }); }
  closeWith(code) { this.readyState = 3; this.onclose?.({ code }); }
}
MockSocket.OPEN = 1;

beforeEach(() => { MockSocket.instances = []; vi.stubGlobal('WebSocket', MockSocket); vi.useFakeTimers({ shouldAdvanceTime: true }); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

test('autentica na abertura e substitui o texto do turno', () => {
  const { result } = renderHook(() => useLiveSession(5, 'tok'));
  const ws = MockSocket.instances[0];
  act(() => ws.open());
  expect(JSON.parse(ws.sent[0])).toEqual({ type: 'auth', token: 'tok' });
  act(() => ws.message({ type: 'ready' }));
  act(() => ws.message({ type: 'transcript', turn_id: 1, text: 'olá', is_final: false }));
  act(() => ws.message({ type: 'transcript', turn_id: 1, text: 'Olá, tudo bem?', is_final: true }));
  expect(result.current.status).toBe('live');
  expect(result.current.turns).toEqual([{ turn_id: 1, text: 'Olá, tudo bem?', is_final: true }]);
});

test('guarda o áudio durante a reconexão e reenvia ao reconectar', async () => {
  const { result } = renderHook(() => useLiveSession(5, 'tok'));
  act(() => { MockSocket.instances[0].open(); MockSocket.instances[0].message({ type: 'ready' }); });
  act(() => MockSocket.instances[0].drop());
  expect(result.current.status).toBe('reconnecting');
  const chunk = new Int16Array(1600).buffer;
  act(() => result.current.sendAudio(chunk));
  await act(async () => { vi.advanceTimersByTime(1000); });
  const ws2 = MockSocket.instances[1];
  act(() => { ws2.open(); ws2.message({ type: 'ready' }); });
  expect(ws2.sent).toContain(chunk);
});

test('stop envia {type:stop}, resolve em session_ended e não reconecta', async () => {
  const { result } = renderHook(() => useLiveSession(5, 'tok'));
  const ws = MockSocket.instances[0];
  act(() => { ws.open(); ws.message({ type: 'ready' }); });
  let done = false;
  act(() => { result.current.stop().then(() => { done = true; }); });
  expect(JSON.parse(ws.sent.at(-1))).toEqual({ type: 'stop' });
  act(() => ws.message({ type: 'session_ended' }));
  await waitFor(() => expect(done).toBe(true));
  await act(async () => { vi.advanceTimersByTime(20000); });
  expect(MockSocket.instances).toHaveLength(1);
});

test('adiciona sugestões recebidas sem duplicar ids', () => {
  const { result } = renderHook(() => useLiveSession(5, 'tok'));
  const ws = MockSocket.instances[0];
  const q = { id: 3, text: 'Pode dar um exemplo?', source: 'ai', based_on: '', asked: false };
  act(() => { ws.open(); ws.message({ type: 'suggestions', questions: [q] }); ws.message({ type: 'suggestions', questions: [q] }); });
  expect(result.current.suggestions).toEqual([q]);
});

test('4401 chama onUnauthorized e não reconecta', async () => {
  const onUnauthorized = vi.fn();
  const { result } = renderHook(() => useLiveSession(5, 'expirado', { onUnauthorized }));
  const ws = MockSocket.instances[0];
  act(() => { ws.open(); ws.closeWith(4401); });
  expect(onUnauthorized).toHaveBeenCalledTimes(1);
  expect(result.current.status).toBe('closed');
  await act(async () => { vi.advanceTimersByTime(20000); });
  expect(MockSocket.instances).toHaveLength(1);
});

test('4409 chama onRejected com o código e não reconecta', async () => {
  const onRejected = vi.fn();
  const { result } = renderHook(() => useLiveSession(5, 'tok', { onRejected }));
  act(() => { MockSocket.instances[0].open(); MockSocket.instances[0].closeWith(4409); });
  expect(onRejected).toHaveBeenCalledWith(4409);
  expect(result.current.status).toBe('closed');
  await act(async () => { vi.advanceTimersByTime(20000); });
  expect(MockSocket.instances).toHaveLength(1);
});

test('4000 depois do stop resolve o stop() e encerra com sucesso', async () => {
  const { result } = renderHook(() => useLiveSession(5, 'tok'));
  const ws = MockSocket.instances[0];
  act(() => { ws.open(); ws.message({ type: 'ready' }); });
  let done = false;
  act(() => { result.current.stop().then(() => { done = true; }); });
  act(() => ws.closeWith(4000));
  await waitFor(() => expect(done).toBe(true));
  expect(result.current.status).toBe('ended');
  await act(async () => { vi.advanceTimersByTime(20000); });
  expect(MockSocket.instances).toHaveLength(1);
});

test('4000 sem stop reconecta como uma queda', async () => {
  const { result } = renderHook(() => useLiveSession(5, 'tok'));
  act(() => { MockSocket.instances[0].open(); MockSocket.instances[0].message({ type: 'ready' }); });
  act(() => MockSocket.instances[0].closeWith(4000));
  expect(result.current.status).toBe('reconnecting');
  await act(async () => { vi.advanceTimersByTime(1000); });
  expect(MockSocket.instances).toHaveLength(2);
});

test('reconecta com backoff crescente (1s, 2s)', async () => {
  renderHook(() => useLiveSession(5, 'tok'));
  act(() => MockSocket.instances[0].drop());
  await act(async () => { vi.advanceTimersByTime(1000); });
  expect(MockSocket.instances).toHaveLength(2);
  act(() => MockSocket.instances[1].drop());
  await act(async () => { vi.advanceTimersByTime(1500); });
  expect(MockSocket.instances).toHaveLength(2);
  await act(async () => { vi.advanceTimersByTime(500); });
  expect(MockSocket.instances).toHaveLength(3);
});

test('limita o buffer a 300 chunks, descartando os mais antigos, e envia em ordem', () => {
  const { result } = renderHook(() => useLiveSession(5, 'tok'));
  const chunks = Array.from({ length: 305 }, () => new ArrayBuffer(2));
  act(() => chunks.forEach((chunk) => result.current.sendAudio(chunk)));
  const ws = MockSocket.instances[0];
  act(() => { ws.open(); ws.message({ type: 'ready' }); });
  expect(ws.sent.slice(1)).toHaveLength(300);
  expect(ws.sent.slice(1).every((data, i) => data === chunks[i + 5])).toBe(true);
});
