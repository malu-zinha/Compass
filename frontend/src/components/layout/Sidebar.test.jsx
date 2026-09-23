import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import Sidebar from './Sidebar';
import { TestProviders } from '../../test/render';

const user = { id: 1, name: 'Ana Souza', job_title: 'Recrutadora', email: 'ana@empresa.com' };

const renderSidebar = (logout = vi.fn()) => {
  render(
    <TestProviders auth={{ user, logout }}>
      <MemoryRouter initialEntries={['/inicio']}>
        <Sidebar isOpen onClose={() => {}} />
        <Routes>
          <Route path="/" element={<p>landing</p>} />
          <Route path="/inicio" element={<p>tela inicial</p>} />
        </Routes>
      </MemoryRouter>
    </TestProviders>,
  );
  return logout;
};

test('mostra nome, cargo e e-mail vindos do contexto', () => {
  renderSidebar();
  expect(screen.getByText('Ana Souza')).toBeInTheDocument();
  expect(screen.getByText('Recrutadora')).toBeInTheDocument();
  expect(screen.getByText('ana@empresa.com')).toBeInTheDocument();
});

test('clicar no e-mail chama logout e navega para /', async () => {
  const logout = vi.fn();
  renderSidebar(logout);
  await userEvent.click(screen.getByRole('button', { name: /ana@empresa\.com/i }));
  expect(logout).toHaveBeenCalled();
  expect(await screen.findByText('landing')).toBeInTheDocument();
});

test('item Configurações está habilitado e navega para /configuracoes', async () => {
  renderSidebar();
  const settingsItem = screen.getByRole('button', { name: 'Configurações' });
  expect(settingsItem).toBeEnabled();
  await userEvent.click(settingsItem);
});
