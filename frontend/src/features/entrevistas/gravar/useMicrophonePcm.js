import { useCallback, useEffect, useRef, useState } from 'react';

const MIC_ERROR = 'Erro ao acessar o microfone. Verifique as permissões.';

// Mesma ordem de limpeza do legado: nós → AudioContext → tracks. Pode ser chamada
// mais de uma vez sobre o mesmo grafo.
function teardown(graph) {
  const { node, source, context, stream } = graph;
  if (node) {
    node.port.onmessage = null;
    try { node.disconnect(); } catch { /* já desconectado */ }
  }
  if (source) {
    try { source.disconnect(); } catch { /* já desconectado */ }
  }
  if (context && context.state !== 'closed') context.close().catch(() => {});
  if (stream) stream.getTracks().forEach((track) => track.stop());
}

// Captura o microfone e entrega frames PCM16 LE, 16 kHz, mono (~100 ms) ao `onChunk`,
// via AudioWorklet (public/pcm-worklet.js). `start()` resolve `true` quando a captura começou.
export function useMicrophonePcm({ onChunk, onError } = {}) {
  const [error, setError] = useState(null);
  const onChunkRef = useRef(onChunk);
  const onErrorRef = useRef(onError);
  const graphRef = useRef(null); // recursos da captura ativa (ou sendo montada)
  const attemptRef = useRef(0);

  useEffect(() => { onChunkRef.current = onChunk; }, [onChunk]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const stop = useCallback(() => {
    attemptRef.current += 1;
    if (graphRef.current) {
      teardown(graphRef.current);
      graphRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    if (graphRef.current) return true;
    attemptRef.current += 1;
    const attempt = attemptRef.current;
    // Um stop() durante os awaits invalida esta tentativa; o que já foi obtido é liberado.
    const cancelled = () => attemptRef.current !== attempt;
    const graph = {};
    graphRef.current = graph;
    setError(null);
    try {
      graph.stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      if (cancelled()) { teardown(graph); return false; }
      graph.context = new AudioContext();
      await graph.context.audioWorklet.addModule('/pcm-worklet.js');
      if (cancelled()) { teardown(graph); return false; }
      graph.node = new AudioWorkletNode(graph.context, 'pcm-worklet');
      graph.node.port.onmessage = (event) => onChunkRef.current?.(event.data);
      graph.source = graph.context.createMediaStreamSource(graph.stream);
      graph.source.connect(graph.node);
      graph.node.connect(graph.context.destination); // a saída do worklet é silenciosa
      if (graph.context.state === 'suspended') graph.context.resume().catch(() => {});
      return true;
    } catch (err) {
      teardown(graph);
      if (!cancelled()) {
        console.error('Erro ao acessar o microfone:', err);
        graphRef.current = null;
        setError(MIC_ERROR);
        // A mensagem inline pode passar despercebida numa gravação de até 40 minutos;
        // onError deixa quem chamou avisar na hora (toast) que o microfone falhou.
        onErrorRef.current?.(MIC_ERROR);
      }
      return false;
    }
  }, []);

  useEffect(() => stop, [stop]);

  return { start, stop, error };
}
