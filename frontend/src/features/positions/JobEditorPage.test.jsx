import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { TestProviders, renderWithLayout, LayoutOutlet, fakeAuthValue } from '../../test/render';
import JobEditorPage from './JobEditorPage';

vi.mock('../../api/positions', () => ({
  createPosition: vi.fn().mockResolvedValue({ id: 1 }),
  getPosition: vi.fn(),
  updatePosition: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test('salva o perfil ideal junto com o cargo', async () => {
  const { createPosition } = await import('../../api/positions');
  renderWithLayout(<JobEditorPage />, '/cargos/novo');

  await userEvent.type(screen.getByLabelText(/^Nome/), 'Dev Python');
  await userEvent.type(screen.getByLabelText(/^Descrição da vaga/), 'Vaga para dev backend');
  await userEvent.type(screen.getByLabelText(/^Competências necessárias/), 'Python{Enter}');
  await userEvent.type(screen.getByLabelText('Perfil ideal'), 'Autônomo');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar cargo' }));

  expect(createPosition).toHaveBeenCalledWith(expect.objectContaining({
    name: 'Dev Python',
    ideal_profile: 'Autônomo',
    skills: expect.arrayContaining(['Python']),
  }));
});

test('carrega o perfil ideal ao editar um cargo existente', async () => {
  const { getPosition } = await import('../../api/positions');
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
      <MemoryRouter initialEntries={['/cargos/editar/5']}>
        <Routes>
          <Route element={<LayoutOutlet />}>
            <Route path="/cargos/editar/:id" element={<JobEditorPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </TestProviders>,
  );

  expect(await screen.findByDisplayValue('Proativo')).toBeInTheDocument();
  expect(screen.getByDisplayValue('Dev Node')).toBeInTheDocument();
});

test('campos obrigatórios vazios mostram erro no campo e não salvam', async () => {
  const { createPosition } = await import('../../api/positions');
  renderWithLayout(<JobEditorPage />, '/cargos/novo');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar cargo' }));
  expect(screen.getByLabelText(/^Nome/)).toHaveAccessibleDescription('Dê um nome ao cargo.');
  expect(screen.getByLabelText(/^Competências necessárias/)).toHaveAttribute('aria-invalid', 'true');
  expect(createPosition).not.toHaveBeenCalled();
});

test('competências: vírgula adiciona, duplicata é ignorada e o chip remove', async () => {
  renderWithLayout(<JobEditorPage />, '/cargos/novo');
  const input = screen.getByLabelText(/^Competências necessárias/);
  await userEvent.type(input, 'SQL,sql{Enter}Python{Enter}');
  expect(screen.getAllByText(/^(SQL|Python)$/)).toHaveLength(2);
  await userEvent.click(screen.getByRole('button', { name: 'Remover SQL' }));
  expect(screen.queryByText('SQL')).not.toBeInTheDocument();
});
