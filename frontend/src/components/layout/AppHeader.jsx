import { Link } from 'react-router-dom';
import { Button } from '../ui';
import { Logo } from '../brand';
import { MenuIcon, PlusIcon } from '../icons';
import styles from './AppHeader.module.css';

/*
 * Grade de três colunas — [menu+logo] [título] [ações] — com o título em
 * ellipsis: nada de posicionamento absoluto, então título longo nunca colide
 * com os botões. Menu e logo só aparecem quando a sidebar é gaveta.
 */
export default function AppHeader({ onMenuClick, menuExpanded, menuRef, titleRef, actionsRef }) {
  return (
    <header className={styles.header}>
      <div className={styles.start}>
        <Button
          ref={menuRef}
          variant="ghost"
          iconOnly
          icon={<MenuIcon />}
          aria-label="Abrir menu"
          aria-expanded={menuExpanded}
          aria-controls="app-sidebar"
          className={styles.menu}
          onClick={onMenuClick}
        />
        <Link to="/inicio" className={styles.logo} aria-label="Compass — início">
          <Logo variant="mark" decorative size={28} />
        </Link>
      </div>
      <div ref={titleRef} className={styles.title} />
      <div className={styles.actions}>
        <div ref={actionsRef} className={styles.pageActions} />
        <Button as={Link} to="/nova-entrevista" variant="primary" icon={<PlusIcon size={18} />}>
          <span className={styles.newLabel}>Nova entrevista</span>
        </Button>
      </div>
    </header>
  );
}
