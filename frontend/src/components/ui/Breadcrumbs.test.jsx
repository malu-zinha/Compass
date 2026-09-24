import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import Breadcrumbs from './Breadcrumbs';

test('lista os níveis acima como links dentro de "Caminho"', () => {
  render(
    <MemoryRouter>
      <Breadcrumbs items={[{ label: 'Vagas', to: '/vagas' }, { label: 'Frontend', to: '/vagas/3' }]} />
    </MemoryRouter>,
  );
  const nav = screen.getByRole('navigation', { name: 'Caminho' });
  expect(nav).toContainElement(screen.getByRole('link', { name: 'Vagas' }));
  expect(screen.getByRole('link', { name: 'Frontend' })).toHaveAttribute('href', '/vagas/3');
});

test('sem itens não renderiza nada', () => {
  const { container } = render(<Breadcrumbs items={[]} />);
  expect(container).toBeEmptyDOMElement();
});
