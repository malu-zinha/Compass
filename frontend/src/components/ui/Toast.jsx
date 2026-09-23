import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './cx';
import styles from './Toast.module.css';

const ToastContext = createContext(null);

// Erro fica mais tempo: é o que o usuário mais precisa conseguir ler.
const DURATION = { success: 4000, info: 5000, error: 8000 };

/*
 * const toast = useToast();
 * toast.error('Não foi possível salvar.');  toast.success('Salvo.');
 *
 * Substitui window.alert(). Erro é anunciado como role="alert" (interrompe o
 * leitor de tela); sucesso e informação como role="status" (educado).
 */
export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error('useToast precisa estar dentro de <ToastProvider>');
  return toast;
}

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div role={toast.tone === 'error' ? 'alert' : 'status'} className={cx(styles.toast, styles[toast.tone])}>
      <span className={styles.bar} aria-hidden="true" />
      <p className={styles.message}>{toast.message}</p>
      <button
        type="button"
        className={styles.dismiss}
        onClick={() => onDismiss(toast.id)}
        aria-label="Dispensar notificação"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((tone, message, { duration } = {}) => {
    const id = ++nextId.current;
    setToasts((list) => [...list.slice(-3), { id, tone, message, duration: duration ?? DURATION[tone] }]);
    return id;
  }, []);

  const api = useMemo(
    () => ({
      success: (message, opts) => show('success', message, opts),
      error: (message, opts) => show('error', message, opts),
      info: (message, opts) => show('info', message, opts),
      dismiss,
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <section className={styles.region} aria-label="Notificações">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </section>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
