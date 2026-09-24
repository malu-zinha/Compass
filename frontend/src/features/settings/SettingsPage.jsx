import { useEffect, useId, useState } from 'react';
import { PageHeader } from '../../components/layout';
import ThemeSwitcher from '../../theme/ThemeSwitcher';
import { useUserSettings } from '../../auth/SettingsContext';
import { Button, Card, Select, Switch, useToast } from '../../components/ui';
import styles from './SettingsPage.module.css';

const INTERVAL_OPTIONS = [20, 40, 60, 90, 120];
const LANGUAGE_OPTIONS = [
  ['pt', 'Português (BR)'],
  ['en', 'English (US)'],
  ['es', 'Español'],
];

/*
 * Uma configuração: rótulo e descrição à esquerda, controle à direita. É um
 * role="group" nomeado pelo rótulo, então leitor de tela e testes acham o
 * controle pelo nome da configuração, sem depender de classe.
 */
function SettingRow({ label, description, children }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={`${id}-label`} aria-describedby={`${id}-desc`} className={styles.row}>
      <div className={styles.info}>
        <span id={`${id}-label`} className={styles.label}>{label}</span>
        <span id={`${id}-desc`} className={styles.description}>{description}</span>
      </div>
      <div className={styles.control}>{children}</div>
    </div>
  );
}

function Section({ title, children }) {
  const id = useId();
  return (
    <Card as="section" padding="none" aria-labelledby={id} className={styles.section}>
      <h2 id={id} className={styles.sectionTitle}>{title}</h2>
      {children}
    </Card>
  );
}

export default function SettingsPage() {
  const toast = useToast();
  const { settings, saveSettings } = useUserSettings();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(settings); }, [settings]);

  const handleChange = (key, value) => {
    setForm({ ...form, [key]: value });
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await saveSettings(form);
      toast.success('Configurações salvas.');
    } catch (error) {
      toast.error(error.detail || 'Não foi possível salvar as configurações.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Configurações" />

      <Section title="Aparência">
        <SettingRow
          label="Tema"
          description={'Vale na hora e fica salvo neste dispositivo. "Sistema" acompanha o claro ou escuro do seu computador.'}
        >
          <ThemeSwitcher />
        </SettingRow>
      </Section>

      <Section title="Datas e horários">
        <SettingRow label="Fuso horário" description="Usado para exibir as datas das entrevistas.">
          <Select aria-label="Fuso horário" value={form.timezone} onChange={(e) => handleChange('timezone', e.target.value)}>
            <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
            <option value="America/New_York">New York (GMT-5)</option>
            <option value="Europe/London">London (GMT+0)</option>
          </Select>
        </SettingRow>
        <SettingRow label="Formato de data" description="Como as datas aparecem no app.">
          <Select aria-label="Formato de data" value={form.date_format} onChange={(e) => handleChange('date_format', e.target.value)}>
            <option value="DD/MM/YYYY">DD/MM/AAAA</option>
            <option value="MM/DD/YYYY">MM/DD/AAAA</option>
            <option value="YYYY-MM-DD">AAAA-MM-DD</option>
          </Select>
        </SettingRow>
      </Section>

      <Section title="Entrevistas">
        <SettingRow label="Sugerir perguntas" description="A IA sugere perguntas durante a entrevista ao vivo.">
          <Switch
            aria-label="Sugerir perguntas"
            checked={form.suggest_questions}
            onChange={(value) => handleChange('suggest_questions', value)}
          />
        </SettingRow>
        <SettingRow label="Intervalo das sugestões" description="De quanto em quanto tempo chegam novas sugestões.">
          <Select
            aria-label="Intervalo das sugestões"
            value={form.suggestion_interval_seconds}
            onChange={(e) => handleChange('suggestion_interval_seconds', Number(e.target.value))}
            disabled={!form.suggest_questions}
          >
            {INTERVAL_OPTIONS.map((seconds) => (
              <option key={seconds} value={seconds}>{seconds} segundos</option>
            ))}
          </Select>
        </SettingRow>
        <SettingRow label="Idioma da transcrição" description="Idioma falado nas entrevistas.">
          <Select
            aria-label="Idioma da transcrição"
            value={form.transcription_language}
            onChange={(e) => handleChange('transcription_language', e.target.value)}
          >
            {LANGUAGE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </SettingRow>
        <SettingRow label="Salvar anotações automaticamente" description="Grava as anotações enquanto você escreve, sem precisar salvar.">
          <Switch
            aria-label="Salvar anotações automaticamente"
            checked={form.auto_save_notes}
            onChange={(value) => handleChange('auto_save_notes', value)}
          />
        </SettingRow>
      </Section>

      <div className={styles.footer}>
        <Button variant="primary" onClick={handleSaveSettings} loading={saving}>Salvar configurações</Button>
      </div>
    </div>
  );
}
