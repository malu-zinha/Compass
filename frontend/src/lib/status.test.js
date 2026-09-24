import { describe, it, expect } from 'vitest';
import { interviewStatus, INTERVIEW_STATUSES } from './status';

describe('interviewStatus', () => {
  it('cobre os 7 status do backend', () => {
    expect(INTERVIEW_STATUSES).toEqual([
      'draft', 'recording', 'uploaded', 'transcribing', 'analyzing', 'done', 'error',
    ]);
    INTERVIEW_STATUSES.forEach((s) => {
      const { label, tone } = interviewStatus(s);
      expect(label).toBeTruthy();
      expect(['neutral', 'info', 'success', 'danger']).toContain(tone);
    });
  });

  it('usa verde e vermelho só para resultado', () => {
    expect(interviewStatus('done')).toEqual({ label: 'Concluída', tone: 'success' });
    expect(interviewStatus('error')).toEqual({ label: 'Falhou', tone: 'danger' });
    expect(interviewStatus('analyzing').tone).toBe('info');
    expect(interviewStatus('draft').tone).toBe('neutral');
  });

  it('não quebra com status desconhecido', () => {
    expect(interviewStatus('xyz')).toEqual({ label: 'xyz', tone: 'neutral' });
    expect(interviewStatus(undefined)).toEqual({ label: 'Desconhecido', tone: 'neutral' });
  });
});
