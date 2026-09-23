import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, Accordion } from './index';

const items = [
  { id: 'resumo', label: 'Resumo', content: <p>conteúdo resumo</p> },
  { id: 'pontos', label: 'Pontos', content: <p>conteúdo pontos</p> },
  { id: 'notas', label: 'Notas', content: <p>conteúdo notas</p> },
];

describe('Tabs', () => {
  it('segue o padrão tablist/tab/tabpanel', () => {
    render(<Tabs label="Análise" items={items} />);
    expect(screen.getByRole('tablist', { name: 'Análise' })).toBeInTheDocument();
    const first = screen.getByRole('tab', { name: 'Resumo' });
    expect(first).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Resumo' })).toHaveTextContent('conteúdo resumo');
    expect(screen.queryByText('conteúdo pontos')).not.toBeInTheDocument();
  });

  it('só a aba ativa entra no Tab; setas, Home e End navegam', async () => {
    render(<Tabs label="Análise" items={items} />);
    await userEvent.tab();
    expect(screen.getByRole('tab', { name: 'Resumo' })).toHaveFocus();

    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Pontos' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('conteúdo pontos');

    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Notas' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Resumo' })).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Notas' })).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Resumo' })).toHaveFocus();

    await userEvent.tab();
    expect(screen.getByRole('tabpanel')).toHaveFocus();
  });

  it('funciona controlado', async () => {
    const onChange = vi.fn();
    render(<Tabs label="Análise" items={items} value="notas" onChange={onChange} />);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('conteúdo notas');
    await userEvent.click(screen.getByRole('tab', { name: 'Pontos' }));
    expect(onChange).toHaveBeenCalledWith('pontos');
  });
});

describe('Accordion', () => {
  it('botão com aria-expanded controla a região', async () => {
    render(<Accordion title="Histórico">detalhes</Accordion>);
    const button = screen.getByRole('button', { name: 'Histórico' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('detalhes')).not.toBeInTheDocument();

    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Histórico' })).toHaveTextContent('detalhes');
  });

  it('pode começar aberto', () => {
    render(<Accordion title="Histórico" defaultOpen>detalhes</Accordion>);
    expect(screen.getByText('detalhes')).toBeInTheDocument();
  });
});
