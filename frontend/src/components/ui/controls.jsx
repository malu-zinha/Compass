import { useField } from './FieldContext';
import { cx } from './cx';
import styles from './controls.module.css';

// Mescla o que o Field fornece com o que o chamador passou; o chamador vence.
function useFieldProps({ id, required, 'aria-describedby': describedBy, 'aria-invalid': invalid, ...rest }) {
  const field = useField();
  return {
    id: id ?? field?.id,
    required: required ?? field?.required,
    'aria-describedby': describedBy ?? field?.describedBy,
    'aria-invalid': invalid ?? (field?.invalid || undefined),
    ...rest,
  };
}

export function Input({ className, ...props }) {
  return <input className={cx(styles.control, className)} {...useFieldProps(props)} />;
}

export function Textarea({ className, rows = 4, ...props }) {
  return <textarea rows={rows} className={cx(styles.control, styles.textarea, className)} {...useFieldProps(props)} />;
}

export function Select({ className, children, ...props }) {
  return (
    <select className={cx(styles.control, styles.select, className)} {...useFieldProps(props)}>
      {children}
    </select>
  );
}

export function Checkbox({ label, className, ...props }) {
  return (
    <label className={cx(styles.check, className)}>
      <input type="checkbox" className={styles.checkbox} {...props} />
      <span>{label}</span>
    </label>
  );
}

/*
 * onChange recebe o booleano novo, não o evento — é o que todo chamador quer.
 * Um <button role="switch"> em vez de checkbox estilizado: anuncia "ligado /
 * desligado", que é a semântica certa para uma preferência de efeito imediato.
 */
export function Switch({ label, checked, onChange, disabled, className, id, ...rest }) {
  return (
    <label className={cx(styles.switchRow, className)}>
      <span>{label}</span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={Boolean(checked)}
        disabled={disabled}
        className={styles.switch}
        onClick={() => onChange?.(!checked)}
        {...rest}
      >
        <span className={styles.thumb} aria-hidden="true" />
      </button>
    </label>
  );
}
