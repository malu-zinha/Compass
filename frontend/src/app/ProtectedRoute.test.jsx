import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext';
import ProtectedRoute from './ProtectedRoute';

const renderAt = (value) => render(
  <AuthContext.Provider value={value}>
    <MemoryRouter initialEntries={['/inicio']}>
      <Routes>
        <Route path="/login" element={<p>tela de login</p>} />
        <Route element={<ProtectedRoute />}><Route path="/inicio" element={<p>área logada</p>} /></Route>
      </Routes>
    </MemoryRouter>
  </AuthContext.Provider>,
);

test('sem usuário redireciona para /login', () => {
  renderAt({ user: null, loading: false });
  expect(screen.getByText('tela de login')).toBeInTheDocument();
});

test('com usuário mostra a rota', () => {
  renderAt({ user: { id: 1, name: 'Ana' }, loading: false });
  expect(screen.getByText('área logada')).toBeInTheDocument();
});

test('erro de conexão mostra mensagem e botão de tentar novamente', () => {
  const retry = vi.fn();
  renderAt({ user: null, loading: false, connectionError: true, retry });
  expect(screen.getByText('Não foi possível conectar ao servidor.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
});
