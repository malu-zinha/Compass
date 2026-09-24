import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getInterview, listInterviewQuestions, setQuestionAsked, updateInterview,
} from '../../../api/interviews';
import { useAuth } from '../../../auth/AuthContext';
import { useUserSettings } from '../../../auth/SettingsContext';
import { useLiveSession } from './useLiveSession';
import { useMicrophonePcm } from './useMicrophonePcm';
import TranscriptPanel from './TranscriptPanel';
import QuestionsPanel from './QuestionsPanel';
import { Button, Chip, Field, Modal, Spinner, Textarea, useToast } from '../../../components/ui';
import styles from './RecordPage.module.css';
import { paths } from '../../../app/paths';

const RECORDABLE_STATUSES = ['draft', 'recording'];
const AUTOSAVE_DELAY_MS = 2000;

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

function uniqueById(questions) {
  const seen = new Set();
  return questions.filter((question) => {
    if (seen.has(question.id)) return false;
    seen.add(question.id);
    return true;
  });
}

function RecordPage() {
  const toast = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const { settings } = useUserSettings();

  const goToDetail = useCallback(() => navigate(paths.entrevista(id), { replace: true }), [navigate, id]);

  // Sessão recusada (4404/4409) ou assumida por outra aba (4000): vai para o detalhe;
  // ao desmontar, o microfone é liberado.
  const handleRejected = useCallback((code) => {
    if (code === 4000) toast.error('Esta entrevista foi aberta em outra aba ou janela.');
    goToDetail();
  }, [goToDetail, toast]);

  // Sessão ao vivo: o áudio vai só pelo WebSocket e o servidor grava o WAV final.
  const session = useLiveSession(id, token, { onUnauthorized: logout, onRejected: handleRejected });
  const { start: startMic, stop: stopMic, error: micError } = useMicrophonePcm({
    onChunk: session.sendAudio,
    onError: toast.error,
  });

  // Gravação
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const micStartedRef = useRef(false);

  // Perguntas da entrevista (cadastradas) + sugestões da IA; `askedById` guarda as marcações locais
  const [loadedQuestions, setLoadedQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [askedById, setAskedById] = useState({});

  // Anotações
  const [notes, setNotes] = useState('');
  const notesDirtyRef = useRef(false);

  // Estado de processamento
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');

  // Inicialização: entrevista fora de draft/recording vai para o detalhe
  useEffect(() => {
    let active = true;
    getInterview(id)
      .then((interview) => {
        if (!active) return;
        if (!RECORDABLE_STATUSES.includes(interview.status)) {
          goToDetail();
          return;
        }
        if (interview.notes && !notesDirtyRef.current) setNotes(interview.notes);
      })
      .catch((error) => console.error('Erro ao carregar a entrevista:', error));
    listInterviewQuestions(id)
      .then((questions) => { if (active) setLoadedQuestions(questions); })
      .catch((error) => console.error('Erro ao carregar as perguntas da entrevista:', error))
      .finally(() => { if (active) setLoadingQuestions(false); });
    return () => { active = false; };
  }, [id, goToDetail]);

  // O microfone liga na primeira vez que a sessão fica ao vivo
  useEffect(() => {
    if (session.status !== 'live' || micStartedRef.current) return;
    micStartedRef.current = true;
    startMic().then((started) => {
      if (started) setIsRecording(true);
    });
  }, [session.status, startMic]);

  // Timer
  useEffect(() => {
    if (!isRecording) return undefined;
    const timerInterval = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timerInterval);
  }, [isRecording]);

  // Aviso ao sair da página com a gravação ativa
  useEffect(() => {
    if (!isRecording) return undefined;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRecording]);

  // Salvamento automático das anotações (debounce de 2s)
  const autoSaveNotes = Boolean(settings.auto_save_notes);
  useEffect(() => {
    if (!autoSaveNotes || !notesDirtyRef.current || isProcessing) return undefined;
    const timeout = setTimeout(() => {
      updateInterview(id, { notes }).catch((error) => console.error('Erro ao salvar as anotações:', error));
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [notes, autoSaveNotes, id, isProcessing]);

  const handleNotesChange = (event) => {
    notesDirtyRef.current = true;
    setNotes(event.target.value);
  };

  const handleToggleAsked = async (question) => {
    const asked = !question.asked;
    setAskedById((prev) => ({ ...prev, [question.id]: asked }));
    try {
      await setQuestionAsked(id, question.id, asked);
    } catch (error) {
      console.error('Erro ao marcar a pergunta:', error);
      setAskedById((prev) => ({ ...prev, [question.id]: !asked }));
    }
  };

  const handleEndInterview = async () => {
    setIsProcessing(true);
    setProcessingMessage('Finalizando gravação...');
    await session.stop();
    stopMic();
    setIsRecording(false);
    try {
      await updateInterview(id, { notes });
    } catch (error) {
      console.error('Erro ao salvar as anotações:', error);
      toast.error(error.detail || 'A gravação foi encerrada, mas não foi possível salvar as anotações.');
    }
    navigate(paths.entrevista(id), { replace: true });
  };

  const questions = useMemo(
    () => uniqueById([...loadedQuestions, ...session.suggestions]).map((question) => (
      question.id in askedById ? { ...question, asked: askedById[question.id] } : question
    )),
    [loadedQuestions, session.suggestions, askedById],
  );

  const isConnecting = session.status === 'connecting' || session.status === 'reconnecting';
  const errorMessage = session.errorMessage || micError;

  return (
    <div className={styles.page}>
      <div className={styles.bar}>
        <div className={styles.status}>
          {session.status === 'live' && (
            <Chip tone="info" icon={<span className={styles.pulse} aria-hidden="true" />}>Ao vivo</Chip>
          )}
          {isConnecting && <Chip icon={<Spinner size="sm" label="Conectando" />}>Conectando...</Chip>}
          {errorMessage && <span className={styles.error} role="status">{errorMessage}</span>}
        </div>
        <span className={styles.timer} aria-label={`Tempo de gravação ${formatTime(recordingTime)}`}>
          {formatTime(recordingTime)}
        </span>
        <Button variant="danger" onClick={handleEndInterview} disabled={isProcessing} className={styles.end}>
          {isProcessing ? processingMessage || 'Processando...' : 'Encerrar gravação'}
        </Button>
      </div>

      <div className={styles.layout}>
        <section className={styles.panel} aria-labelledby="transcricao-ao-vivo">
          <h2 id="transcricao-ao-vivo" className={styles.panelTitle}>Transcrição</h2>
          <TranscriptPanel turns={session.turns} />
        </section>

        <div className={styles.side}>
          <section className={styles.panel} aria-labelledby="perguntas-ao-vivo">
            <h2 id="perguntas-ao-vivo" className={styles.panelTitle}>Perguntas</h2>
            <div className={styles.panelBody}>
              <QuestionsPanel
                questions={questions}
                onToggleAsked={handleToggleAsked}
                loading={loadingQuestions}
                isLive={session.status === 'live'}
              />
            </div>
          </section>

          <section className={`${styles.panel} ${styles.notesPanel}`}>
            <div className={styles.panelBody}>
              <Field
                label="Anotações"
                hint={autoSaveNotes ? 'Salvas automaticamente enquanto você escreve.' : 'Salvas ao encerrar a gravação.'}
                className={styles.notesField}
              >
                <Textarea
                  value={notes}
                  onChange={handleNotesChange}
                  placeholder="Aqui serão anotados detalhes adicionais sobre a entrevista!"
                  className={styles.notes}
                />
              </Field>
            </div>
          </section>
        </div>
      </div>

      <Modal open={isProcessing} title="Finalizando a entrevista" size="sm" dismissible={false} onClose={() => {}}>
        <div className={styles.processing}>
          <Spinner size="lg" label={processingMessage || 'Processando entrevista...'} />
          <p>{processingMessage || 'Processando entrevista...'}</p>
        </div>
      </Modal>
    </div>
  );
}

export default RecordPage;
