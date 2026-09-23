/*
 * Faixas de score (0–1000). Único lugar que decide cor e rótulo de um score:
 * medidor, chips e ranking leem daqui.
 */

export const SUBSCORES = [
  ['technical', 'Técnico'],
  ['communication', 'Comunicação'],
  ['work_culture', 'Cultura'],
  ['experience', 'Experiência'],
];

export function scoreBand(score) {
  if (score === null || score === undefined) return null;
  if (score >= 700) return { band: 'strong', label: 'Forte', tone: 'success' };
  if (score >= 400) return { band: 'medium', label: 'Médio', tone: 'warning' };
  return { band: 'weak', label: 'Fraco', tone: 'danger' };
}
