import { useId } from 'react';
import { cx } from './cx';
import { FieldContext } from './FieldContext';
import styles from './Field.module.css';

/*
 * Envolve um controle (Input, Textarea, Select) com rótulo, dica e erro. O
 * controle lê id, aria-describedby e aria-invalid do contexto, então nenhum
 * campo fica sem rótulo ou com mensagem de erro solta.
 */
export default function Field({ label, hint, error, required = false, className, children }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: Boolean(error), required }}>
      <div className={cx(styles.field, className)}>
        <label htmlFor={id} className={styles.label}>
          {label}
          {required && <span className={styles.required} aria-hidden="true"> *</span>}
        </label>
        {children}
        {hint && <p id={hintId} className={styles.hint}>{hint}</p>}
        {error && <p id={errorId} className={styles.error} role="alert">{error}</p>}
      </div>
    </FieldContext.Provider>
  );
}
