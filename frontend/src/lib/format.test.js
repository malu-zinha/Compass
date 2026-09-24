import { expect, test } from 'vitest';
import { formatDate, formatDuration, scoreToPercent } from './format';

test.each([[null, 'N/A'], [45, '45s'], [200, '3m 20s'], [3900, '1h 5m']])('formatDuration(%s)', (s, e) => expect(formatDuration(s)).toBe(e));

test('scoreToPercent', () => { expect(scoreToPercent(873)).toBe(87); expect(scoreToPercent(null)).toBe(0); });

test('formatDate respeita fuso e formato', () => {
  const iso = '2026-03-01T02:30:00Z';
  expect(formatDate(iso, { timezone: 'America/Sao_Paulo', date_format: 'DD/MM/YYYY' })).toBe('28/02/2026');
  expect(formatDate(iso, { timezone: 'UTC', date_format: 'YYYY-MM-DD' })).toBe('2026-03-01');
  expect(formatDate(iso, { timezone: 'UTC', date_format: 'MM/DD/YYYY' })).toBe('03/01/2026');
  expect(formatDate(null, { timezone: 'UTC', date_format: 'DD/MM/YYYY' })).toBe('Data não disponível');
});

test('vacanciesLabel pluraliza sem o "disponíveleis"', async () => {
  const { vacanciesLabel } = await import('./format');
  expect(vacanciesLabel(1)).toBe('1 vaga disponível');
  expect(vacanciesLabel(2)).toBe('2 vagas disponíveis');
});
