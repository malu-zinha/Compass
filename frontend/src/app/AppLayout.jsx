import { useCallback, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppHeader, LayoutContext, Sidebar } from '../components/layout';
import { ErrorBoundary } from '../components/ui';
import styles from './AppLayout.module.css';

/*
 * Shell das telas autenticadas: sidebar (rail ou gaveta), cabeçalho com os
 * slots que PageHeader preenche, e o conteúdo dentro de um ErrorBoundary que
 * reinicia a cada rota — um erro numa tela não derruba a navegação.
 */
export default function AppLayout() {
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [titleSlot, setTitleSlot] = useState(null);
  const [actionsSlot, setActionsSlot] = useState(null);
  const menuRef = useRef(null);

  const dismiss = useCallback(() => {
    setDrawerOpen(false);
    menuRef.current?.focus();
  }, []);
  const closeOnNavigate = useCallback(() => setDrawerOpen(false), []);

  const slots = useMemo(() => ({ titleSlot, actionsSlot }), [titleSlot, actionsSlot]);

  return (
    <LayoutContext.Provider value={slots}>
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
      <Sidebar id="app-sidebar" open={drawerOpen} onDismiss={dismiss} onNavigate={closeOnNavigate} />
      <div className={styles.main}>
        <AppHeader
          menuRef={menuRef}
          titleRef={setTitleSlot}
          actionsRef={setActionsSlot}
          menuExpanded={drawerOpen}
          onMenuClick={() => setDrawerOpen(true)}
        />
        <main id="conteudo" tabIndex={-1} className={styles.content}>
          <ErrorBoundary key={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </LayoutContext.Provider>
  );
}
