import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import CandidateModal from './CandidateModal';

const interview = { candidate_name: 'Ana Souza', candidate_email: 'ana@example.com', candidate_phone: '' };

test('edita e salva os três campos', async () => {
  const onSave = vi.fn().mockResolvedValue();
  const onClose = vi.fn();
  render(<CandidateModal open onClose={onClose} interview={interview} onSave={onSave} />);
  const name = screen.getByLabelText('Nome');
  expect(name).toHaveValue('Ana Souza');
  await userEvent.clear(name);
  await userEvent.type(name, 'Ana Lima');
  await userEvent.type(screen.getByLabelText('Telefone'), '85 9999');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
  expect(onSave).toHaveBeenCalledWith({ candidate_name: 'Ana Lima', candidate_email: 'ana@example.com', candidate_phone: '85 9999' });
  await waitFor(() => expect(onClose).toHaveBeenCalled());
});

test('se salvar falhar, continua aberto com o que foi digitado', async () => {
  const onSave = vi.fn().mockRejectedValue(new Error('x'));
  const onClose = vi.fn();
  render(<CandidateModal open onClose={onClose} interview={interview} onSave={onSave} />);
  await userEvent.type(screen.getByLabelText('Telefone'), '1');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
  await waitFor(() => expect(onSave).toHaveBeenCalled());
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Telefone')).toHaveValue('1');
});
