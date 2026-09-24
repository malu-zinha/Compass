import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { renderWithRouter } from '../../../test/render';
import NovaEntrevistaPage from './NovaEntrevistaPage';

vi.mock('../../../api/positions', () => ({ listPositions: vi.fn() }));
vi.mock('../../../api/interviews', () => ({ createInterview: vi.fn() }));

const CONSENT = 'Confirmo que o candidato autorizou a gravação e o processamento da entrevista.';

beforeEach(async () => {
  vi.clearAllMocks();
  sessionStorage.clear();
  const { listPositions } = await import('../../../api/positions');
  listPositions.mockResolvedValue({ items: [{ id: 3, name: 'Dev' }, { id: 4, name: 'Dados' }] });
});

async function fill() {
  await userEvent.type(screen.getByLabelText(/^Nome do candidato/), 'Carla');
  await userEvent.type(screen.getByLabelText(/^E-mail/), 'c@x.com');
  await userEvent.type(screen.getByLabelText(/^Telefone/), '11999999999');
  await userEvent.selectOptions(await screen.findByRole('combobox', { name: /^Vaga/ }), '3');
}

test('ao vivo: só libera com consentimento, cria a entrevista e vai gravar', async () => {
  const { createInterview } = await import('../../../api/interviews');
  createInterview.mockResolvedValue({ id: 42 });
  const { router } = renderWithRouter(<NovaEntrevistaPage />, '/nova-entrevista', ['/gravar/:id']);
  await fill();

  expect(screen.getByRole('radio', { name: /Ao vivo/ })).toBeChecked();
  const submit = screen.getByRole('button', { name: 'Começar gravação' });
  expect(submit).toBeDisabled();
  await userEvent.click(screen.getByLabelText(CONSENT));
  expect(submit).toBeEnabled();

  await userEvent.click(submit);
  expect(createInterview).toHaveBeenCalledWith({
    candidate_name: 'Carla', candidate_email: 'c@x.com', candidate_phone: '11999999999',
    position_id: 3, recording_consent: true, mode: 'live',
  });
  await waitFor(() => expect(router.state.location.pathname).toBe('/gravar/42'));
});

test('envio de áudio: guarda o rascunho e segue para /enviar sem criar entrevista', async () => {
  const { createInterview } = await import('../../../api/interviews');
  const { router } = renderWithRouter(<NovaEntrevistaPage />, '/nova-entrevista', ['/enviar']);
  await fill();
  await userEvent.click(screen.getByRole('radio', { name: /Enviar áudio/ }));
  await userEvent.click(screen.getByLabelText(CONSENT));
  await userEvent.click(screen.getByRole('button', { name: 'Continuar para envio' }));

  await waitFor(() => expect(router.state.location.pathname).toBe('/enviar'));
  expect(createInterview).not.toHaveBeenCalled();
  expect(JSON.parse(sessionStorage.getItem('compass.interviewDraft'))).toEqual({
    candidate_name: 'Carla', candidate_email: 'c@x.com', candidate_phone: '11999999999',
    position_id: 3, position_name: 'Dev', recording_consent: true,
  });
});

test('aberta de uma vaga, já vem com ela escolhida', async () => {
  const { render } = await import('@testing-library/react');
  const { createMemoryRouter, RouterProvider } = await import('react-router-dom');
  const { TestProviders } = await import('../../../test/render');
  const router = createMemoryRouter([{ path: '/nova-entrevista', element: <NovaEntrevistaPage /> }], {
    initialEntries: ['/nova-entrevista?vaga=4'],
  });
  render(<TestProviders><RouterProvider router={router} /></TestProviders>);
  await waitFor(() => expect(screen.getByRole('combobox', { name: /^Vaga/ })).toHaveValue('4'));
});

test('voltar do envio reabre o formulário preenchido', async () => {
  sessionStorage.setItem('compass.interviewDraft', JSON.stringify({
    candidate_name: 'Ana', candidate_email: 'a@x.com', candidate_phone: '1', position_id: 4, recording_consent: true,
  }));
  renderWithRouter(<NovaEntrevistaPage />, '/nova-entrevista');
  expect(screen.getByLabelText(/^Nome do candidato/)).toHaveValue('Ana');
  expect(screen.getByRole('radio', { name: /Enviar áudio/ })).toBeChecked();
  await waitFor(() => expect(screen.getByRole('combobox', { name: /^Vaga/ })).toHaveValue('4'));
});
