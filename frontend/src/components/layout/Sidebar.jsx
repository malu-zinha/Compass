import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { Logo } from '../brand';
import { BriefcaseIcon, HomeIcon, InterviewsIcon, PlusIcon, QuestionsIcon } from '../icons';
import { Button } from '../ui';
import AccountMenu from './AccountMenu';
import styles from './Sidebar.module.css';
import { paths } from '../../app/paths';

const NAV = [
  { to: paths.inicio, label: 'Início', Icon: HomeIcon },
  { to: paths.entrevistas, label: 'Entrevistas', Icon: InterviewsIcon },
  { to: paths.vagas, label: 'Vagas', Icon: BriefcaseIcon },
  { to: paths.perguntas, label: 'Perguntas gerais', Icon: QuestionsIcon },
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
          <NavLink to={paths.inicio} className={styles.brandLink} onClick={onNavigate}>
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

        <div className={styles.cta}>
          <Button as={NavLink} to={paths.novaEntrevista()} variant="primary" icon={<PlusIcon size={18} />} className={styles.new} onClick={onNavigate}>
            Nova entrevista
          </Button>
        </div>

        <div className={styles.footer}>
          <AccountMenu onNavigate={onNavigate} />
        </div>
      </aside>
    </>
  );
}
