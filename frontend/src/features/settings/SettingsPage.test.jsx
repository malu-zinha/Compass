import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { renderWithLayout } from '../../test/render';
import SettingsPage from './SettingsPage';

const settings = {
  suggest_questions: true,
  suggestion_interval_seconds: 40,
  transcription_language: 'pt',
  auto_save_notes: true,
  timezone: 'America/Sao_Paulo',
  date_format: 'DD/MM/YYYY',
};

const saveSettings = vi.fn();

vi.mock('../../auth/SettingsContext', () => ({
  useUserSettings: () => ({ settings, loading: false, saveSettings }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.alert = vi.fn();
  saveSettings.mockResolvedValue(settings);
});

test('(a) renderiza só os controles suportados', () => {
  renderWithLayout(<SettingsPage />, '/configuracoes');

  expect(screen.getByText('Fuso Horário')).toBeInTheDocument();
  expect(screen.getByText('Formato de Data')).toBeInTheDocument();
  expect(screen.getByText('Sugerir Perguntas')).toBeInTheDocument();
  expect(screen.getByText('Intervalo das sugestões')).toBeInTheDocument();
  expect(screen.getByText('Idioma da transcrição')).toBeInTheDocument();
  expect(screen.getByText('Salvar anotações automaticamente')).toBeInTheDocument();

  expect(screen.queryByText('Notificações')).not.toBeInTheDocument();
  expect(screen.queryByText('Perfil Visível')).not.toBeInTheDocument();
  expect(screen.queryByText('Gravar Vídeo')).not.toBeInTheDocument();
  expect(screen.queryByText('Qualidade do Áudio')).not.toBeInTheDocument();
});

test('(b) mudar intervalo para 60 e salvar chama saveSettings com suggestion_interval_seconds: 60', async () => {
  renderWithLayout(<SettingsPage />, '/configuracoes');

  const intervalItem = screen.getByText('Intervalo das sugestões').closest('.setting-item');
  await userEvent.selectOptions(within(intervalItem).getByRole('combobox'), '60');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar Configurações' }));

  expect(saveSettings).toHaveBeenCalledWith(
    expect.objectContaining({ suggestion_interval_seconds: 60 }),
  );
  expect(await screen.findByText('Configurações salvas.')).toBeInTheDocument();
});

test('erro ao salvar mostra o detail em alert', async () => {
  saveSettings.mockRejectedValue({ detail: 'Fuso horário inválido.' });
  renderWithLayout(<SettingsPage />, '/configuracoes');

  await userEvent.click(screen.getByRole('button', { name: 'Salvar Configurações' }));

  await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Fuso horário inválido.'));
});
