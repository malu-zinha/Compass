import { CheckIcon } from '../../../components/icons';
import styles from './PointsList.module.css';

/* Pontos positivos (✓ verde) ou de atenção (– vermelho). O ícone reforça, o título diz. */
export default function PointsList({ items, tone = 'positive', limit, empty = 'Nada registrado' }) {
  const shown = limit ? items.slice(0, limit) : items;
  if (shown.length === 0) return <p className={styles.empty}>{empty}</p>;
  return (
    <ul className={`${styles.list} ${styles[tone]}`}>
      {shown.map((point, i) => (
        <li key={i}>
          <span className={styles.mark} aria-hidden="true">
            {tone === 'positive' ? <CheckIcon size={14} /> : <span className={styles.dash} />}
          </span>
          <span>{point}</span>
        </li>
      ))}
      {limit && items.length > limit && <li className={styles.more}>+{items.length - limit}</li>}
    </ul>
  );
}
