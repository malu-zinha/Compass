import { cx } from './cx';
import styles from './Card.module.css';

/*
 * variant: flat (só borda) | raised (sombra) | interactive (hover/foco, para
 * cards clicáveis — use com as="button" ou as={Link}).
 */
export default function Card({ as: Component = 'div', variant = 'flat', padding = 'md', className, ...rest }) {
  return (
    <Component className={cx(styles.card, styles[variant], styles[`pad-${padding}`], className)} {...rest} />
  );
}
