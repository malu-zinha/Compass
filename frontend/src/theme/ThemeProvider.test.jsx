import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeProvider';
import { THEME_STORAGE_KEY } from './theme';

let osListeners;
let osDark;

function stubMatchMedia() {
  osListeners = new Set();
  window.matchMedia = vi.fn(() => ({
    get matches() {
      return osDark;
    },
    addEventListener: (_t, fn) => osListeners.add(fn),
    removeEventListener: (_t, fn) => osListeners.delete(fn),
  }));
}

function setOsDark(value) {
  osDark = value;
  act(() => osListeners.forEach((fn) => fn({ matches: value })));
}

function Probe() {
  const { preference, theme, setPreference } = useTheme();
  return (
    <div>
      <p>preference: {preference}</p>
      <p>theme: {theme}</p>
      <button onClick={() => setPreference('dark')}>escuro</button>
      <button onClick={() => setPreference('light')}>claro</button>
      <button onClick={() => setPreference('system')}>sistema</button>
    </div>
  );
}

beforeEach(() => {
  osDark = false;
  stubMatchMedia();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('ThemeProvider', () => {
  it('follows the OS by default', () => {
    osDark = true;
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByText('preference: system')).toBeInTheDocument();
    expect(screen.getByText('theme: dark')).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('restores a stored preference', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByText('theme: dark')).toBeInTheDocument();
  });

  it('persists and applies an explicit choice', async () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'escuro' }));
    expect(screen.getByText('theme: dark')).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('tracks OS changes only while on "system"', async () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    setOsDark(true);
    expect(screen.getByText('theme: dark')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'claro' }));
    setOsDark(false);
    setOsDark(true);
    expect(screen.getByText('theme: light')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'sistema' }));
    expect(screen.getByText('theme: dark')).toBeInTheDocument();
  });

  it('throws a clear error when used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/ThemeProvider/);
    console.error.mockRestore();
  });
});
