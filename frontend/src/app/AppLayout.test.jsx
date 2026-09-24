import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import AppLayout from './AppLayout';
import { PageHeader } from '../components/layout';
import { Button } from '../components/ui';
import { TestProviders } from '../test/render';

function Page() {
  return (
    <>
      <PageHeader title="Cargos" actions={<Button>Exportar</Button>} />
      <p>conteúdo da página</p>
    </>
  );
}

function Broken() {
  throw new Error('quebrou');
}

function renderLayout(path = '/cargos') {
  return render(
    <TestProviders>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/cargos" element={<Page />} />
            <Route path="/quebrada" element={<Broken />} />
            <Route path="/inicio" element={<p>início</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </TestProviders>,
  );
}

test('a página preenche título e ações do cabeçalho do layout', async () => {
  renderLayout();
  const banner = screen.getByRole('banner');
  expect(await screen.findByRole('heading', { level: 1, name: 'Cargos' })).toBeInTheDocument();
  expect(banner).toContainElement(screen.getByRole('heading', { level: 1, name: 'Cargos' }));
  expect(banner).toContainElement(screen.getByRole('button', { name: 'Exportar' }));
  expect(banner).not.toContainElement(screen.getByRole('link', { name: 'Nova entrevista' }));
  expect(screen.getByRole('complementary', { name: 'Navegação principal' })).toContainElement(
    screen.getByRole('link', { name: 'Nova entrevista' }),
  );
  expect(document.title).toBe('Cargos · Compass');
});

test('conteúdo fica num <main> alcançável pelo link de pular', () => {
  renderLayout();
  expect(screen.getByRole('main')).toHaveTextContent('conteúdo da página');
  expect(screen.getByRole('link', { name: 'Pular para o conteúdo' })).toHaveAttribute('href', '#conteudo');
});

test('botão de menu abre a gaveta e Esc devolve o foco a ele', async () => {
  renderLayout();
  const menu = screen.getByRole('button', { name: 'Abrir menu' });
  expect(menu).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(menu);
  expect(menu).toHaveAttribute('aria-expanded', 'true');
  await userEvent.keyboard('{Escape}');
  expect(menu).toHaveAttribute('aria-expanded', 'false');
  expect(menu).toHaveFocus();
});

test('erro numa tela mantém a navegação de pé', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  renderLayout('/quebrada');
  expect(screen.getByRole('alert')).toHaveTextContent('Algo deu errado');
  expect(screen.getByRole('link', { name: 'Início' })).toBeInTheDocument();
  spy.mockRestore();
});
