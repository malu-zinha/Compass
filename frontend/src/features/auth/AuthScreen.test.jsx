import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
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
