import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { renderWithLayout } from '../../test/render';
import QuestionsPage from './QuestionsPage';

vi.mock('../../api/questions', () => ({
  listQuestions: vi.fn().mockResolvedValue([{ id: 7, text: 'Antiga', position_id: null }]),
  createQuestion: vi.fn(),
  deleteQuestion: vi.fn(),
  updateQuestion: vi.fn().mockResolvedValue({ id: 7, text: 'Nova' }),
}));
vi.mock('../../api/positions', () => ({ listPositions: vi.fn().mockResolvedValue({ items: [] }) }));

beforeEach(() => {
  vi.clearAllMocks();
});

test('edita uma pergunta com duplo clique + Enter', async () => {
  const questions = await import('../../api/questions');
  questions.listQuestions.mockResolvedValue([{ id: 7, text: 'Antiga', position_id: null }]);
  questions.updateQuestion.mockResolvedValue({ id: 7, text: 'Nova' });

  renderWithLayout(<QuestionsPage />, '/perguntas');

  await userEvent.click(screen.getByText('Perguntas Gerais'));
  await userEvent.dblClick(await screen.findByText('Antiga'));
  const input = screen.getByDisplayValue('Antiga');
  await userEvent.clear(input);
  await userEvent.type(input, 'Nova{Enter}');

  expect(questions.updateQuestion).toHaveBeenCalledWith(7, 'Nova');
});

test('Esc cancela a edição sem chamar updateQuestion', async () => {
  const questions = await import('../../api/questions');
  questions.listQuestions.mockResolvedValue([{ id: 7, text: 'Antiga', position_id: null }]);

  renderWithLayout(<QuestionsPage />, '/perguntas');

  await userEvent.click(screen.getByText('Perguntas Gerais'));
  await userEvent.dblClick(await screen.findByText('Antiga'));
  const input = screen.getByDisplayValue('Antiga');
  await userEvent.type(input, ' editado{Escape}');

  expect(await screen.findByText('Antiga')).toBeInTheDocument();
  expect(questions.updateQuestion).not.toHaveBeenCalled();
});
