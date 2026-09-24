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
          <Route path="/vagas" element={<p>tela vagas</p>} />
          <Route path="/conta" element={<p>tela conta</p>} />
          <Route path="/nova-entrevista" element={<p>tela nova entrevista</p>} />
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
  expect(screen.getByRole('link', { name: 'Vagas' })).not.toHaveAttribute('aria-current');
  expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(
    expect.arrayContaining(['Início', 'Entrevistas', 'Vagas', 'Perguntas gerais']),
  );
});

test('Nova entrevista fica na sidebar e fecha a gaveta ao navegar', async () => {
  const onNavigate = vi.fn();
  renderSidebar({ onNavigate });
  await userEvent.click(screen.getByRole('link', { name: 'Nova entrevista' }));
  expect(await screen.findByText('tela nova entrevista')).toBeInTheDocument();
  expect(onNavigate).toHaveBeenCalled();
});

test('menu de conta mostra nome e cargo, e abre com tema, Minha conta e Sair', async () => {
  renderSidebar();
  const trigger = screen.getByRole('button', { name: /Ana Souza/ });
  expect(trigger).toHaveTextContent('Recrutadora');
  expect(trigger).toHaveAttribute('aria-expanded', 'false');

  await userEvent.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText('ana@empresa.com')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Minha conta' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'Tema' })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('link', { name: 'Minha conta' }));
  expect(await screen.findByText('tela conta')).toBeInTheDocument();
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
