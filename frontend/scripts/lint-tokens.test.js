import { describe, it, expect } from 'vitest';
import { findViolations } from './lint-tokens.mjs';

const rules = (src) => findViolations(src).map((v) => v.rule);

describe('findViolations', () => {
  it('flags hex colors of every length', () => {
    expect(rules('a { color: #fff; background: #1A5FE0; border-color: #00000080; }')).toEqual([
      'cor hex',
      'cor hex',
      'cor hex',
    ]);
  });

  it('flags rgb/hsl functions', () => {
    expect(rules('a { box-shadow: 0 1px rgba(0,0,0,.1); color: hsl(10 20% 30%); }')).toEqual([
      'cor rgb/hsl',
      'cor rgb/hsl',
    ]);
  });

  it('flags literal font families in CSS and inline styles', () => {
    expect(rules("a { font-family: 'Inter', sans-serif; }")).toEqual(['font-family literal']);
    expect(rules("const s = { fontFamily: 'Inter' };")).toEqual(['font-family literal']);
  });

  it('allows tokens and inherit', () => {
    expect(rules('a { color: var(--color-text); font-family: var(--font-body); }')).toEqual([]);
    expect(rules('button { font-family: inherit; }')).toEqual([]);
    expect(rules("const s = { fontFamily: 'var(--font-mono)' };")).toEqual([]);
  });

  it('ignores comments and non-color hashes', () => {
    expect(rules('/* era #371C68 */ a { color: var(--x); } // antes: #fff')).toEqual([]);
    expect(rules('<a href="#section">')).toEqual([]);
    expect(rules("const url = 'https://example.com/#top';")).toEqual([]);
  });

  it('reports the line number', () => {
    expect(findViolations('a {}\nb { color: #abc; }')[0].line).toBe(2);
  });
});
