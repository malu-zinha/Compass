import { useEffect } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthContext } from '../../auth/AuthContext';
import { ApiError } from '../../api/client';
import AuthScreen from './AuthScreen';

test('login inválido mostra a mensagem da API', async () => {
  const login = vi.fn().mockRejectedValue(new ApiError(401, 'Usuário ou senha incorretos.'));
  render(<AuthContext.Provider value={{ login, register: vi.fn(), user: null }}><MemoryRouter><AuthScreen /></MemoryRouter></AuthContext.Provider>);
  await userEvent.type(screen.getByPlaceholderText('Usuário'), 'ana');
  await userEvent.type(screen.getByPlaceholderText('Senha'), 'errada');
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Usuário ou senha incorretos.');
  expect(login).toHaveBeenCalledWith('ana', 'errada');
});

function PathRecorder({ onChange }) {
  const location = useLocation();
  useEffect(() => { onChange(location.pathname); }, [location.pathname, onChange]);
  return null;
}

test('login bem-sucedido navega uma única vez para a rota de origem, sem timer posterior', async () => {
  const login = vi.fn().mockResolvedValue();
  const transitions = [];
  render(
    <AuthContext.Provider value={{ login, register: vi.fn(), user: null }}>
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: '/entrevista/7' } }]}>
        <PathRecorder onChange={(p) => transitions.push(p)} />
        <Routes>
          <Route path="/login" element={<AuthScreen />} />
          <Route path="/entrevista/7" element={<div>Entrevista 7</div>} />
          <Route path="/inicio" element={<div>Início</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );

  await userEvent.type(screen.getByPlaceholderText('Usuário'), 'ana');
  await userEvent.type(screen.getByPlaceholderText('Senha'), 'senha-forte-123');
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

  await waitFor(() => expect(screen.getByText('Entrevista 7')).toBeInTheDocument());
  expect(transitions).toEqual(['/login', '/entrevista/7']);

  vi.useFakeTimers();
  await act(async () => {
    vi.advanceTimersByTime(5000);
  });
  vi.useRealTimers();

  expect(transitions).toEqual(['/login', '/entrevista/7']);
  expect(screen.getByText('Entrevista 7')).toBeInTheDocument();
});
