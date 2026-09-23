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
import './RecordPage.css';
import { useToast } from '../../../components/ui';

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

  const goToDetail = useCallback(() => navigate(`/entrevista/${id}`, { replace: true }), [navigate, id]);

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
    navigate(`/entrevista/${id}`, { replace: true });
  };

  const questions = useMemo(
    () => uniqueById([...loadedQuestions, ...session.suggestions]).map((question) => (
      question.id in askedById ? { ...question, asked: askedById[question.id] } : question
    )),
    [loadedQuestions, session.suggestions, askedById],
  );

  return (
    <div className="record-page-container">
      {/* Transcrição Panel */}
      <TranscriptPanel
        turns={session.turns}
        status={session.status}
        errorMessage={session.errorMessage || micError}
      />

      {/* Right Panel */}
      <div className="right-panel">
        {/* Questions Section */}
        <QuestionsPanel
          questions={questions}
          onToggleAsked={handleToggleAsked}
          loading={loadingQuestions}
          isLive={session.status === 'live'}
        />

        {/* Notes Section */}
        <div className="notes-section">
          <h3>Anotações</h3>
          <textarea
            className="notes-textarea"
            value={notes}
            onChange={handleNotesChange}
            placeholder="Aqui serão anotados detalhes adicionais sobre a entrevista!"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="footer-controls">
        <div className="timer">
          {formatTime(recordingTime)}
        </div>
        <button
          className="end-interview-btn"
          onClick={handleEndInterview}
          disabled={isProcessing}
        >
          {isProcessing ? processingMessage || 'Processando...' : 'Encerrar gravação'}
        </button>
      </div>

      {/* Overlay de processamento */}
      {isProcessing && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            textAlign: 'center',
            minWidth: '300px'
          }}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #3b82f6',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                animation: 'spin 1s linear infinite',
                margin: '0 auto'
              }}></div>
            </div>
            <p style={{ margin: 0, fontSize: '1rem', color: '#374151' }}>
              {processingMessage || 'Processando entrevista...'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecordPage;
