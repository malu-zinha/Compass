import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from './ThemeProvider';
import ThemeSwitcher from './ThemeSwitcher';

describe('ThemeSwitcher', () => {
  it('é um grupo de três rádios que troca o tema', async () => {
    localStorage.clear();
    render(<ThemeProvider><ThemeSwitcher /></ThemeProvider>);
    expect(screen.getByRole('group', { name: 'Tema' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Sistema' })).toBeChecked();

    await userEvent.click(screen.getByRole('radio', { name: 'Escuro' }));
    expect(screen.getByRole('radio', { name: 'Escuro' })).toBeChecked();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('versão compacta mantém os nomes acessíveis', () => {
    render(<ThemeProvider><ThemeSwitcher compact /></ThemeProvider>);
    expect(screen.getAllByRole('radio').map((r) => r.getAttribute('aria-label'))).toEqual([
      'Claro', 'Escuro', 'Sistema',
    ]);
  });
});
