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

  await userEvent.dblClick(await screen.findByText('Antiga'));
  const input = screen.getByDisplayValue('Antiga');
  await userEvent.type(input, ' editado{Escape}');

  expect(await screen.findByText('Antiga')).toBeInTheDocument();
  expect(questions.updateQuestion).not.toHaveBeenCalled();
});

test('abre nas perguntas gerais e troca de escopo pela URL', async () => {
  const questions = await import('../../api/questions');
  const positions = await import('../../api/positions');
  positions.listPositions.mockResolvedValue({ items: [{ id: 3, name: 'Frontend' }] });
  questions.listQuestions.mockResolvedValue([]);

  renderWithLayout(<QuestionsPage />, '/perguntas');
  expect(await screen.findByRole('heading', { name: 'Perguntas gerais' })).toBeInTheDocument();
  expect(questions.listQuestions).toHaveBeenCalledWith(null);

  await userEvent.click(await screen.findByRole('button', { name: 'Frontend' }));
  expect(await screen.findByRole('heading', { name: 'Frontend' })).toBeInTheDocument();
  expect(questions.listQuestions).toHaveBeenLastCalledWith(3);
});

test('adiciona pergunta no escopo atual e edita pelo botão', async () => {
  const questions = await import('../../api/questions');
  questions.listQuestions.mockResolvedValue([{ id: 7, text: 'Antiga', position_id: null }]);
  questions.createQuestion.mockResolvedValue({ id: 8 });

  renderWithLayout(<QuestionsPage />, '/perguntas');
  await userEvent.type(await screen.findByLabelText('Nova pergunta'), 'Por que esta vaga?{Enter}');
  expect(questions.createQuestion).toHaveBeenCalledWith('Por que esta vaga?', null);

  await userEvent.click(screen.getByRole('button', { name: 'Editar Antiga' }));
  expect(screen.getByLabelText('Editar pergunta')).toHaveValue('Antiga');
});
