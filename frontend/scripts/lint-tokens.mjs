#!/usr/bin/env node
/*
 * Portão de tokens: nenhuma cor literal (hex, rgb(), hsl()) nem font-family
 * literal fora de src/styles/tokens.css. É o que impede a dívida visual de
 * voltar depois do redesign.
 *
 * Catraca: os arquivos ainda não migrados ficam em lint-tokens.legacy.json e
 * são tolerados. A lista só pode encolher — o portão falha se um arquivo novo
 * violar a regra, e também se um arquivo da lista já estiver limpo e continuar
 * listado (para que ninguém o suje de novo sem perceber).
 *
 * Uso: node scripts/lint-tokens.mjs            verifica
 *      node scripts/lint-tokens.mjs --legacy   imprime a lista atual de violadores
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SRC = join(ROOT, 'src');
const LEGACY_FILE = join(HERE, 'lint-tokens.legacy.json');

const EXEMPT = new Set(['src/styles/tokens.css']);
const SCANNED = /\.(css|js|jsx)$/;
const SKIPPED = /(\.test\.(js|jsx)$)|(^src\/test\/)/;

const RULES = [
  { name: 'cor hex', re: /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g },
  { name: 'cor rgb/hsl', re: /\b(?:rgba?|hsla?)\(/g },
  {
    name: 'font-family literal',
    re: /(?:font-family\s*:|fontFamily\s*:)\s*(?=\S)(?!var\(|inherit\b|['"]?var\(|['"]?inherit\b)[^;,}\n]+/g,
  },
];

/* Comentários citam valores antigos de propósito; não contam. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1');
}

export function findViolations(source) {
  const code = stripComments(source);
  const found = [];
  for (const { name, re } of RULES) {
    for (const match of code.matchAll(re)) {
      const line = code.slice(0, match.index).split('\n').length;
      found.push({ rule: name, line, text: match[0].trim() });
    }
  }
  return found;
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function scan() {
  const results = new Map();
  for (const file of walk(SRC)) {
    const rel = relative(ROOT, file).split(sep).join('/');
    if (!SCANNED.test(rel) || SKIPPED.test(rel) || EXEMPT.has(rel)) continue;
    const violations = findViolations(readFileSync(file, 'utf8'));
    if (violations.length) results.set(rel, violations);
  }
  return results;
}

function main() {
  const results = scan();

  if (process.argv.includes('--legacy')) {
    console.log(JSON.stringify([...results.keys()].sort(), null, 2));
    return;
  }

  const legacy = new Set(JSON.parse(readFileSync(LEGACY_FILE, 'utf8')));
  let failed = false;

  for (const [file, violations] of results) {
    if (legacy.has(file)) continue;
    failed = true;
    console.error(`\n${file}`);
    for (const v of violations) console.error(`  ${v.line}: ${v.rule} — ${v.text}`);
  }

  const cleaned = [...legacy].filter((file) => !results.has(file));
  if (cleaned.length) {
    failed = true;
    console.error('\nJá migrados, remova de scripts/lint-tokens.legacy.json:');
    for (const file of cleaned) console.error(`  ${file}`);
  }

  if (failed) {
    console.error('\nUse tokens de src/styles/tokens.css em vez de valores literais.');
    process.exit(1);
  }
  const remaining = legacy.size;
  console.log(`lint:tokens ok — ${remaining} arquivo(s) legado(s) ainda a migrar.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
