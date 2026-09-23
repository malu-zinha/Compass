import { useEffect, useId, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './cx';
import styles from './Modal.module.css';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/*
 * Diálogo modal acessível: foco vai para dentro ao abrir (primeiro campo do
 * corpo, ou initialFocusRef), Tab fica preso no diálogo, Esc e o X chamam
 * onClose, e o foco volta a quem abriu. O fundo não rola enquanto aberto.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  role = 'dialog',
  initialFocusRef,
  closeOnOverlay = true,
  className,
}) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef(null);
  const bodyRef = useRef(null);

  // Guarda quem tinha o foco e devolve ao fechar.
  useLayoutEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const target =
      initialFocusRef?.current ?? bodyRef.current?.querySelector(FOCUSABLE) ?? dialogRef.current;
    target?.focus();
    return () => {
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, [open, initialFocusRef]);

  useEffect(() => {
    if (!open) return undefined;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  if (!open) return null;

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose?.();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)];
    if (items.length === 0) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (closeOnOverlay && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cx(styles.dialog, styles[size], className)}
        onKeyDown={handleKeyDown}
      >
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>{title}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar diálogo">
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div ref={bodyRef} className={styles.body}>
          {description && <p id={descId} className={styles.description}>{description}</p>}
          {children}
        </div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
