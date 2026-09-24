import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import SectionIndex from './SectionIndex';

test('lista as seções e marca a atual', async () => {
  render(
    <>
      <SectionIndex sections={[{ id: 'parecer', label: 'Parecer' }, { id: 'pontos', label: 'Pontos' }]} />
      <section id="parecer" />
      <section id="pontos" />
    </>,
  );
  const nav = screen.getByRole('navigation', { name: 'Nesta página' });
  expect(nav).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Parecer' })).toHaveAttribute('aria-current', 'true');
  expect(screen.getByRole('link', { name: 'Pontos' })).toHaveAttribute('href', '#pontos');

  await userEvent.click(screen.getByRole('link', { name: 'Pontos' }));
  expect(screen.getByRole('link', { name: 'Pontos' })).toHaveAttribute('aria-current', 'true');
});
