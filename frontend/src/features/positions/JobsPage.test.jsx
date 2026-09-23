import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { renderWithLayout } from '../../test/render';
import { ApiError } from '../../api/client';
import JobsPage from './JobsPage';

vi.mock('../../api/positions', () => ({
  listPositions: vi.fn(),
  deletePosition: vi.fn(),
}));

beforeEach(() => {
  vi.restoreAllMocks();
});

test('exclusão pede confirmação com o texto correto e chama deletePosition', async () => {
  const { listPositions, deletePosition } = await import('../../api/positions');
  listPositions.mockResolvedValue({ items: [{ id: 1, name: 'Dev', description: 'Vaga', vacancies: 1 }] });
  deletePosition.mockResolvedValue(null);
  window.confirm = vi.fn(() => true);

  renderWithLayout(<JobsPage />, '/cargos');

  const deleteBtn = await screen.findByRole('button', { name: 'Excluir cargo' });
  await userEvent.click(deleteBtn);

  expect(window.confirm).toHaveBeenCalledWith(
    'Excluir este cargo também exclui todas as entrevistas, gravações e perguntas vinculadas. Deseja continuar?',
  );
  await waitFor(() => expect(deletePosition).toHaveBeenCalledWith(1));
});

test('erro ao excluir mostra a mensagem da API', async () => {
  const { listPositions, deletePosition } = await import('../../api/positions');
  listPositions.mockResolvedValue({ items: [{ id: 1, name: 'Dev', description: 'Vaga', vacancies: 1 }] });
  deletePosition.mockRejectedValue(new ApiError(404, 'Cargo não encontrado.'));
  window.confirm = vi.fn(() => true);
  window.alert = vi.fn();

  renderWithLayout(<JobsPage />, '/cargos');

  await userEvent.click(await screen.findByRole('button', { name: 'Excluir cargo' }));

  await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Cargo não encontrado.'));
});
