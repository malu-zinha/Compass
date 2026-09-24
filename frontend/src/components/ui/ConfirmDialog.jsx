import { createContext, useCallback, useContext, useRef, useState } from 'react';
import Modal from './Modal';
import Button from './Button';

const ConfirmContext = createContext(null);

/*
 * const confirm = useConfirm();
 * if (!(await confirm({ message, confirmLabel: 'Excluir', tone: 'danger' }))) return;
 *
 * Substitui window.confirm() mantendo o mesmo formato de uso (retorna boolean),
 * só que assíncrono. O foco inicial fica em Cancelar: Enter nunca destrói nada.
 */
export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm precisa estar dentro de <ConfirmProvider>');
  return confirm;
}

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  const cancelRef = useRef(null);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        setRequest((previous) => {
          previous?.resolve(false);
          return { ...options, resolve };
        });
      }),
    [],
  );

  const settle = (value) => {
    request?.resolve(value);
    setRequest(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={Boolean(request)}
        onClose={() => settle(false)}
        role="alertdialog"
        size="sm"
        title={request?.title ?? 'Confirmar'}
        description={request?.message}
        initialFocusRef={cancelRef}
        closeOnOverlay={false}
        footer={
          <>
            <Button ref={cancelRef} variant="ghost" onClick={() => settle(false)}>
              {request?.cancelLabel ?? 'Cancelar'}
            </Button>
            <Button variant={request?.tone === 'danger' ? 'danger' : 'primary'} onClick={() => settle(true)}>
              {request?.confirmLabel ?? 'Confirmar'}
            </Button>
          </>
        }
      />
    </ConfirmContext.Provider>
  );
}
