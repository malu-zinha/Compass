import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { deleteInterview, reprocessInterview, updateInterview } from '../../../api/interviews';
import { useUserSettings } from '../../../auth/SettingsContext';
import { PageHeader } from '../../../components/layout';
import {
  Button, ErrorPanel, ScoreMeter, SectionIndex, Skeleton, Spinner, StatusBadge, useConfirm, useToast,
} from '../../../components/ui';
import { formatDate, formatDuration } from '../../../lib/format';
import { PROCESSING_STATUSES, STATUS_MESSAGES } from '../../../lib/transcript';
import { useInterview } from './useInterview';
import { useAudioPlayer } from './useAudioPlayer';
import AnalysisSections, { SECTIONS } from './AnalysisSections';
import AudioPlayer from './AudioPlayer';
import CandidateModal from './CandidateModal';
import TranscriptView from './TranscriptView';
import styles from './InterviewDetailPage.module.css';
import { paths } from '../../../app/paths';

const DELETE_CONFIRMATION = 'Excluir esta entrevista e a gravação? Esta ação não pode ser desfeita.';

export default function InterviewDetailPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useUserSettings();
  const { interview, questions, error, reload } = useInterview(id);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const player = useAudioPlayer(
    id,
    Boolean(interview?.has_audio),
    interview?.transcript,
    interview?.audio_duration_seconds,
    { onError: toast.error },
  );

  const hasTranscript = interview?.transcript?.length > 0;

  // Dispara o reprocessamento e volta a acompanhar o status via polling.
  const reprocess = async (step) => {
    setBusy(true);
    try {
      await reprocessInterview(id, step);
      reload();
    } catch (err) {
      toast.error(err?.detail || 'Não foi possível reprocessar a entrevista.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Excluir entrevista',
      message: DELETE_CONFIRMATION,
      confirmLabel: 'Excluir',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteInterview(id);
      toast.success('Entrevista excluída.');
      navigate(paths.vaga(interview.position_id));
    } catch (err) {
      toast.error(err?.detail || 'Não foi possível excluir a entrevista.');
    }
  };

  // Rejeita em caso de erro para o diálogo continuar aberto.
  const handleSave = async (data) => {
    try {
      await updateInterview(id, data);
      reload();
      toast.success('Dados do candidato atualizados.');
    } catch (err) {
      toast.error(err?.detail || 'Não foi possível salvar os dados do candidato.');
      throw err;
    }
  };

  if (!interview) {
    return (
      <div className={styles.page}>
        <PageHeader title={error ? 'Entrevista não encontrada' : 'Carregando entrevista...'} />
        {error ? (
          <ErrorPanel
            title="Entrevista não encontrada"
            message={error.detail || 'Não foi possível carregar a entrevista.'}
            onRetry={() => navigate(paths.entrevistas)}
            retryLabel="Voltar para entrevistas"
          />
        ) : (
          <div className={styles.loading} aria-busy="true">
            <Skeleton variant="block" className={styles.headSkeleton} />
            <Skeleton variant="block" className={styles.bodySkeleton} />
          </div>
        )}
      </div>
    );
  }

  const { status } = interview;
  const isProcessing = PROCESSING_STATUSES.includes(status);
  const statusMessage = isProcessing ? STATUS_MESSAGES[status] : null;
  const name = interview.candidate_name || 'Candidato sem nome';
  const contact = [interview.candidate_email, interview.candidate_phone].filter(Boolean).join(' · ');
  // O índice só faz sentido quando há análise para percorrer.
  const showIndex = status === 'done';
  const breadcrumbs = [
    { label: 'Vagas', to: paths.vagas },
    { label: interview.position_name, to: paths.vaga(interview.position_id) },
  ];

  const renderAnalysis = () => {
    if (isProcessing) {
      return (
        <div className={styles.state}>
          <Spinner size="lg" label={statusMessage} />
          <p>{statusMessage}</p>
          <p className={styles.stateHint}>Esta página atualiza sozinha quando terminar.</p>
        </div>
      );
    }
    if (status === 'error') {
      return (
        <ErrorPanel
          title="O processamento falhou"
          message={interview.error_message || 'Não foi possível processar a entrevista.'}
          onRetry={() => reprocess(hasTranscript ? 'analysis' : 'full')}
        />
      );
    }
    return <AnalysisSections analysis={interview.analysis} notes={interview.notes} questions={questions} />;
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title={name}
        breadcrumbs={breadcrumbs}
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditing(true)}>Editar dados</Button>
            <Button
              variant="secondary"
              onClick={() => reprocess('analysis')}
              disabled={isProcessing || !hasTranscript}
              loading={busy}
              className={styles.hideSmall}
            >
              Reanalisar
            </Button>
            <Button variant="ghost" onClick={handleDelete} className={styles.danger}>Excluir entrevista</Button>
          </>
        }
      />

      <header className={styles.summary}>
        <div className={styles.who}>
          <p className={styles.kicker}>
            <StatusBadge status={status} />
            <span>{interview.mode === 'live' ? 'Entrevista ao vivo' : 'Áudio enviado'}</span>
          </p>
          <h2 className={styles.name}>{name}</h2>
          <p className={styles.meta}>
            <span>{interview.position_name}</span>
            <span>{formatDate(interview.created_at, settings)}</span>
            {interview.audio_duration_seconds ? <span>{formatDuration(interview.audio_duration_seconds)}</span> : null}
          </p>
          {contact && <p className={styles.contact}>{contact}</p>}
        </div>
        <ScoreMeter score={interview.score} label="Pontuação geral" size="lg" className={styles.score} />
      </header>

      <div className={`${styles.grid} ${showIndex ? styles.withIndex : ''}`}>
        {showIndex && <SectionIndex sections={SECTIONS} className={styles.index} />}

        <section aria-label="Análise" className={styles.analysis}>
          {renderAnalysis()}
        </section>

        <section aria-labelledby="transcricao" className={styles.transcript}>
          <h2 id="transcricao" className={styles.transcriptTitle}>Transcrição</h2>
          <TranscriptView
            transcript={interview.transcript}
            speakerRoles={interview.analysis?.speaker_roles}
            activeMessageIndex={player.activeMessageIndex}
            statusMessage={statusMessage}
            onSeek={interview.has_audio ? player.seek : undefined}
          />
          {interview.has_audio && <AudioPlayer player={player} />}
        </section>
      </div>

      <CandidateModal open={editing} onClose={() => setEditing(false)} interview={interview} onSave={handleSave} />
    </div>
  );
}
