import { beforeEach, expect, test, vi } from 'vitest';
import { ApiError, request, setAuthToken, setUnauthorizedHandler } from './client';

beforeEach(() => { global.fetch = vi.fn(); setAuthToken(null); });

test('envia token e JSON', async () => {
  fetch.mockResolvedValue(new Response(JSON.stringify({ ok: 1 }), { status: 200 }));
  setAuthToken('abc');
  await request('/positions', { method: 'POST', body: { name: 'X' } });
  const [url, init] = fetch.mock.calls[0];
  expect(url).toBe('http://localhost:8000/positions');
  expect(init.headers.Authorization).toBe('Bearer abc');
  expect(init.body).toBe('{"name":"X"}');
});

test('401 com token chama o handler de logout', async () => {
  const handler = vi.fn(); setUnauthorizedHandler(handler); setAuthToken('abc');
  fetch.mockResolvedValue(new Response(JSON.stringify({ detail: 'Sessão inválida' }), { status: 401 }));
  await expect(request('/users/me')).rejects.toMatchObject({ status: 401, detail: 'Sessão inválida' });
  expect(handler).toHaveBeenCalled();
});

test('422 do FastAPI vira mensagem legível', async () => {
  fetch.mockResolvedValue(new Response(JSON.stringify({ detail: [{ msg: 'Field required' }] }), { status: 422 }));
  await expect(request('/x')).rejects.toThrow('Field required');
});

test('falha de rede vira ApiError status 0', async () => {
  fetch.mockRejectedValue(new TypeError('Failed to fetch'));
  const error = await request('/x').catch((e) => e);
  expect(error).toBeInstanceOf(ApiError);
  expect(error.status).toBe(0);
});

test('204 retorna null', async () => {
  fetch.mockResolvedValue(new Response(null, { status: 204 }));
  expect(await request('/x', { method: 'DELETE' })).toBeNull();
});
