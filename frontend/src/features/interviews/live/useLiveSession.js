import { useCallback, useEffect, useRef, useState } from 'react';
import { liveSocketUrl } from '../../../api/interviews';

const MAX_BUFFERED_CHUNKS = 300; // ~30 s de áudio em frames de 100 ms
const MAX_BACKOFF_MS = 10000;
const STOP_TIMEOUT_MS = 15000;
const CLOSE_UNAUTHORIZED = 4401;
const CLOSE_REPLACED = 4000; // outra aba/janela assumiu a entrevista
// Sem stop pendente, estes fechamentos encerram a sessão (sem reconectar) e chamam onRejected.
// 4000 é terminal para duas abas não se derrubarem em loop gravando o áudio em dobro.
const CLOSE_REJECTED = [CLOSE_REPLACED, 4404, 4409];

// Solta os handlers antes de fechar: o onclose desse socket não dispara reconexão.
function detachAndClose(ws) {
  ws.onopen = null;
  ws.onmessage = null;
  ws.onclose = null;
  try { ws.close(); } catch { /* já fechado */ }
}

// `turn_id` recomeça do 0 a cada conexão: só é o mesmo turno se a geração também bate.
function upsertTurn(turns, turn) {
  const index = turns.findIndex(
    (item) => item.generation === turn.generation && item.turn_id === turn.turn_id,
  );
  if (index === -1) return [...turns, turn];
  const next = turns.slice();
  next[index] = turn;
  return next;
}

function addSuggestions(current, incoming = []) {
  const known = new Set(current.map((question) => question.id));
  const fresh = incoming.filter((question) => {
    if (known.has(question.id)) return false;
    known.add(question.id);
    return true;
  });
  return fresh.length ? [...current, ...fresh] : current;
}

// Sessão ao vivo resiliente (protocolo em backend-as-built.md): auth na 1ª mensagem,
// frames PCM16 binários, reconexão com backoff e buffer de áudio enquanto não está ao vivo.
export function useLiveSession(interviewId, token, { onUnauthorized, onRejected } = {}) {
  const [status, setStatus] = useState('connecting');
  const [turns, setTurns] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);

  const tokenRef = useRef(token);
  const callbacksRef = useRef({ onUnauthorized, onRejected });
  const wsRef = useRef(null);
  const liveRef = useRef(false); // espelha status === 'live' para o sendAudio
  const bufferRef = useRef([]);
  const stopRef = useRef(null); // { promise, resolve, timer, settled } depois do stop()
  const reconnectTimerRef = useRef(null);
  const connectRef = useRef(null);
  const generationRef = useRef(0); // conexão atual; distingue turnos de conexões diferentes

  useEffect(() => {
    tokenRef.current = token;
    callbacksRef.current = { onUnauthorized, onRejected };
  });

  const settleStop = useCallback((finalStatus) => {
    const pending = stopRef.current;
    if (!pending || pending.settled) return;
    pending.settled = true;
    clearTimeout(pending.timer);
    if (finalStatus) setStatus(finalStatus);
    pending.resolve();
  }, []);

  const dropSocket = useCallback(() => {
    clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
    const ws = wsRef.current;
    wsRef.current = null;
    liveRef.current = false;
    if (ws) detachAndClose(ws);
  }, []);

  useEffect(() => {
    if (interviewId == null) return undefined;
    let disposed = false;
    let retries = 0;
    stopRef.current = null;
    bufferRef.current = [];

    const handleMessage = (ws, generation, message) => {
      if (message.type === 'ready') {
        retries = 0;
        liveRef.current = true;
        setErrorMessage(null);
        setStatus('live');
        const pending = bufferRef.current;
        bufferRef.current = [];
        pending.forEach((chunk) => ws.send(chunk));
        // stop() pedido antes desta conexão ficar pronta: envia agora, depois do áudio pendente.
        if (stopRef.current && !stopRef.current.settled) ws.send(JSON.stringify({ type: 'stop' }));
      } else if (message.type === 'transcript') {
        const turn = {
          generation, turn_id: message.turn_id, text: message.text, is_final: Boolean(message.is_final),
        };
        setTurns((current) => upsertTurn(current, turn));
      } else if (message.type === 'suggestions') {
        setSuggestions((current) => addSuggestions(current, message.questions));
      } else if (message.type === 'error') {
        setErrorMessage(message.message || 'Erro na transcrição ao vivo.');
      } else if (message.type === 'session_ended') {
        setStatus('ended');
        settleStop();
        dropSocket();
      }
    };

    const scheduleReconnect = () => {
      setStatus('reconnecting');
      const delay = Math.min(1000 * 2 ** retries, MAX_BACKOFF_MS);
      retries += 1;
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, delay);
    };

    const handleClose = (ws, code) => {
      if (wsRef.current !== ws) return;
      wsRef.current = null;
      liveRef.current = false;
      if (code === CLOSE_UNAUTHORIZED) {
        setStatus('closed');
        settleStop('closed');
        callbacksRef.current.onUnauthorized?.();
      } else if (stopRef.current) {
        // Depois do stop, 4000 é a corrida documentada: o áudio já foi salvo.
        settleStop(code === CLOSE_REPLACED ? 'ended' : 'closed');
      } else if (CLOSE_REJECTED.includes(code)) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
        setStatus('closed');
        callbacksRef.current.onRejected?.(code);
      } else {
        scheduleReconnect();
      }
    };

    const connect = () => {
      if (disposed) return;
      generationRef.current += 1;
      const generation = generationRef.current;
      const ws = new WebSocket(liveSocketUrl(interviewId));
      wsRef.current = ws;
      ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', token: tokenRef.current }));
      ws.onmessage = (event) => {
        if (wsRef.current !== ws || typeof event.data !== 'string') return;
        let message;
        try { message = JSON.parse(event.data); } catch { return; }
        handleMessage(ws, generation, message);
      };
      ws.onclose = (event) => handleClose(ws, event.code);
    };

    connectRef.current = connect;
    connect();

    return () => {
      disposed = true;
      connectRef.current = null;
      dropSocket();
      settleStop();
    };
  }, [interviewId, settleStop, dropSocket]);

  const sendAudio = useCallback((chunk) => {
    if (stopRef.current) return;
    const ws = wsRef.current;
    if (ws && liveRef.current && ws.readyState === WebSocket.OPEN) {
      ws.send(chunk);
      return;
    }
    const buffer = bufferRef.current;
    buffer.push(chunk);
    if (buffer.length > MAX_BUFFERED_CHUNKS) buffer.shift();
  }, []);

  const stop = useCallback(() => {
    if (stopRef.current) return stopRef.current.promise;
    const pending = { settled: false };
    pending.promise = new Promise((resolve) => { pending.resolve = resolve; });
    stopRef.current = pending;
    pending.timer = setTimeout(() => {
      settleStop('closed');
      dropSocket();
    }, STOP_TIMEOUT_MS);

    const ws = wsRef.current;
    if (ws && liveRef.current && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'stop' }));
    } else if (reconnectTimerRef.current && connectRef.current) {
      // Reconecta já: o stop sai logo depois do ready (e do áudio guardado).
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
      connectRef.current();
    } else if (!ws) {
      settleStop(); // sessão já encerrada ou recusada: nada a parar
    }
    return pending.promise;
  }, [settleStop, dropSocket]);

  return { status, turns, suggestions, errorMessage, sendAudio, stop };
}
