import { Component } from 'react';
import Button from './Button';
import { cx } from './cx';
import styles from './feedback.module.css';

/* variant: line | block | circle. Decorativo: quem carrega anuncia com Spinner ou aria-busy. */
export function Skeleton({ variant = 'line', width, height, className }) {
  return (
    <span
      aria-hidden="true"
      className={cx(styles.skeleton, styles[variant], className)}
      style={{ width, height }}
    />
  );
}

export function Spinner({ label = 'Carregando', size = 'md', className }) {
  return (
    <span role="status" className={cx(styles.spinnerWrap, className)}>
      <span className={cx(styles.spinner, styles[`spinner-${size}`])} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function EmptyState({ icon, title, description, action, className }) {
  return (
    <div className={cx(styles.empty, className)}>
      {icon && <div className={styles.emptyIcon} aria-hidden="true">{icon}</div>}
      <h2 className={styles.emptyTitle}>{title}</h2>
      {description && <p className={styles.emptyText}>{description}</p>}
      {action && <div className={styles.emptyAction}>{action}</div>}
    </div>
  );
}

export function ErrorPanel({ title = 'Algo deu errado', message, onRetry, retryLabel = 'Tentar novamente', className }) {
  return (
    <div role="alert" className={cx(styles.error, className)}>
      <h2 className={styles.errorTitle}>{title}</h2>
      {message && <p className={styles.emptyText}>{message}</p>}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

/*
 * Um erro de renderização em uma tela não derruba o app inteiro: a tela vira um
 * ErrorPanel com opção de recarregar.
 */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Erro de renderização:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <ErrorPanel
        message="Esta tela encontrou um erro inesperado. Recarregar costuma resolver."
        retryLabel="Recarregar"
        onRetry={() => window.location.reload()}
      />
    );
  }
}
