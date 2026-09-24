import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLayoutSlots } from './LayoutContext';
import styles from './PageHeader.module.css';

/*
 * Título e ações da página, desenhados no cabeçalho do AppLayout via portal.
 * A página continua dona das próprias ações (estado, handlers) sem subir JSX
 * para o layout. Fora do AppLayout — em teste ou numa rota sem shell — vira
 * um cabeçalho comum no lugar.
 */
export default function PageHeader({ title, actions }) {
  const slots = useLayoutSlots();

  useEffect(() => {
    if (typeof title === 'string' && title) document.title = `${title} · Compass`;
  }, [title]);

  const heading = <h1 className={styles.title}>{title}</h1>;

  if (!slots) {
    return (
      <div className={styles.inline}>
        {heading}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    );
  }
  return (
    <>
      {slots.titleSlot && createPortal(heading, slots.titleSlot)}
      {slots.actionsSlot && actions && createPortal(actions, slots.actionsSlot)}
    </>
  );
}
