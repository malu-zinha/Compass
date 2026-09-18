import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import InfoModal from './InfoModal';

const candidateData = {
  candidateName: 'Ana Souza',
  candidateEmail: 'ana@example.com',
  candidatePhone: '11999998888',
};

test('exibe os dados do candidato e "Voltar" chama onClose', async () => {
  const onClose = vi.fn();
  render(<InfoModal isOpen onClose={onClose} candidateData={candidateData} onSave={vi.fn()} actions={[]} />);

  expect(screen.getByText('Ana Souza')).toBeInTheDocument();
  expect(screen.getByText('ana@example.com')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
  expect(onClose).toHaveBeenCalled();
});

test('Editar troca os valores por inputs e Salvar chama onSave com os campos editados', async () => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(<InfoModal isOpen onClose={vi.fn()} candidateData={candidateData} onSave={onSave} actions={[]} />);

  await userEvent.click(screen.getByRole('button', { name: 'Editar' }));

  const nameInput = screen.getByDisplayValue('Ana Souza');
  await userEvent.clear(nameInput);
  await userEvent.type(nameInput, 'Ana Paula Souza');

  await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

  expect(onSave).toHaveBeenCalledWith({
    candidate_name: 'Ana Paula Souza',
    candidate_email: 'ana@example.com',
    candidate_phone: '11999998888',
  });
});

test('Cancelar restaura os valores originais e sai do modo edição', async () => {
  render(<InfoModal isOpen onClose={vi.fn()} candidateData={candidateData} onSave={vi.fn()} actions={[]} />);

  await userEvent.click(screen.getByRole('button', { name: 'Editar' }));
  const nameInput = screen.getByDisplayValue('Ana Souza');
  await userEvent.clear(nameInput);
  await userEvent.type(nameInput, 'Outro nome');

  await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

  expect(screen.getByText('Ana Souza')).toBeInTheDocument();
});

test('renderiza actions no rodapé e respeita disabled', async () => {
  const onReanalyze = vi.fn();
  const onDelete = vi.fn();
  const actions = [
    { label: 'Reanalisar', onClick: onReanalyze, disabled: true },
    { label: 'Excluir entrevista', onClick: onDelete, disabled: false },
  ];
  render(<InfoModal isOpen onClose={vi.fn()} candidateData={candidateData} onSave={vi.fn()} actions={actions} />);

  expect(screen.getByRole('button', { name: 'Reanalisar' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Excluir entrevista' }));
  expect(onDelete).toHaveBeenCalled();
});
