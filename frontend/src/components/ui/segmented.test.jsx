import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { FilterBar, SegmentedControl } from './index';

test('SegmentedControl é um grupo de rádios com contagem', async () => {
  const onChange = vi.fn();
  render(
    <SegmentedControl
      label="Status"
      value="todos"
      onChange={onChange}
      options={[{ value: 'todos', label: 'Todos', count: 7 }, { value: 'done', label: 'Concluídas', count: 5 }]}
    />,
  );
  expect(screen.getByRole('group', { name: 'Status' })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: /Todos/ })).toBeChecked();
  await userEvent.click(screen.getByRole('radio', { name: /Concluídas/ }));
  expect(onChange).toHaveBeenCalledWith('done');
});

test('FilterBar agrupa os filtros e anuncia o resumo', () => {
  render(<FilterBar summary="3 entrevistas"><input aria-label="Busca" /></FilterBar>);
  expect(screen.getByRole('group', { name: 'Filtros' })).toContainElement(screen.getByLabelText('Busca'));
  expect(screen.getByText('3 entrevistas')).toHaveAttribute('aria-live', 'polite');
});
