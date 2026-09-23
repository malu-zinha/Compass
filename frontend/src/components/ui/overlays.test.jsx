import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal, Button, ConfirmProvider, useConfirm, ToastProvider, useToast } from './index';

function ModalHarness({ onClose = () => {} }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>abrir</button>
      <Modal
        open={open}
        onClose={() => { onClose(); setOpen(false); }}
        title="Detalhes"
        footer={<Button onClick={() => setOpen(false)}>Fechar</Button>}
      >
        <input aria-label="campo" />
      </Modal>
    </>
  );
}

describe('Modal', () => {
  it('é um diálogo modal nomeado pelo título', async () => {
    render(<ModalHarness />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('abrir'));
    const dialog = screen.getByRole('dialog', { name: 'Detalhes' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('foca dentro ao abrir, prende o Tab e devolve o foco ao fechar', async () => {
    render(<ModalHarness />);
    const trigger = screen.getByText('abrir');
    await userEvent.click(trigger);
    expect(screen.getByLabelText('campo')).toHaveFocus();

    await userEvent.tab(); // Fechar (rodapé)
    await userEvent.tab(); // botão X
    await userEvent.tab(); // volta ao primeiro
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement);

    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(trigger).toHaveFocus();
  });

  it('fecha com Esc e com o botão de fechar', async () => {
    const onClose = vi.fn();
    render(<ModalHarness onClose={onClose} />);
    await userEvent.click(screen.getByText('abrir'));
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByText('abrir'));
    await userEvent.click(screen.getByRole('button', { name: 'Fechar diálogo' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

function ConfirmHarness({ onResult }) {
  const confirm = useConfirm();
  return (
    <button
      onClick={async () =>
        onResult(await confirm({ message: 'Apagar tudo?', confirmLabel: 'Apagar', tone: 'danger' }))
      }
    >
      apagar
    </button>
  );
}

describe('useConfirm', () => {
  it('resolve true ao confirmar, preservando a frase exata', async () => {
    const onResult = vi.fn();
    render(<ConfirmProvider><ConfirmHarness onResult={onResult} /></ConfirmProvider>);
    await userEvent.click(screen.getByText('apagar'));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('Apagar tudo?');
    await userEvent.click(screen.getByRole('button', { name: 'Apagar' }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('resolve false ao cancelar ou com Esc', async () => {
    const onResult = vi.fn();
    render(<ConfirmProvider><ConfirmHarness onResult={onResult} /></ConfirmProvider>);
    await userEvent.click(screen.getByText('apagar'));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(onResult).toHaveBeenLastCalledWith(false));

    await userEvent.click(screen.getByText('apagar'));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(onResult).toHaveBeenCalledTimes(2));
    expect(onResult).toHaveBeenLastCalledWith(false);
  });

  it('foca Cancelar primeiro, para que Enter não destrua nada por acidente', async () => {
    render(<ConfirmProvider><ConfirmHarness onResult={() => {}} /></ConfirmProvider>);
    await userEvent.click(screen.getByText('apagar'));
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
  });
});

function ToastHarness() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.error('Falhou')}>erro</button>
      <button onClick={() => toast.success('Salvo')}>ok</button>
    </>
  );
}

describe('useToast', () => {
  it('anuncia erro como alert e sucesso como status, e dispensa pelo botão', async () => {
    render(<ToastProvider><ToastHarness /></ToastProvider>);
    await userEvent.click(screen.getByText('erro'));
    await userEvent.click(screen.getByText('ok'));
    expect(screen.getByRole('alert')).toHaveTextContent('Falhou');
    expect(screen.getByRole('status')).toHaveTextContent('Salvo');

    await userEvent.click(screen.getAllByRole('button', { name: 'Dispensar notificação' })[0]);
    expect(screen.queryByText('Falhou')).not.toBeInTheDocument();
  });

  it('some sozinho depois do tempo', () => {
    vi.useFakeTimers();
    render(<ToastProvider><ToastHarness /></ToastProvider>);
    act(() => screen.getByText('ok').click());
    expect(screen.getByText('Salvo')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.queryByText('Salvo')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('exige o provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ToastHarness />)).toThrow(/ToastProvider/);
    console.error.mockRestore();
  });
});
