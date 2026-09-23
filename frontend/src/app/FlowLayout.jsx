import { Link, Outlet, useLocation } from 'react-router-dom';
import { Logo } from '../components/brand';
import { ErrorBoundary } from '../components/ui';
import styles from './FlowLayout.module.css';

/*
 * Moldura do fluxo de nova entrevista: cabeçalho enxuto com a marca, indicador
 * de etapa e saída clara. Na gravação ao vivo não há "Cancelar": sair por um
 * link comum abandonaria a sessão sem encerrar — a própria tela tem os
 * controles de encerramento.
 */
function stepsFor(pathname) {
  if (pathname.startsWith('/gravar')) return { current: 2, last: 'Gravar', exit: false };
  if (pathname.startsWith('/upload')) return { current: 2, last: 'Enviar', exit: true };
  if (pathname.startsWith('/tipo-entrevista')) return { current: 1, last: 'Gravar ou enviar', exit: true };
  return { current: 0, last: 'Gravar ou enviar', exit: true };
}

export default function FlowLayout() {
  const { pathname } = useLocation();
  const { current, last, exit } = stepsFor(pathname);
  const steps = ['Candidato', 'Formato', last];

  return (
    <div className={styles.flow}>
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
      <header className={styles.header}>
        <Link to="/inicio" className={styles.brand} aria-label="Compass — início">
          <Logo variant="full" decorative className={styles.logo} />
        </Link>
        <ol className={styles.steps} aria-label="Etapas da nova entrevista">
          {steps.map((label, index) => (
            <li
              key={label}
              className={index < current ? styles.done : index === current ? styles.current : undefined}
              aria-current={index === current ? 'step' : undefined}
            >
              <span className={styles.number} aria-hidden="true">{index + 1}</span>
              <span className={styles.label}>{label}</span>
            </li>
          ))}
        </ol>
        <div className={styles.end}>
          {exit && (
            <Link to="/inicio" className={styles.exit}>
              Cancelar
            </Link>
          )}
        </div>
      </header>
      <main id="conteudo" tabIndex={-1} className={styles.content}>
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
