import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import TranscriptView from './TranscriptView';

const transcript = [
  { speaker: 'A', text: 'Pode se apresentar?', start_ms: 0, end_ms: 3000 },
  { speaker: 'B', text: 'Claro, trabalho com React.', start_ms: 4500, end_ms: 9000 },
];
const roles = [{ speaker: 'A', role: 'interviewer' }, { speaker: 'B', role: 'candidate' }];

test('rotula falantes, marca a fala ativa e o horário pula para a fala', async () => {
  const onSeek = vi.fn();
  render(<TranscriptView transcript={transcript} speakerRoles={roles} activeMessageIndex={1} onSeek={onSeek} />);
  expect(screen.getByText('Entrevistador')).toBeInTheDocument();
  expect(screen.getByText('Candidato')).toBeInTheDocument();
  expect(screen.getByText('Claro, trabalho com React.').closest('li')).toHaveAttribute('aria-current', 'true');

  await userEvent.click(screen.getByRole('button', { name: 'Ouvir a partir de 00:04' }));
  expect(onSeek).toHaveBeenCalledWith(4.5);
});

test('sem áudio, horário é só texto', () => {
  render(<TranscriptView transcript={transcript} speakerRoles={roles} />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.getByText('00:04')).toBeInTheDocument();
});
