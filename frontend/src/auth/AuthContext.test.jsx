import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { ApiError } from '../api/client';
import * as usersApi from '../api/users';

function Probe() {
  const { user, connectionError, retry } = useAuth();
  return (
    <div>
      <span data-testid="connectionError">{String(connectionError)}</span>
      <span data-testid="user">{user ? user.name : ''}</span>
      <button onClick={retry}>retry</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

test('erro de rede no getMe mantém o token e sinaliza connectionError', async () => {
  localStorage.setItem('compass.token', 'abc');
  vi.spyOn(usersApi, 'getMe').mockRejectedValue(new ApiError(0, 'Não foi possível conectar ao servidor.'));
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByTestId('connectionError')).toHaveTextContent('true'));
  expect(localStorage.getItem('compass.token')).toBe('abc');
});

test('retry chama getMe novamente e loga o usuário em caso de sucesso', async () => {
  localStorage.setItem('compass.token', 'abc');
  const getMeSpy = vi.spyOn(usersApi, 'getMe')
    .mockRejectedValueOnce(new ApiError(0, 'erro'))
    .mockResolvedValueOnce({ id: 1, name: 'Ana' });
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByTestId('connectionError')).toHaveTextContent('true'));
  await userEvent.click(screen.getByRole('button', { name: 'retry' }));
  await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Ana'));
  expect(getMeSpy).toHaveBeenCalledTimes(2);
});

test('401 desloga e limpa o token, sem marcar connectionError', async () => {
  localStorage.setItem('compass.token', 'abc');
  global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'Sessão inválida' }), { status: 401 }));
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(localStorage.getItem('compass.token')).toBeNull());
  expect(screen.getByTestId('user')).toHaveTextContent('');
  expect(screen.getByTestId('connectionError')).toHaveTextContent('false');
});
