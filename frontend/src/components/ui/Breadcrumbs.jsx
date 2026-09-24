import { Link } from 'react-router-dom';
import { cx } from './cx';
import styles from './Breadcrumbs.module.css';

/*
 * Os níveis acima da página atual (a página em si é o <h1> ao lado). No
 * celular fica só o nível imediatamente acima, que funciona como "voltar".
 */
export default function Breadcrumbs({ items, className }) {
  if (!items?.length) return null;
  return (
    <nav aria-label="Caminho" className={cx(styles.nav, className)}>
      <ol className={styles.list}>
        {items.map((item) => (
          <li key={item.to} className={styles.item}>
            <Link to={item.to} className={styles.link}>{item.label}</Link>
            <span className={styles.sep} aria-hidden="true">/</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
