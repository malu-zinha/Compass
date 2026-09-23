import { screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { renderWithLayout } from '../../../test/render';
import RankingSelectPage, { vacanciesLabel } from './RankingSelectPage';

vi.mock('../../../api/positions', () => ({
  listPositions: vi.fn().mockResolvedValue({
    items: [
      { id: 3, name: 'Frontend', description: 'React', vacancies: 2 },
      { id: 4, name: 'Dados', description: 'SQL', vacancies: 1 },
    ],
  }),
}));

test('pluraliza as vagas sem o "disponíveleis"', () => {
  expect(vacanciesLabel(1)).toBe('1 vaga disponível');
  expect(vacanciesLabel(2)).toBe('2 vagas disponíveis');
});

test('cada cargo é um link para o ranking dele', async () => {
  renderWithLayout(<RankingSelectPage />, '/ranking');
  expect(screen.getByRole('link', { name: /Todos os candidatos/ })).toHaveAttribute('href', '/entrevistas');
  expect(await screen.findByRole('link', { name: /Frontend/ })).toHaveAttribute('href', '/entrevistas/3');
  expect(screen.getByText('2 vagas disponíveis')).toBeInTheDocument();
});
