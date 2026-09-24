import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { TestProviders, renderWithLayout, LayoutOutlet, fakeAuthValue } from '../../../test/render';
import VagaEditorPage from './VagaEditorPage';

vi.mock('../../../api/positions', () => ({
  createPosition: vi.fn().mockResolvedValue({ id: 1 }),
  getPosition: vi.fn(),
  updatePosition: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test('salva o perfil ideal junto com a vaga', async () => {
  const { createPosition } = await import('../../../api/positions');
  renderWithLayout(<VagaEditorPage />, '/vagas/nova');

  await userEvent.type(screen.getByLabelText(/^Nome/), 'Dev Python');
  await userEvent.type(screen.getByLabelText(/^Descrição da vaga/), 'Vaga para dev backend');
  await userEvent.type(screen.getByLabelText(/^Competências necessárias/), 'Python{Enter}');
  await userEvent.type(screen.getByLabelText('Perfil ideal'), 'Autônomo');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar vaga' }));

  expect(createPosition).toHaveBeenCalledWith(expect.objectContaining({
    name: 'Dev Python',
    ideal_profile: 'Autônomo',
    skills: expect.arrayContaining(['Python']),
  }));
});

test('carrega o perfil ideal ao editar uma vaga existente', async () => {
  const { getPosition } = await import('../../../api/positions');
  getPosition.mockResolvedValue({
    id: 5,
    name: 'Dev Node',
    description: 'Vaga Node',
    vacancies: 2,
    skills: ['Node'],
    ideal_profile: 'Proativo',
  });

  render(
    <TestProviders auth={fakeAuthValue()}>
      <MemoryRouter initialEntries={['/vagas/5/editar']}>
        <Routes>
          <Route element={<LayoutOutlet />}>
            <Route path="/vagas/:id/editar" element={<VagaEditorPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </TestProviders>,
  );

  expect(await screen.findByDisplayValue('Proativo')).toBeInTheDocument();
  expect(screen.getByDisplayValue('Dev Node')).toBeInTheDocument();
});

test('campos obrigatórios vazios mostram erro no campo e não salvam', async () => {
  const { createPosition } = await import('../../../api/positions');
  renderWithLayout(<VagaEditorPage />, '/vagas/nova');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar vaga' }));
  expect(screen.getByLabelText(/^Nome/)).toHaveAccessibleDescription('Dê um nome à vaga.');
  expect(screen.getByLabelText(/^Competências necessárias/)).toHaveAttribute('aria-invalid', 'true');
  expect(createPosition).not.toHaveBeenCalled();
});

test('competências: vírgula adiciona, duplicata é ignorada e o chip remove', async () => {
  renderWithLayout(<VagaEditorPage />, '/vagas/nova');
  const input = screen.getByLabelText(/^Competências necessárias/);
  await userEvent.type(input, 'SQL,sql{Enter}Python{Enter}');
  expect(screen.getAllByText(/^(SQL|Python)$/)).toHaveLength(2);
  await userEvent.click(screen.getByRole('button', { name: 'Remover SQL' }));
  expect(screen.queryByText('SQL')).not.toBeInTheDocument();
});

test('criar leva para a página da vaga nova', async () => {
  const { createPosition } = await import('../../../api/positions');
  createPosition.mockResolvedValue({ id: 12 });
  const { renderWithRouter } = await import('../../../test/render');
  const { router } = renderWithRouter(<VagaEditorPage />, '/vagas/nova', ['/vagas/:id']);
  await userEvent.type(screen.getByLabelText(/^Nome/), 'QA');
  await userEvent.type(screen.getByLabelText(/^Descrição da vaga/), 'Testes');
  await userEvent.type(screen.getByLabelText(/^Competências necessárias/), 'Cypress{Enter}');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar vaga' }));
  await vi.waitFor(() => expect(router.state.location.pathname).toBe('/vagas/12'));
});
