import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { renderWithLayout, LayoutOutlet, fakeAuthValue } from '../../test/render';
import { AuthContext } from '../../auth/AuthContext';
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
  window.alert = vi.fn();
  renderWithLayout(<JobEditorPage />, '/cargos/novo');

  await userEvent.type(screen.getByPlaceholderText('Nome do cargo'), 'Dev Python');
  await userEvent.type(screen.getByPlaceholderText('Descrição da vaga'), 'Vaga para dev backend');
  await userEvent.click(screen.getByRole('button', { name: 'Adicionar competência' }));
  await userEvent.type(screen.getByPlaceholderText('Digite a competência'), 'Python{Enter}');
  await userEvent.type(screen.getByPlaceholderText('Descreva o perfil ideal...'), 'Autônomo');
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
    <AuthContext.Provider value={fakeAuthValue()}>
      <MemoryRouter initialEntries={['/cargos/editar/5']}>
        <Routes>
          <Route element={<LayoutOutlet />}>
            <Route path="/cargos/editar/:id" element={<JobEditorPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  expect(await screen.findByDisplayValue('Proativo')).toBeInTheDocument();
  expect(screen.getByDisplayValue('Dev Node')).toBeInTheDocument();
});
