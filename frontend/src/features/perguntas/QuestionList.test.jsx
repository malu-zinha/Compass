import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { renderWithLayout } from '../../test/render';
import QuestionList from './QuestionList';
import PerguntasPage from './PerguntasPage';

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

  renderWithLayout(<QuestionList />, '/perguntas');

  await userEvent.dblClick(await screen.findByText('Antiga'));
  const input = screen.getByDisplayValue('Antiga');
  await userEvent.clear(input);
  await userEvent.type(input, 'Nova{Enter}');

  expect(questions.updateQuestion).toHaveBeenCalledWith(7, 'Nova');
});

test('Esc cancela a edição sem chamar updateQuestion', async () => {
  const questions = await import('../../api/questions');
  questions.listQuestions.mockResolvedValue([{ id: 7, text: 'Antiga', position_id: null }]);

  renderWithLayout(<QuestionList />, '/perguntas');

  await userEvent.dblClick(await screen.findByText('Antiga'));
  const input = screen.getByDisplayValue('Antiga');
  await userEvent.type(input, ' editado{Escape}');

  expect(await screen.findByText('Antiga')).toBeInTheDocument();
  expect(questions.updateQuestion).not.toHaveBeenCalled();
});

test('a página de perguntas gerais usa o escopo geral', async () => {
  const questions = await import('../../api/questions');
  questions.listQuestions.mockResolvedValue([]);
  renderWithLayout(<PerguntasPage />, '/perguntas');
  expect(screen.getByRole('heading', { level: 1, name: 'Perguntas gerais' })).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'Nenhuma pergunta aqui ainda' })).toBeInTheDocument();
  expect(questions.listQuestions).toHaveBeenCalledWith(null);
});

test('numa vaga, lista e cria no escopo da vaga', async () => {
  const questions = await import('../../api/questions');
  questions.listQuestions.mockResolvedValue([]);
  questions.createQuestion.mockResolvedValue({ id: 9 });
  renderWithLayout(<QuestionList positionId={3} />, '/vagas/3');
  await userEvent.type(await screen.findByLabelText('Nova pergunta'), 'Conte um bug difícil{Enter}');
  expect(questions.listQuestions).toHaveBeenCalledWith(3);
  expect(questions.createQuestion).toHaveBeenCalledWith('Conte um bug difícil', 3);
});

test('adiciona pergunta no escopo geral e edita pelo botão', async () => {
  const questions = await import('../../api/questions');
  questions.listQuestions.mockResolvedValue([{ id: 7, text: 'Antiga', position_id: null }]);
  questions.createQuestion.mockResolvedValue({ id: 8 });

  renderWithLayout(<QuestionList />, '/perguntas');
  await userEvent.type(await screen.findByLabelText('Nova pergunta'), 'Por que esta vaga?{Enter}');
  expect(questions.createQuestion).toHaveBeenCalledWith('Por que esta vaga?', null);

  await userEvent.click(screen.getByRole('button', { name: 'Editar Antiga' }));
  expect(screen.getByLabelText('Editar pergunta')).toHaveValue('Antiga');
});
