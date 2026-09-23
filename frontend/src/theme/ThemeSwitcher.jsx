import { useId } from 'react';
import { MonitorIcon, MoonIcon, SunIcon } from '../components/icons';
import { useTheme } from './ThemeProvider';
import styles from './ThemeSwitcher.module.css';

const OPTIONS = [
  { value: 'light', label: 'Claro', Icon: SunIcon },
  { value: 'dark', label: 'Escuro', Icon: MoonIcon },
  { value: 'system', label: 'Sistema', Icon: MonitorIcon },
];

/*
 * Controle segmentado de três estados sobre rádios nativos: setas do teclado,
 * anúncio de "1 de 3" e agrupamento vêm de graça do navegador.
 */
export default function ThemeSwitcher({ compact = false, className }) {
  const { preference, setPreference } = useTheme();
  const name = useId();

  return (
    <fieldset className={[styles.group, compact && styles.compact, className].filter(Boolean).join(' ')}>
      <legend className="sr-only">Tema</legend>
      {OPTIONS.map(({ value, label, Icon }) => (
        <label key={value} className={styles.option} title={compact ? label : undefined}>
          <input
            type="radio"
            name={name}
            value={value}
            checked={preference === value}
            onChange={() => setPreference(value)}
            className={styles.input}
            aria-label={compact ? label : undefined}
          />
          <Icon size={16} />
          {!compact && <span>{label}</span>}
        </label>
      ))}
    </fieldset>
  );
}
