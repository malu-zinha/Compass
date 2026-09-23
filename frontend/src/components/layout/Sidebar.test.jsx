import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import Sidebar from './Sidebar';
import { TestProviders } from '../../test/render';

const user = { id: 1, name: 'Ana Souza', job_title: 'Recrutadora', email: 'ana@empresa.com' };

function renderSidebar({ logout = vi.fn(), path = '/inicio', ...props } = {}) {
  render(
    <TestProviders auth={{ user, logout }}>
      <MemoryRouter initialEntries={[path]}>
        <Sidebar {...props} />
        <Routes>
          <Route path="/" element={<p>landing</p>} />
          <Route path="/inicio" element={<p>tela inicial</p>} />
          <Route path="/ranking" element={<p>tela ranking</p>} />
          <Route path="/configuracoes" element={<p>tela configurações</p>} />
        </Routes>
      </MemoryRouter>
    </TestProviders>,
  );
  return logout;
}

test('navegação principal com links, e a rota atual marcada', () => {
  renderSidebar({ path: '/inicio' });
  expect(screen.getByRole('complementary', { name: 'Navegação principal' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Ranking' })).not.toHaveAttribute('aria-current');
});

test('Ranking agora é alcançável pelo menu', async () => {
  const onNavigate = vi.fn();
  renderSidebar({ onNavigate });
  await userEvent.click(screen.getByRole('link', { name: 'Ranking' }));
  expect(await screen.findByText('tela ranking')).toBeInTheDocument();
  expect(onNavigate).toHaveBeenCalled();
});

test('menu de conta mostra nome e cargo, e abre com Perfil, Configurações e Sair', async () => {
  renderSidebar();
  const trigger = screen.getByRole('button', { name: /Ana Souza/ });
  expect(trigger).toHaveTextContent('Recrutadora');
  expect(trigger).toHaveAttribute('aria-expanded', 'false');

  await userEvent.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText('ana@empresa.com')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Perfil' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'Tema' })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('link', { name: 'Configurações' }));
  expect(await screen.findByText('tela configurações')).toBeInTheDocument();
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('Sair chama logout e volta para /', async () => {
  const logout = renderSidebar();
  await userEvent.click(screen.getByRole('button', { name: /Ana Souza/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
  expect(logout).toHaveBeenCalled();
  expect(await screen.findByText('landing')).toBeInTheDocument();
});

test('Esc fecha o menu de conta e devolve o foco ao botão', async () => {
  renderSidebar();
  const trigger = screen.getByRole('button', { name: /Ana Souza/ });
  await userEvent.click(trigger);
  await userEvent.keyboard('{Escape}');
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(trigger).toHaveFocus();
});

test('aberta como gaveta, foca o primeiro link e Esc dispensa', async () => {
  const onDismiss = vi.fn();
  renderSidebar({ open: true, onDismiss });
  expect(screen.getByRole('link', { name: 'Início' })).toHaveFocus();
  await userEvent.keyboard('{Escape}');
  expect(onDismiss).toHaveBeenCalled();
});
