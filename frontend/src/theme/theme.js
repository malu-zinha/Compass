/*
 * Lógica de tema, sem React. Separada do provider para poder ser testada
 * diretamente e para que o script anti-piscada do index.html tenha um espelho
 * óbvio do que precisa reproduzir.
 */

export const THEME_STORAGE_KEY = 'compass.theme';

/*
 * Três estados, não dois. Com apenas claro/escuro não existe caminho de volta
 * para "acompanhar o sistema" depois que o usuário escolheu uma vez.
 */
export const PREFERENCES = ['light', 'dark', 'system'];
export const DEFAULT_PREFERENCE = 'system';

export function isPreference(value) {
  return PREFERENCES.includes(value);
}

/*
 * localStorage lança em modo privado de alguns navegadores e quando o usuário
 * bloqueia dados do site. Nunca deixamos isso derrubar o app: cai no padrão.
 */
export function readStoredPreference(storage) {
  try {
    const stored = storage?.getItem(THEME_STORAGE_KEY);
    return isPreference(stored) ? stored : DEFAULT_PREFERENCE;
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

export function storePreference(storage, preference) {
  if (!isPreference(preference)) return false;
  try {
    storage?.setItem(THEME_STORAGE_KEY, preference);
    return true;
  } catch {
    return false;
  }
}

/*
 * matchMedia pode não existir: jsdom sem stub, navegador antigo, ou ambiente de
 * renderização no servidor. Sem ele, assumimos claro.
 */
export function systemTheme(win) {
  try {
    return win?.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function resolveTheme(preference, systemValue) {
  return preference === 'system' ? systemValue : preference;
}

/*
 * Aplica o tema ao documento e sincroniza <meta name="theme-color">, que é o que
 * pinta a barra do navegador no celular.
 *
 * A cor da meta é lida do próprio --color-bg já resolvido, em vez de repetida
 * aqui: um valor literal neste arquivo seria uma segunda fonte da verdade,
 * fadada a divergir de tokens.css.
 */
export function applyTheme(doc, theme) {
  const root = doc?.documentElement;
  if (!root) return;
  root.dataset.theme = theme;

  const meta = doc.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  try {
    const bg = doc.defaultView?.getComputedStyle(root).getPropertyValue('--color-bg').trim();
    if (bg) meta.setAttribute('content', bg);
  } catch {
    /* getComputedStyle não está disponível em todo ambiente de teste */
  }
}

/*
 * Assina a mudança de preferência do sistema operacional e devolve a função de
 * cancelamento. Safari antigo só tem addListener/removeListener.
 */
export function watchSystemTheme(win, onChange) {
  const mq = win?.matchMedia?.('(prefers-color-scheme: dark)');
  if (!mq) return () => {};

  const handler = (event) => onChange(event.matches ? 'dark' : 'light');

  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }
  if (typeof mq.addListener === 'function') {
    mq.addListener(handler);
    return () => mq.removeListener(handler);
  }
  return () => {};
}
