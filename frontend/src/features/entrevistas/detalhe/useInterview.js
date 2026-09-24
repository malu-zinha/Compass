import { useCallback, useEffect, useRef, useState } from 'react';
import { getInterview, listInterviewQuestions } from '../../../api/interviews';
import { PROCESSING_STATUSES } from '../../../lib/transcript';

const POLL_MS = 3000;
const MAX_BACKOFF_MS = 15000;

// Busca a entrevista e as perguntas cadastradas, e mantém um polling de 3s
// enquanto o status estiver em PROCESSING_STATUSES. Falhas que não são 404
// continuam tentando com backoff (3s, 6s, 12s, até 15s), zerado no sucesso.
// `reload()` força uma nova busca imediata e retoma o ciclo a partir dela.
export function useInterview(id) {
  const [interview, setInterview] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadedId, setLoadedId] = useState(id);
  const timeoutRef = useRef(null);
  const requestIdRef = useRef(0);
  const failuresRef = useRef(0);

  // Trocou de entrevista: não exibe os dados da anterior enquanto carrega.
  if (id !== loadedId) {
    setLoadedId(id);
    setInterview(null);
    setQuestions([]);
    setError(null);
    setLoading(true);
  }

  const clearPoll = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const fetchOnce = useCallback(async (currentId, requestId) => {
    const schedule = (delay) => {
      timeoutRef.current = setTimeout(() => fetchOnce(currentId, requestId), delay);
    };
    const [interviewResult, questionsResult] = await Promise.allSettled([
      getInterview(currentId),
      listInterviewQuestions(currentId),
    ]);
    if (requestId !== requestIdRef.current) return;
    setLoading(false);

    if (interviewResult.status === 'rejected') {
      const err = interviewResult.reason;
      setError(err);
      // 404 é definitivo; qualquer outra falha (rede, 5xx) é tentada de novo.
      if (err?.status !== 404) {
        failuresRef.current += 1;
        schedule(Math.min(POLL_MS * 2 ** (failuresRef.current - 1), MAX_BACKOFF_MS));
      }
      return;
    }

    failuresRef.current = 0;
    const interviewData = interviewResult.value;
    setInterview(interviewData);
    setError(null);
    // Falha nas perguntas não descarta a entrevista: mantém as anteriores.
    if (questionsResult.status === 'fulfilled') setQuestions(questionsResult.value || []);
    if (PROCESSING_STATUSES.includes(interviewData.status)) schedule(POLL_MS);
  }, []);

  const start = useCallback((currentId) => {
    clearPoll();
    failuresRef.current = 0;
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    setLoading(true);
    fetchOnce(currentId, requestId);
  }, [fetchOnce]);

  useEffect(() => {
    start(id);
    return () => {
      requestIdRef.current += 1;
      clearPoll();
    };
  }, [id, start]);

  const reload = useCallback(() => start(id), [id, start]);

  return { interview, questions, loading, error, reload };
}
