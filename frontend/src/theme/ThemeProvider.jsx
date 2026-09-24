import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  applyTheme,
  isPreference,
  readStoredPreference,
  resolveTheme,
  storePreference,
  systemTheme,
  watchSystemTheme,
} from './theme';

const ThemeContext = createContext(null);

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme precisa estar dentro de <ThemeProvider>');
  return value;
}

/*
 * O script inline do index.html já aplicou o tema antes do React montar; este
 * provider assume a partir daí e mantém documento, storage e estado em acordo.
 */
export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(() => readStoredPreference(window.localStorage));
  const [system, setSystem] = useState(() => systemTheme(window));
  const theme = resolveTheme(preference, system);

  // Layout effect: o atributo muda no mesmo frame da troca, sem um quadro no tema antigo.
  // Compara com o tema anterior (e não "primeira execução"), para o StrictMode,
  // que roda o efeito duas vezes ao montar, não disparar o crossfade no carregamento.
  const previousTheme = useRef(null);
  useLayoutEffect(() => {
    const root = document.documentElement;
    let timer;
    if (previousTheme.current && previousTheme.current !== theme) {
      root.classList.add('theme-changing');
      timer = setTimeout(() => root.classList.remove('theme-changing'), 300);
    }
    previousTheme.current = theme;
    applyTheme(document, theme);
    return () => {
      clearTimeout(timer);
      root.classList.remove('theme-changing');
    };
  }, [theme]);

  // Assina sempre, mesmo com escolha explícita, para que voltar a "sistema"
  // encontre o valor atual do SO em vez de um guardado no carregamento.
  useEffect(() => watchSystemTheme(window, setSystem), []);

  const setPreference = useCallback((next) => {
    if (!isPreference(next)) return;
    // Se o storage falhar (modo privado), a troca ainda vale para esta sessão.
    storePreference(window.localStorage, next);
    setPreferenceState(next);
  }, []);

  const value = useMemo(() => ({ preference, theme, setPreference }), [preference, theme, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
