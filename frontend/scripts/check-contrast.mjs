#!/usr/bin/env node
/*
 * Verifica o contraste WCAG 2.1 de cada par de tokens que realmente aparece
 * junto na interface, nos dois temas. Falha se algum par ficar abaixo do
 * mínimo AA para o seu uso.
 *
 * Lê os valores direto de src/styles/tokens.css e resolve as referências
 * var(), para que o teste nunca divirja da fonte da verdade.
 *
 * Uso: node scripts/check-contrast.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const TOKENS = join(HERE, '..', 'src', 'styles', 'tokens.css');

/* -------------------------------------------------------------------------- */
/* Leitura dos tokens                                                          */
/* -------------------------------------------------------------------------- */

/*
 * tokens.css tem três blocos relevantes: `:root` (escala bruta + escalas
 * não-cromáticas), o bloco claro e o bloco escuro. Separamos por seletor para
 * montar dois mapas completos de nome -> valor.
 */
function parseBlocks(css) {
  /*
   * Comentários saem primeiro, do arquivo inteiro. Se saírem só depois do split
   * por ';', a primeira declaração após cada comentário é engolida junto com ele
   * e o token desaparece silenciosamente.
   */
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(clean)) !== null) {
    const selector = m[1].trim();
    const decls = {};
    for (const line of m[2].split(';')) {
      const i = line.indexOf(':');
      if (i === -1) continue;
      const name = line.slice(0, i).trim();
      if (!name.startsWith('--')) continue;
      decls[name] = line.slice(i + 1).trim();
    }
    if (Object.keys(decls).length) blocks.push({ selector, decls });
  }
  return blocks;
}

function buildTheme(blocks, themeSelector) {
  const map = {};
  for (const { selector, decls } of blocks) {
    const isBase = selector.split(',').some((s) => s.trim() === ':root');
    const isTheme = selector.split(',').some((s) => s.trim() === themeSelector);
    if (isBase || isTheme) Object.assign(map, decls);
  }
  return map;
}

/* Resolve var(--x) encadeado até chegar num literal. */
function resolve(map, name, seen = new Set()) {
  let value = map[name];
  if (value === undefined) throw new Error(`token não definido: ${name}`);
  let guard = 0;
  while (/^var\(/.test(value)) {
    if (guard++ > 20) throw new Error(`referência circular em ${name}`);
    const ref = value.match(/^var\(\s*(--[\w-]+)\s*\)$/);
    if (!ref) break;
    if (seen.has(ref[1])) throw new Error(`referência circular em ${name}`);
    seen.add(ref[1]);
    value = map[ref[1]];
    if (value === undefined) throw new Error(`token não definido: ${ref[1]} (via ${name})`);
  }
  return value;
}

/* -------------------------------------------------------------------------- */
/* Cor e contraste                                                             */
/* -------------------------------------------------------------------------- */

function toRgb(value) {
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  const rgba = value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (rgba) return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])];
  throw new Error(`não sei ler a cor: ${value}`);
}

