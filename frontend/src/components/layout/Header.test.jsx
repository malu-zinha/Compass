import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import Header from './Header';

const renderHeader = (props) => render(
  <MemoryRouter>
    <Header title="Ranking" showComparar {...props} />
  </MemoryRouter>,
);

test('botão Comparar usa o rótulo padrão e chama onCompareClick', async () => {
  const onCompareClick = vi.fn();
  renderHeader({ onCompareClick });
  await userEvent.click(screen.getByRole('button', { name: 'Comparar' }));
  expect(onCompareClick).toHaveBeenCalledTimes(1);
});

test('compareLabel substitui o texto do botão', () => {
  renderHeader({ compareLabel: 'Cancelar' });
  expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveClass('btn-comparar');
  expect(screen.queryByRole('button', { name: 'Comparar' })).not.toBeInTheDocument();
});
