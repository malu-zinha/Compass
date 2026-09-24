import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { renderWithLayout } from '../../test/render';
import SettingsPage from './PreferenciasSection';

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
  saveSettings.mockResolvedValue(settings);
});

test('(a) renderiza só os controles suportados', () => {
  renderWithLayout(<SettingsPage />, '/configuracoes');

  expect(screen.getByRole('group', { name: 'Fuso horário' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'Formato de data' })).toBeInTheDocument();
  expect(screen.getByRole('switch', { name: 'Sugerir perguntas' })).toBeInTheDocument();
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

  const intervalItem = screen.getByRole('group', { name: 'Intervalo das sugestões' });
  await userEvent.selectOptions(within(intervalItem).getByRole('combobox'), '60');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar configurações' }));

  expect(saveSettings).toHaveBeenCalledWith(
    expect.objectContaining({ suggestion_interval_seconds: 60 }),
  );
  expect(await screen.findByText('Configurações salvas.')).toBeInTheDocument();
});

test('erro ao salvar mostra o detail em toast', async () => {
  saveSettings.mockRejectedValue({ detail: 'Fuso horário inválido.' });
  renderWithLayout(<SettingsPage />, '/configuracoes');

  await userEvent.click(screen.getByRole('button', { name: 'Salvar configurações' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Fuso horário inválido.');
});

test('seção Aparência troca o tema na hora, sem salvar', async () => {
  renderWithLayout(<SettingsPage />, '/configuracoes');
  expect(screen.getByRole('heading', { name: 'Aparência' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('radio', { name: 'Escuro' }));
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(saveSettings).not.toHaveBeenCalled();
});
