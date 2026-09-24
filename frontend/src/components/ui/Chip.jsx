import { cx } from './cx';
import styles from './Chip.module.css';

/*
 * tone: neutral | info | success | danger
 * (info = azul: informação e "em andamento"; não há mais âmbar)
 * onRemove torna o chip removível, com um botão nomeado "Remover <texto>".
 */
export default function Chip({ tone = 'neutral', icon, onRemove, removeLabel, className, children, ...rest }) {
  const label = removeLabel ?? (typeof children === 'string' ? `Remover ${children}` : 'Remover');
  return (
    <span className={cx(styles.chip, styles[tone], className)} {...rest}>
      {icon}
      <span>{children}</span>
      {onRemove && (
        <button type="button" className={styles.remove} onClick={onRemove} aria-label={label}>
          <span aria-hidden="true">×</span>
        </button>
      )}
    </span>
  );
}
