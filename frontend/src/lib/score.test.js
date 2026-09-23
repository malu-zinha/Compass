import { describe, it, expect } from 'vitest';
import { scoreBand, SUBSCORES } from './score';

describe('scoreBand', () => {
  it('divide 0–1000 em fraco, médio e forte', () => {
    expect(scoreBand(1000)).toEqual({ band: 'strong', label: 'Forte', tone: 'success' });
    expect(scoreBand(700)).toMatchObject({ band: 'strong' });
    expect(scoreBand(699)).toMatchObject({ band: 'medium', label: 'Médio', tone: 'warning' });
    expect(scoreBand(400)).toMatchObject({ band: 'medium' });
    expect(scoreBand(399)).toMatchObject({ band: 'weak', label: 'Fraco', tone: 'danger' });
    expect(scoreBand(0)).toMatchObject({ band: 'weak' });
  });

  it('devolve null sem score', () => {
    expect(scoreBand(null)).toBeNull();
    expect(scoreBand(undefined)).toBeNull();
  });

  it('lista os 4 subscores do backend com rótulo', () => {
    expect(SUBSCORES.map(([key]) => key)).toEqual(['technical', 'communication', 'work_culture', 'experience']);
  });
});
