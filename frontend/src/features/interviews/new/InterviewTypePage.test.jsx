import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { renderWithRouter, omit } from '../../../test/render';
import InterviewTypePage from './InterviewTypePage';

vi.mock('../../../api/interviews', () => ({
  createInterview: vi.fn().mockResolvedValue({ id: 42 }),
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

test('ao vivo cria a entrevista e vai para /gravar/:id', async () => {
  const { createInterview } = await import('../../../api/interviews');
  const { router } = renderWithRouter(<InterviewTypePage />, '/tipo-entrevista', ['/gravar/:id']);

  await userEvent.click(screen.getByText('Entrevista ao vivo'));

  expect(createInterview).toHaveBeenCalledWith({
    ...omit(DRAFT, 'position_name'),
    mode: 'live',
  });
  expect(router.state.location.pathname).toBe('/gravar/42');
});

test('upload não cria entrevista antes do envio', async () => {
  const { createInterview } = await import('../../../api/interviews');
  const { router } = renderWithRouter(<InterviewTypePage />, '/tipo-entrevista', ['/upload']);

  await userEvent.click(screen.getByText('Upload de Áudio'));

  expect(createInterview).not.toHaveBeenCalled();
  expect(router.state.location.pathname).toBe('/upload');
});

test('sem rascunho redireciona para /nova-entrevista', async () => {
  sessionStorage.clear();
  const { router } = renderWithRouter(<InterviewTypePage />, '/tipo-entrevista', ['/nova-entrevista']);

  expect(await screen.findByText('/nova-entrevista')).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/nova-entrevista');
});
