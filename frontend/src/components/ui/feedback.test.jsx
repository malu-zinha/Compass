import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Skeleton, EmptyState, ErrorPanel, Spinner, ErrorBoundary, ScoreMeter, Button } from './index';

describe('Skeleton e Spinner', () => {
  it('Skeleton é invisível para leitores de tela', () => {
    const { container } = render(<Skeleton variant="line" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('Spinner anuncia o carregamento', () => {
    render(<Spinner label="Carregando entrevistas" />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando entrevistas');
  });
});

describe('EmptyState', () => {
  it('mostra título, texto e ação', () => {
    render(<EmptyState title="Nenhum cargo" description="Crie o primeiro." action={<Button>Novo cargo</Button>} />);
    expect(screen.getByRole('heading', { name: 'Nenhum cargo' })).toBeInTheDocument();
    expect(screen.getByText('Crie o primeiro.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Novo cargo' })).toBeInTheDocument();
  });
});

describe('ErrorPanel e ErrorBoundary', () => {
  it('ErrorPanel oferece tentar de novo', async () => {
    const onRetry = vi.fn();
    render(<ErrorPanel message="Sem conexão" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Sem conexão');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('ErrorBoundary troca uma tela quebrada pelo painel de erro', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function Boom() {
      throw new Error('quebrou');
    }
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toHaveTextContent('Algo deu errado');
    console.error.mockRestore();
  });
});

describe('ScoreMeter', () => {
  it('expõe o valor como meter com faixa em texto', () => {
    render(<ScoreMeter score={820} label="Pontuação geral" />);
    const meter = screen.getByRole('meter', { name: 'Pontuação geral' });
    expect(meter).toHaveAttribute('aria-valuenow', '82');
    expect(meter).toHaveAttribute('aria-valuetext', '82% — Forte');
    expect(screen.getByText('82%')).toBeInTheDocument();
  });

  it('sem score mostra traço e não finge valor', () => {
    render(<ScoreMeter score={null} label="Pontuação geral" />);
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
