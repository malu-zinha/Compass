export const PROCESSING_STATUSES = ['uploaded', 'transcribing', 'analyzing', 'recording'];

export const STATUS_MESSAGES = {
  uploaded: 'Na fila para processamento...',
  transcribing: 'Transcrevendo o áudio...',
  analyzing: 'Gerando análise...',
  recording: 'Gravação em andamento...',
};

const ROLE_LABELS = { interviewer: 'Entrevistador', candidate: 'Candidato', other: 'Outra pessoa' };

export function speakerLabel(speaker, speakerRoles = []) {
  const role = speakerRoles.find((r) => r.speaker === speaker)?.role;
  if (role) return ROLE_LABELS[role];
  return `Pessoa ${speaker.charCodeAt(0) - 64}`;
}
