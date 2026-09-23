import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { renderWithRouter } from '../../test/render';
import NotFoundPage from './NotFoundPage';

test('explica o 404 e leva de volta ao início', () => {
  renderWithRouter(<NotFoundPage />, '/nao-existe');
  expect(screen.getByRole('heading', { level: 1, name: 'Esta página saiu do mapa' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Voltar ao início' })).toHaveAttribute('href', '/inicio');
});
