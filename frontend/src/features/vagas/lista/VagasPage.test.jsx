import { screen, within } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { renderWithLayout } from '../../../test/render';
import VagasPage from './VagasPage';

vi.mock('../../../api/positions', () => ({ listPositions: vi.fn() }));
vi.mock('../../../api/interviews', () => ({ listInterviews: vi.fn() }));

beforeEach(async () => {
  const { listPositions } = await import('../../../api/positions');
  const { listInterviews } = await import('../../../api/interviews');
  listPositions.mockResolvedValue({
    items: [
      { id: 3, name: 'Frontend', description: 'React', vacancies: 2, skills: ['React', 'CSS', 'A11y', 'Testes'] },
      { id: 4, name: 'Dados', description: 'SQL', vacancies: 0, skills: [] },
    ],
  });
  listInterviews.mockImplementation(({ positionId, status }) => {
    if (status === 'done') {
      return Promise.resolve({ items: positionId === 3 ? [{ id: 1, candidate_name: 'Carla', score: 870 }] : [], total: 0 });
    }
    return Promise.resolve({ items: [], total: positionId === 3 ? 4 : 0 });
  });
});

test('lista as vagas com contagem, melhor candidata e link para a página da vaga', async () => {
  renderWithLayout(<VagasPage />, '/vagas');
  const link = await screen.findByRole('link', { name: /Frontend/ });
  expect(link).toHaveAttribute('href', '/vagas/3');

  const row = link.closest('tr');
  expect(within(row).getByText('2 vagas disponíveis')).toBeInTheDocument();
  expect(within(row).getByText('4')).toBeInTheDocument();
  expect(within(row).getByText('Carla')).toBeInTheDocument();
  expect(within(row).getByText('+1')).toBeInTheDocument();

  const dados = screen.getByRole('link', { name: /Dados/ }).closest('tr');
  expect(within(dados).getByText('Nenhuma')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Nova vaga' })).toHaveAttribute('href', '/vagas/nova');
});

test('sem vagas mostra o estado vazio', async () => {
  const { listPositions } = await import('../../../api/positions');
  listPositions.mockResolvedValue({ items: [] });
  renderWithLayout(<VagasPage />, '/vagas');
  expect(await screen.findByRole('heading', { name: 'Nenhuma vaga cadastrada ainda' })).toBeInTheDocument();
});
