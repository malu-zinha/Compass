import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/layout';
import ThemeSwitcher from '../../theme/ThemeSwitcher';
import { useUserSettings } from '../../auth/SettingsContext';
import './SettingsPage.css';
import { useToast } from '../../components/ui';

const INTERVAL_OPTIONS = [20, 40, 60, 90, 120];
const LANGUAGE_OPTIONS = [
  ['pt', 'Português (BR)'],
  ['en', 'English (US)'],
  ['es', 'Español'],
];

export default function SettingsPage() {
  const toast = useToast();
  const { settings, saveSettings } = useUserSettings();
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setForm(settings); }, [settings]);

  const handleChange = (key, value) => {
    setForm({ ...form, [key]: value });
    setSaved(false);
  };

  const handleSaveSettings = async () => {
    try {
      await saveSettings(form);
      setSaved(true);
    } catch (error) {
      toast.error(error.detail || 'Não foi possível salvar as configurações.');
    }
  };

  return (
    <div className="settings-page">
      <PageHeader title="Configurações" />

      <div className="settings-content">
        <div className="settings-container">

          <section className="settings-section" aria-labelledby="aparencia-titulo">
            <h2 id="aparencia-titulo" className="section-title">Aparência</h2>
            <div className="settings-grid">
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Tema</div>
                  <div className="setting-description">
                    Vale na hora e fica salvo neste dispositivo. &quot;Sistema&quot; acompanha o claro ou escuro do seu computador.
                  </div>
                </div>
                <ThemeSwitcher />
              </div>
            </div>
          </section>

          <div className="settings-section">
            <h2 className="section-title">Configurações Gerais</h2>

            <div className="settings-grid">
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Fuso Horário</div>
                  <div className="setting-description">Fuso horário para exibição de datas</div>
                </div>
                <select
                  className="setting-select"
                  value={form.timezone}
                  onChange={(e) => handleChange('timezone', e.target.value)}
                >
                  <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                  <option value="America/New_York">New York (GMT-5)</option>
                  <option value="Europe/London">London (GMT+0)</option>
                </select>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Formato de Data</div>
                  <div className="setting-description">Como as datas serão exibidas</div>
                </div>
                <select
                  className="setting-select"
                  value={form.date_format}
                  onChange={(e) => handleChange('date_format', e.target.value)}
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h2 className="section-title">Entrevistas</h2>

            <div className="settings-grid">
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Sugerir Perguntas</div>
                  <div className="setting-description">Sugerir perguntas durante entrevista</div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={form.suggest_questions}
                    onChange={(e) => handleChange('suggest_questions', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Intervalo das sugestões</div>
                  <div className="setting-description">Frequência das sugestões de perguntas</div>
                </div>
                <select
                  className="setting-select"
                  value={form.suggestion_interval_seconds}
                  onChange={(e) => handleChange('suggestion_interval_seconds', Number(e.target.value))}
                >
                  {INTERVAL_OPTIONS.map((seconds) => (
                    <option key={seconds} value={seconds}>{seconds} segundos</option>
                  ))}
                </select>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Idioma da transcrição</div>
                  <div className="setting-description">Idioma usado para transcrever o áudio</div>
                </div>
                <select
                  className="setting-select"
                  value={form.transcription_language}
                  onChange={(e) => handleChange('transcription_language', e.target.value)}
                >
                  {LANGUAGE_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Salvar anotações automaticamente</div>
                  <div className="setting-description">Salvar as anotações da entrevista sem precisar clicar em salvar</div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={form.auto_save_notes}
                    onChange={(e) => handleChange('auto_save_notes', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          <div className="settings-actions">
            <button className="save-settings-btn" onClick={handleSaveSettings}>
              Salvar Configurações
            </button>
          </div>
          {saved && <p className="setting-description">Configurações salvas.</p>}
        </div>
      </div>
    </div>
  );
}
