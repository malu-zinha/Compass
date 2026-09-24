import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { renderWithRouter } from '../../../test/render';
import { ApiError } from '../../../api/client';
import UploadAudioPage from './UploadAudioPage';

vi.mock('../../../api/interviews', () => ({
  createInterview: vi.fn().mockResolvedValue({ id: 9 }),
  uploadInterviewAudio: vi.fn().mockResolvedValue(null),
  deleteInterview: vi.fn().mockResolvedValue(null),
}));

const DRAFT = {
  candidate_name: 'Carla',
  candidate_email: 'c@x.com',
  candidate_phone: '1',
  position_id: 3,
  position_name: 'Dev',
  recording_consent: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  sessionStorage.setItem('compass.interviewDraft', JSON.stringify(DRAFT));
});

test('falha no upload apaga a entrevista criada', async () => {
  const api = await import('../../../api/interviews');
  api.uploadInterviewAudio.mockRejectedValueOnce(new ApiError(413, 'O arquivo excede o limite de 200 MB.'));

  renderWithRouter(<UploadAudioPage />, '/enviar');

  const file = new File(['x'], 'e.mp3', { type: 'audio/mpeg' });
  await userEvent.upload(screen.getByLabelText('Arquivo de áudio'), file);
  await userEvent.click(screen.getByRole('button', { name: 'Enviar e Processar' }));

  await waitFor(() => expect(api.deleteInterview).toHaveBeenCalledWith(9));
  expect(await screen.findByRole('alert')).toHaveTextContent('200 MB');
});

test('sucesso cria a entrevista, envia o áudio, limpa o rascunho e navega', async () => {
  const api = await import('../../../api/interviews');
  const { router } = renderWithRouter(<UploadAudioPage />, '/enviar', ['/entrevista/:id']);

  await userEvent.type(screen.getByLabelText('Anotações (opcional)'), 'observação');
  const file = new File(['x'], 'e.mp3', { type: 'audio/mpeg' });
  await userEvent.upload(screen.getByLabelText('Arquivo de áudio'), file);
  await userEvent.click(screen.getByRole('button', { name: 'Enviar e Processar' }));

  await waitFor(() => expect(router.state.location.pathname).toBe('/entrevista/9'));

  expect(api.createInterview).toHaveBeenCalledWith({
    candidate_name: 'Carla',
    candidate_email: 'c@x.com',
    candidate_phone: '1',
    position_id: 3,
    recording_consent: true,
    mode: 'upload',
    notes: 'observação',
  });
  expect(api.uploadInterviewAudio).toHaveBeenCalledWith(9, file);
  expect(sessionStorage.getItem('compass.interviewDraft')).toBeNull();
});

test('sem rascunho redireciona para /nova-entrevista', async () => {
  sessionStorage.clear();
  const { router } = renderWithRouter(<UploadAudioPage />, '/enviar', ['/nova-entrevista']);

  expect(await screen.findByText('/nova-entrevista')).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/nova-entrevista');
});

test('recusa no navegador arquivo acima do limite, sem criar entrevista', async () => {
  const api = await import('../../../api/interviews');
  renderWithRouter(<UploadAudioPage />, '/enviar');
  const big = new File(['x'], 'longa.mp3', { type: 'audio/mpeg' });
  Object.defineProperty(big, 'size', { value: 201 * 1024 * 1024 });
  await userEvent.upload(screen.getByLabelText('Arquivo de áudio'), big);
  expect(screen.getByRole('alert')).toHaveTextContent('o limite é 200 MB');
  expect(screen.getByRole('button', { name: 'Enviar e Processar' })).toBeDisabled();
  expect(api.createInterview).not.toHaveBeenCalled();
});
