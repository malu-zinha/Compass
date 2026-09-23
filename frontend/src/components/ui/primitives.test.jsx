import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, Card, Chip, StatusBadge } from './index';
import { PlusIcon } from '../icons';

describe('Button', () => {
  it('é um botão type=button por padrão e dispara onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Salvar</Button>);
    const btn = screen.getByRole('button', { name: 'Salvar' });
    expect(btn).toHaveAttribute('type', 'button');
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('aceita type, className e props', () => {
    render(<Button type="submit" className="extra" data-x="1">Enviar</Button>);
    const btn = screen.getByRole('button', { name: 'Enviar' });
    expect(btn).toHaveAttribute('type', 'submit');
    expect(btn).toHaveClass('extra');
    expect(btn).toHaveAttribute('data-x', '1');
  });

  it('em loading fica desabilitado, marca aria-busy e não dispara', async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Salvar</Button>);
    const btn = screen.getByRole('button', { name: /Salvar/ });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('iconOnly exige e usa um nome acessível', () => {
    render(<Button iconOnly aria-label="Adicionar" icon={<PlusIcon />} />);
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeInTheDocument();
  });

  it('renderiza como outro elemento via "as"', () => {
    render(<Button as="a" href="/x">Link</Button>);
    const link = screen.getByRole('link', { name: 'Link' });
    expect(link).toHaveAttribute('href', '/x');
    expect(link).not.toHaveAttribute('type');
  });
});

describe('Card', () => {
  it('renderiza filhos, className e elemento escolhido', () => {
    render(<Card as="section" aria-label="Resumo" className="c">conteúdo</Card>);
    const card = screen.getByRole('region', { name: 'Resumo' });
    expect(card).toHaveClass('c');
    expect(card).toHaveTextContent('conteúdo');
  });
});

describe('Chip', () => {
  it('renderiza texto e, se removível, um botão nomeado', async () => {
    const onRemove = vi.fn();
    render(<Chip onRemove={onRemove}>React</Chip>);
    expect(screen.getByText('React')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remover React' }));
    expect(onRemove).toHaveBeenCalledOnce();
  });
});

describe('StatusBadge', () => {
  it('mostra o rótulo em pt-BR do status', () => {
    render(<StatusBadge status="transcribing" />);
    expect(screen.getByText('Transcrevendo')).toBeInTheDocument();
  });
});
