import { useId } from 'react';
import { cx } from './cx';
import styles from './SegmentedControl.module.css';

/*
 * Escolha única entre poucas opções, sobre rádios nativos (setas do teclado
 * e "1 de N" vêm do navegador). options: [{ value, label, count? }].
 */
export default function SegmentedControl({ label, options, value, onChange, className }) {
  const name = useId();
  return (
    <fieldset className={cx(styles.group, className)}>
      <legend className="sr-only">{label}</legend>
      {options.map((opt) => (
        <label key={opt.value} className={styles.option}>
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className={styles.input}
          />
          <span>{opt.label}</span>
          {opt.count !== undefined && <span className={styles.count}>{opt.count}</span>}
        </label>
      ))}
    </fieldset>
  );
}
