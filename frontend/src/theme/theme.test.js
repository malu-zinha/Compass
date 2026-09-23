import { describe, it, expect, vi } from 'vitest';
import {
  THEME_STORAGE_KEY,
  DEFAULT_PREFERENCE,
  readStoredPreference,
  storePreference,
  systemTheme,
  resolveTheme,
  applyTheme,
  watchSystemTheme,
} from './theme';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
    data,
  };
}

const throwingStorage = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

function fakeWindow({ dark = false, legacy = false } = {}) {
  const listeners = new Set();
  const mq = { matches: dark };
  if (legacy) {
    mq.addListener = (fn) => listeners.add(fn);
    mq.removeListener = (fn) => listeners.delete(fn);
  } else {
    mq.addEventListener = (_type, fn) => listeners.add(fn);
    mq.removeEventListener = (_type, fn) => listeners.delete(fn);
  }
  return {
    matchMedia: vi.fn(() => mq),
    emit: (matches) => listeners.forEach((fn) => fn({ matches })),
    listeners,
  };
}

describe('readStoredPreference', () => {
  it('returns the stored preference when valid', () => {
    expect(readStoredPreference(memoryStorage({ [THEME_STORAGE_KEY]: 'dark' }))).toBe('dark');
  });

  it('falls back to the default for missing or invalid values', () => {
    expect(readStoredPreference(memoryStorage())).toBe(DEFAULT_PREFERENCE);
    expect(readStoredPreference(memoryStorage({ [THEME_STORAGE_KEY]: 'purple' }))).toBe(
      DEFAULT_PREFERENCE,
    );
  });

  it('falls back to the default when storage throws', () => {
    expect(readStoredPreference(throwingStorage)).toBe(DEFAULT_PREFERENCE);
  });
});

describe('storePreference', () => {
  it('stores valid preferences', () => {
    const storage = memoryStorage();
    expect(storePreference(storage, 'light')).toBe(true);
    expect(storage.data[THEME_STORAGE_KEY]).toBe('light');
  });

  it('rejects invalid preferences without writing', () => {
    const storage = memoryStorage();
    expect(storePreference(storage, 'sepia')).toBe(false);
    expect(storage.data).toEqual({});
  });

  it('reports failure when storage throws', () => {
    expect(storePreference(throwingStorage, 'dark')).toBe(false);
  });
});

describe('systemTheme / resolveTheme', () => {
  it('reads the OS preference', () => {
    expect(systemTheme(fakeWindow({ dark: true }))).toBe('dark');
    expect(systemTheme(fakeWindow({ dark: false }))).toBe('light');
  });

  it('assumes light when matchMedia is unavailable', () => {
    expect(systemTheme({})).toBe('light');
    expect(systemTheme(undefined)).toBe('light');
  });

  it('resolves "system" to the OS value and passes explicit choices through', () => {
    expect(resolveTheme('system', 'dark')).toBe('dark');
    expect(resolveTheme('light', 'dark')).toBe('light');
    expect(resolveTheme('dark', 'light')).toBe('dark');
  });
});

describe('applyTheme', () => {
  it('sets data-theme on the root element', () => {
    applyTheme(document, 'dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    applyTheme(document, 'light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('syncs the theme-color meta from the resolved --color-bg token', () => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#000000';
    document.head.appendChild(meta);
    document.documentElement.style.setProperty('--color-bg', '#0e1014');

    applyTheme(document, 'dark');
    expect(meta.getAttribute('content')).toBe('#0e1014');

    meta.remove();
    document.documentElement.style.removeProperty('--color-bg');
  });

  it('ignores a missing document', () => {
    expect(() => applyTheme(undefined, 'dark')).not.toThrow();
  });
});

describe('watchSystemTheme', () => {
  it('notifies on OS changes and unsubscribes cleanly', () => {
    const win = fakeWindow();
    const onChange = vi.fn();
    const stop = watchSystemTheme(win, onChange);

    win.emit(true);
    expect(onChange).toHaveBeenLastCalledWith('dark');
    win.emit(false);
    expect(onChange).toHaveBeenLastCalledWith('light');

    stop();
    expect(win.listeners.size).toBe(0);
  });

  it('supports the legacy addListener API', () => {
    const win = fakeWindow({ legacy: true });
    const onChange = vi.fn();
    const stop = watchSystemTheme(win, onChange);
    win.emit(true);
    expect(onChange).toHaveBeenCalledWith('dark');
    stop();
    expect(win.listeners.size).toBe(0);
  });

  it('returns a no-op when matchMedia is unavailable', () => {
    expect(() => watchSystemTheme({}, vi.fn())()).not.toThrow();
  });
});