/* Luminância relativa, WCAG 2.1 */
function luminance([r, g, b]) {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a, b) {
  const la = luminance(toRgb(a));
  const lb = luminance(toRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/* -------------------------------------------------------------------------- */
/* Os pares que a interface realmente produz                                   */
/* -------------------------------------------------------------------------- */

/*
 * min 4.5 = texto normal (AA)
 * min 3.0 = texto grande/negrito e elementos de interface, como borda de input,
 *           ícone e limite de componente (AA, critério 1.4.11)
 */
const PAIRS = [
  // Texto sobre as superfícies
  ['--color-text', '--color-bg', 4.5, 'corpo sobre o fundo da página'],
  ['--color-text', '--surface', 4.5, 'corpo sobre card'],
  ['--color-text', '--surface-raised', 4.5, 'corpo sobre modal'],
  ['--color-text', '--surface-sunken', 4.5, 'corpo sobre área rebaixada'],
  ['--text-muted', '--color-bg', 4.5, 'texto secundário sobre o fundo'],
  ['--text-muted', '--surface', 4.5, 'texto secundário sobre card'],
  ['--text-subtle', '--color-bg', 3.0, 'texto terciário (só em texto grande)'],
  ['--text-subtle', '--surface', 3.0, 'texto terciário sobre card'],

  // Marca
  ['--color-primary-fg', '--surface', 4.5, 'link sobre card'],
  ['--color-primary-fg', '--color-bg', 4.5, 'link sobre o fundo'],
  ['--text-on-accent', '--color-primary', 4.5, 'rótulo do botão primário'],
  ['--color-primary', '--surface', 3.0, 'contorno/ícone primário sobre card'],
  ['--color-primary-fg', '--color-primary-bg', 4.5, 'texto do chip primário'],

  // Sucesso
  ['--color-success-fg', '--surface', 4.5, 'texto de sucesso sobre card'],
  ['--color-success-fg', '--color-success-bg', 4.5, 'texto do chip de sucesso'],
  ['--color-success', '--surface', 3.0, 'ícone/medidor de sucesso'],

  // Erro
  ['--color-danger-fg', '--surface', 4.5, 'texto de erro sobre card'],
  ['--color-danger-fg', '--color-danger-bg', 4.5, 'texto do chip de erro'],
  ['--text-on-accent', '--color-danger', 4.5, 'rótulo do botão destrutivo'],
  ['--color-danger', '--surface', 3.0, 'ícone/medidor de erro'],

  // Atenção
  ['--color-warning-fg', '--surface', 4.5, 'texto de atenção sobre card'],
  ['--color-warning-fg', '--color-warning-bg', 4.5, 'texto do chip de atenção'],
  ['--color-warning', '--surface', 3.0, 'ícone/medidor de atenção'],

  /*
   * Limites de componente (1.4.11). Só o contorno de controle entra: ele informa
   * onde o campo começa. `--color-border` e `--border-strong` são divisores
   * decorativos e a norma não exige contraste mínimo deles — checá-los aqui só
   * geraria uma falha falsa e pressão para escurecer divisores sem motivo.
   */
  ['--border-control', '--surface', 3.0, 'contorno de input sobre card'],
  ['--border-control', '--color-bg', 3.0, 'contorno de input sobre o fundo'],
  ['--border-control', '--surface-sunken', 3.0, 'contorno de input em área rebaixada'],
];

/* -------------------------------------------------------------------------- */
/* Execução                                                                    */
/* -------------------------------------------------------------------------- */

const blocks = parseBlocks(readFileSync(TOKENS, 'utf8'));
const themes = {
  claro: buildTheme(blocks, ":root[data-theme='light']"),
  escuro: buildTheme(blocks, ":root[data-theme='dark']"),
};

let failures = 0;
let checked = 0;

for (const [themeName, map] of Object.entries(themes)) {
  const rows = [];
  for (const [fg, bg, min, label] of PAIRS) {
    const fgValue = resolve(map, fg);
    const bgValue = resolve(map, bg);
    const ratio = contrast(fgValue, bgValue);
    const ok = ratio >= min;
    checked += 1;
    if (!ok) failures += 1;
    rows.push({ ok, ratio, min, label, fg, bg, fgValue, bgValue });
  }

  const bad = rows.filter((r) => !r.ok);
  console.log(`\n=== tema ${themeName} — ${rows.length - bad.length}/${rows.length} em AA ===`);
  for (const r of bad) {
    console.log(
      `  FALHA ${r.ratio.toFixed(2)}:1 (mínimo ${r.min}) — ${r.label}\n` +
        `        ${r.fg} ${r.fgValue} sobre ${r.bg} ${r.bgValue}`,
    );
  }
  const worst = rows.filter((r) => r.ok).sort((a, b) => a.ratio - b.ratio).slice(0, 3);
  if (worst.length) {
    console.log('  margem mais apertada entre os que passam:');
    for (const r of worst) {
      console.log(`    ${r.ratio.toFixed(2)}:1 (mínimo ${r.min}) — ${r.label}`);
    }
  }
}

console.log(`\n${checked} pares verificados, ${failures} falha(s).`);
process.exit(failures > 0 ? 1 : 0);
