import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createInterview } from '../../../api/interviews';
import { Button, Card, useToast } from '../../../components/ui';
import { MicrophoneIcon, UploadIcon } from '../../../components/icons';
import { useInterviewDraft } from './useInterviewDraft';
import styles from './flow.module.css';

export default function InterviewTypePage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { draft, clearDraft } = useInterviewDraft();
  const [creating, setCreating] = useState(false);
  // Evita que o redirecionamento por "sem rascunho" dispare de novo quando o
  // próprio clearDraft() do fluxo ao vivo zera o draft.
  const leavingRef = useRef(false);

  useEffect(() => {
    if (!draft && !leavingRef.current) navigate('/nova-entrevista');
  }, [draft, navigate]);

  const startLive = async () => {
    setCreating(true);
    try {
      const result = await createInterview({
        position_id: draft.position_id,
        candidate_name: draft.candidate_name,
        candidate_email: draft.candidate_email,
        candidate_phone: draft.candidate_phone,
        recording_consent: draft.recording_consent,
        mode: 'live',
      });
      leavingRef.current = true;
      clearDraft();
      navigate(`/gravar/${result.id}`);
    } catch (error) {
      console.error('Erro ao criar entrevista:', error);
      toast.error(error.detail || 'Erro ao criar entrevista. Verifique se o backend está rodando.');
      setCreating(false);
    }
  };

  if (!draft) return null;

  return (
    <div className={styles.page}>
      <div className={`${styles.wrap} ${styles.wide}`}>
        <div className={styles.intro}>
          <h1 className={styles.title}>Como vai ser a entrevista?</h1>
          <p className={styles.subtitle}>Com {draft.candidate_name}, para {draft.position_name || 'o cargo escolhido'}.</p>
        </div>

        <div className={styles.options}>
          <Card as="button" type="button" variant="interactive" className={styles.option} onClick={startLive} disabled={creating}>
            <span className={styles.optionIcon}><MicrophoneIcon size={26} /></span>
            <span className={styles.optionTitle}>Entrevista ao vivo</span>
            <span className={styles.optionText}>
              {creating ? 'Criando entrevista...' : 'Grave pelo microfone com transcrição em tempo real e perguntas sugeridas.'}
            </span>
          </Card>
          <Card as="button" type="button" variant="interactive" className={styles.option} onClick={() => navigate('/upload')} disabled={creating}>
            <span className={styles.optionIcon}><UploadIcon size={26} /></span>
            <span className={styles.optionTitle}>Enviar áudio</span>
            <span className={styles.optionText}>Envie a gravação de uma entrevista que já aconteceu.</span>
          </Card>
        </div>

        <Card>
          <div className={styles.summaryHead}>
            <h2 className={styles.summaryTitle}>Candidato</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/nova-entrevista')} disabled={creating}>Editar</Button>
          </div>
          <dl className={styles.summary}>
            <div><dt>Nome</dt><dd>{draft.candidate_name}</dd></div>
            <div><dt>Cargo</dt><dd>{draft.position_name}</dd></div>
            <div><dt>E-mail</dt><dd>{draft.candidate_email}</dd></div>
            <div><dt>Telefone</dt><dd>{draft.candidate_phone}</dd></div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
