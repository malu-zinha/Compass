import { useEffect, useId, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import ThemeSwitcher from '../../theme/ThemeSwitcher';
import { Avatar } from '../ui';
import { ChevronDownIcon, LogoutIcon, SettingsIcon, UserIcon } from '../icons';
import styles from './AccountMenu.module.css';

/*
 * Menu de conta no pé da sidebar: botão de divulgação (aria-expanded) que abre
 * um painel com tema, Perfil, Configurações e Sair. Esc ou clique fora fecham;
 * Esc devolve o foco ao botão.
 */
export default function AccountMenu({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const go = () => {
    setOpen(false);
    onNavigate?.();
  };

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/');
  };

  return (
    <div ref={rootRef} className={styles.root}>
      {open && (
        <div id={panelId} className={styles.panel}>
          <div className={styles.identity}>
            <span className={styles.name}>{user?.name}</span>
            <span className={styles.email}>{user?.email}</span>
          </div>
          <ThemeSwitcher compact className={styles.theme} />
          <nav aria-label="Conta" className={styles.links}>
            <NavLink to="/perfil" className={styles.link} onClick={go}>
              <UserIcon size={16} /> Perfil
            </NavLink>
            <NavLink to="/configuracoes" className={styles.link} onClick={go}>
              <SettingsIcon size={16} /> Configurações
            </NavLink>
          </nav>
          <button type="button" className={`${styles.link} ${styles.logout}`} onClick={handleLogout}>
            <LogoutIcon size={16} /> Sair
          </button>
        </div>
      )}
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <Avatar src={user?.avatar_url} name={user?.name} size="md" />
        <span className={styles.who}>
          <span className={styles.name}>{user?.name}</span>
          <span className={styles.role}>{user?.job_title}</span>
        </span>
        <ChevronDownIcon size={16} className={open ? styles.chevronOpen : styles.chevron} />
      </button>
    </div>
  );
}
