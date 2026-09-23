import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { renderWithRouter } from '../../../test/render';
import NewInterviewPage from './NewInterviewPage';

vi.mock('../../../api/positions', () => ({
  listPositions: vi.fn().mockResolvedValue({ items: [{ id: 3, name: 'Dev' }] }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

test('mantém Continuar desabilitado até marcar o consentimento e salva o rascunho', async () => {
  const { listPositions } = await import('../../../api/positions');
  listPositions.mockResolvedValue({ items: [{ id: 3, name: 'Dev' }] });

  renderWithRouter(<NewInterviewPage />, '/nova-entrevista', ['/tipo-entrevista']);

  await userEvent.type(screen.getByLabelText('Nome do candidato'), 'Carla');
  await userEvent.type(screen.getByLabelText('E-mail'), 'c@x.com');
  await userEvent.type(screen.getByLabelText('Número'), '11999999999');
  await userEvent.selectOptions(await screen.findByLabelText('Cargo'), '3');

  const continueButton = screen.getByRole('button', { name: 'Continuar' });
  expect(continueButton).toBeDisabled();

  await userEvent.click(
    screen.getByLabelText('Confirmo que o candidato autorizou a gravação e o processamento da entrevista.'),
  );
  expect(continueButton).toBeEnabled();

  await userEvent.click(continueButton);

  expect(JSON.parse(sessionStorage.getItem('compass.interviewDraft'))).toEqual({
    candidate_name: 'Carla',
    candidate_email: 'c@x.com',
    candidate_phone: '11999999999',
    position_id: 3,
    position_name: 'Dev',
    recording_consent: true,
  });
});
