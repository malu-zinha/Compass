import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { Logo } from '../brand';
import { ChartIcon, HomeIcon, InterviewsIcon, JobsIcon, QuestionsIcon } from '../icons';
import AccountMenu from './AccountMenu';
import styles from './Sidebar.module.css';

const NAV = [
  { to: '/inicio', label: 'Início', Icon: HomeIcon },
  { to: '/entrevistas', label: 'Entrevistas', Icon: InterviewsIcon },
  { to: '/ranking', label: 'Ranking', Icon: ChartIcon },
  { to: '/cargos', label: 'Cargos', Icon: JobsIcon },
  { to: '/perguntas', label: 'Perguntas', Icon: QuestionsIcon },
];

/*
 * Rail fixo a partir de 1024px; abaixo disso, gaveta com overlay. Aberta como
 * gaveta, o foco vai para o primeiro link e Esc ou o overlay fecham
 * (onDismiss devolve o foco ao botão de menu). Clicar num link só fecha.
 */
export default function Sidebar({ id, open = false, onDismiss, onNavigate }) {
  const navRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    navRef.current?.querySelector('a')?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') onDismiss?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onDismiss]);

  return (
    <>
      {open && <div className={styles.overlay} onClick={onDismiss} aria-hidden="true" />}
      <aside id={id} className={`${styles.sidebar} ${open ? styles.open : ''}`} aria-label="Navegação principal">
        <div className={styles.brand}>
          <NavLink to="/inicio" className={styles.brandLink} onClick={onNavigate}>
            <Logo variant="full" />
          </NavLink>
        </div>

        <nav ref={navRef} className={styles.nav}>
          <ul>
            {NAV.map(({ to, label, Icon }) => (
              <li key={to}>
                <NavLink to={to} className={styles.item} onClick={onNavigate}>
                  <Icon size={20} />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.footer}>
          <AccountMenu onNavigate={onNavigate} />
        </div>
      </aside>
    </>
  );
}
