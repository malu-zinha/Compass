import { cx } from './cx';
import styles from './FilterBar.module.css';

/* Faixa de filtros acima de uma lista. `summary` é o texto à direita (ex.: "12 entrevistas"). */
export default function FilterBar({ children, summary, className }) {
  return (
    <div role="group" aria-label="Filtros" className={cx(styles.bar, className)}>
      <div className={styles.controls}>{children}</div>
      {summary && <p className={styles.summary} aria-live="polite">{summary}</p>}
    </div>
  );
}
