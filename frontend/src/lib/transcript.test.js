import { expect, test } from 'vitest';
import { speakerLabel } from './transcript';

test.each([
  ['A', [{ speaker: 'A', role: 'interviewer' }, { speaker: 'B', role: 'candidate' }], 'Entrevistador'],
  ['B', [{ speaker: 'A', role: 'interviewer' }, { speaker: 'B', role: 'candidate' }], 'Candidato'],
  ['C', [{ speaker: 'C', role: 'other' }], 'Outra pessoa'],
  ['B', [], 'Pessoa 2'],
])('speakerLabel(%s)', (speaker, roles, expected) => expect(speakerLabel(speaker, roles)).toBe(expected));
