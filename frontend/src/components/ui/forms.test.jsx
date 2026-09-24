import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Field, Input, Textarea, Select, Checkbox, Switch } from './index';

describe('Field + Input', () => {
  it('liga rótulo, dica e erro ao controle', () => {
    render(
      <Field label="E-mail" hint="Usamos para login" error="E-mail inválido">
        <Input type="email" />
      </Field>,
    );
    const input = screen.getByLabelText('E-mail');
    expect(input).toHaveAccessibleDescription('Usamos para login E-mail inválido');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('E-mail inválido')).toHaveAttribute('role', 'alert');
  });

  it('marca obrigatório visualmente e para leitores de tela', () => {
    render(<Field label="Nome" required><Input /></Field>);
    expect(screen.getByLabelText(/Nome/)).toBeRequired();
  });

  it('Input funciona fora de Field e repassa props', async () => {
    const onChange = vi.fn();
    render(<Input aria-label="Busca" placeholder="Buscar" onChange={onChange} className="x" />);
    const input = screen.getByRole('textbox', { name: 'Busca' });
    expect(input).toHaveClass('x');
    await userEvent.type(input, 'ab');
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});

describe('Textarea e Select', () => {
  it('ligam ao Field', () => {
    render(
      <>
        <Field label="Notas"><Textarea /></Field>
        <Field label="Idioma">
          <Select defaultValue="pt">
            <option value="pt">Português</option>
            <option value="en">Inglês</option>
          </Select>
        </Field>
      </>,
    );
    expect(screen.getByRole('textbox', { name: 'Notas' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Idioma' })).toHaveValue('pt');
  });
});

describe('Checkbox e Switch', () => {
  it('Checkbox tem rótulo clicável', async () => {
    const onChange = vi.fn();
    render(<Checkbox label="Lembrar" onChange={onChange} />);
    await userEvent.click(screen.getByText('Lembrar'));
    expect(screen.getByRole('checkbox', { name: 'Lembrar' })).toBeChecked();
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('Switch expõe role=switch e alterna', async () => {
    const onChange = vi.fn();
    render(<Switch label="Salvar notas" checked={false} onChange={onChange} />);
    const sw = screen.getByRole('switch', { name: 'Salvar notas' });
    expect(sw).not.toBeChecked();
    await userEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
