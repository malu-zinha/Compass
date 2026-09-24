/*
 * Os 7 status de entrevista do backend (back/app/db/models.py: InterviewStatus)
 * mapeados para rótulo pt-BR e tom de cor. Verde e vermelho ficam reservados a
 * resultado (concluída/falhou); o que está em andamento é âmbar.
 */

export const INTERVIEW_STATUSES = [
  'draft', 'recording', 'uploaded', 'transcribing', 'analyzing', 'done', 'error',
];

const MAP = {
  draft: { label: 'Rascunho', tone: 'neutral' },
  recording: { label: 'Gravando', tone: 'warning' },
  uploaded: { label: 'Na fila', tone: 'warning' },
  transcribing: { label: 'Transcrevendo', tone: 'warning' },
  analyzing: { label: 'Analisando', tone: 'warning' },
  done: { label: 'Concluída', tone: 'success' },
  error: { label: 'Falhou', tone: 'danger' },
};

export function interviewStatus(status) {
  return MAP[status] ?? { label: status || 'Desconhecido', tone: 'neutral' };
}
