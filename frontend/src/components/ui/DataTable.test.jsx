import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import DataTable from './DataTable';

const rows = [
  { id: 1, name: 'Carla', score: 87 },
  { id: 2, name: 'Rafael', score: 64 },
];
const columns = [
  { key: 'name', header: 'Candidata' },
  { key: 'score', header: 'Pontuação', sortable: true, align: 'end', render: (r) => `${r.score}%` },
];

function setup(props = {}) {
  return render(
    <MemoryRouter>
      <DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} caption="Entrevistas" {...props} />
    </MemoryRouter>,
  );
}

test('é uma tabela com cabeçalhos de coluna e legenda', () => {
  setup();
  const table = screen.getByRole('table', { name: 'Entrevistas' });
  expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual(['Candidata', 'Pontuação↓']);
  expect(within(table).getAllByRole('row')).toHaveLength(3);
  expect(screen.getByText('87%')).toBeInTheDocument();
});

test('a primeira coluna vira link da linha', () => {
  setup({ rowHref: (r) => `/entrevista/${r.id}` });
  expect(screen.getByRole('link', { name: 'Carla' })).toHaveAttribute('href', '/entrevista/1');
});

test('ordenação é controlada e anunciada com aria-sort', async () => {
  const onSortChange = vi.fn();
  const { rerender } = setup({ onSortChange });
  const th = screen.getByRole('columnheader', { name: /Pontuação/ });
  expect(th).toHaveAttribute('aria-sort', 'none');

  await userEvent.click(within(th).getByRole('button'));
  expect(onSortChange).toHaveBeenCalledWith({ key: 'score', dir: 'desc' });

  rerender(
    <MemoryRouter>
      <DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} sort={{ key: 'score', dir: 'desc' }} onSortChange={onSortChange} />
    </MemoryRouter>,
  );
  expect(screen.getByRole('columnheader', { name: /Pontuação/ })).toHaveAttribute('aria-sort', 'descending');
  await userEvent.click(screen.getByRole('button', { name: /Pontuação/ }));
  expect(onSortChange).toHaveBeenLastCalledWith({ key: 'score', dir: 'asc' });
});

test('sem linhas mostra o estado vazio', () => {
  setup({ rows: [], empty: <p>Nada aqui</p> });
  expect(screen.getByText('Nada aqui')).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});
