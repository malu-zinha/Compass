import { useCallback, useEffect, useRef, useState } from 'react';
import { getInterview, listInterviewQuestions } from '../../../api/interviews';
import { PROCESSING_STATUSES } from '../../../lib/transcript';

const POLL_MS = 3000;

// Busca a entrevista e as perguntas cadastradas, e mantém um polling de 3s
// enquanto o status estiver em PROCESSING_STATUSES. `reload()` força uma nova
// busca imediata e retoma o ciclo de polling a partir dela.
export function useInterview(id) {
  const [interview, setInterview] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadedId, setLoadedId] = useState(id);
  const timeoutRef = useRef(null);
  const requestIdRef = useRef(0);

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
    try {
      const [interviewData, questionsData] = await Promise.all([
        getInterview(currentId),
        listInterviewQuestions(currentId),
      ]);
      if (requestId !== requestIdRef.current) return;
      setInterview(interviewData);
      setQuestions(questionsData || []);
      setError(null);
      setLoading(false);
      if (PROCESSING_STATUSES.includes(interviewData.status)) {
        timeoutRef.current = setTimeout(() => fetchOnce(currentId, requestId), POLL_MS);
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err);
      setLoading(false);
    }
  }, []);

  const start = useCallback((currentId) => {
    clearPoll();
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
