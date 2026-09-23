import { screen, waitFor, within } from '@testing-library/react';
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

  renderWithLayout(<JobsPage />, '/cargos');

  const deleteBtn = await screen.findByRole('button', { name: 'Excluir cargo' });
  await userEvent.click(deleteBtn);

  const dialog = screen.getByRole('alertdialog', { name: 'Excluir cargo' });
  expect(dialog).toHaveTextContent(
    'Excluir este cargo também exclui todas as entrevistas, gravações e perguntas vinculadas. Deseja continuar?',
  );
  await userEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }));
  await waitFor(() => expect(deletePosition).toHaveBeenCalledWith(1));
});

test('erro ao excluir mostra a mensagem da API', async () => {
  const { listPositions, deletePosition } = await import('../../api/positions');
  listPositions.mockResolvedValue({ items: [{ id: 1, name: 'Dev', description: 'Vaga', vacancies: 1 }] });
  deletePosition.mockRejectedValue(new ApiError(404, 'Cargo não encontrado.'));

  renderWithLayout(<JobsPage />, '/cargos');

  await userEvent.click(await screen.findByRole('button', { name: 'Excluir cargo' }));
  await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Cargo não encontrado.');
});
