import { useState, useEffect, useRef, useCallback } from 'react';

const WS_BASE_URL = 'ws://localhost:8000';

export const useRealtimeTranscription = (interviewId) => {
  const [transcripts, setTranscripts] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (!interviewId) {
      console.log('No interview ID provided, skipping WebSocket connection');
      return;
    }

    console.log('Connecting to WebSocket for interview:', interviewId);
    connectWebSocket();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        console.log('Fechando WebSocket no cleanup...');
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
    };
  }, [interviewId]);

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket(`${WS_BASE_URL}/positions/interviews/ws/transcribe?id=${interviewId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);

          // Handle transcript updates
          if (data.transcript_update) {
            console.log('Recebendo transcript_update:', data.transcript_update);
            setTranscripts(prev => {
              const updated = [...prev];
              
              data.transcript_update.forEach(newUtt => {
                if (newUtt.id) {
                  const existingIndex = updated.findIndex(utt => utt.id === newUtt.id);
                  
                  if (existingIndex >= 0) {
                    // Atualizar frase existente - concatenar apenas as novas palavras
                    const existingUtt = updated[existingIndex];
                    updated[existingIndex] = {
                      ...newUtt,
                      text: newUtt.new_words 
                        ? existingUtt.text + newUtt.new_words  // Concatenar novas palavras
                        : newUtt.text  // Usar texto completo se não tiver new_words
                    };
                  } else {
                    // Adicionar nova frase (primeira palavra)
                    updated.push({
                      ...newUtt,
                      text: newUtt.new_words || newUtt.text
                    });
                  }
                } else {
                  // Se não tem ID, adicionar
                  updated.push(newUtt);
                }
              });
              
              return updated;
            });
          }
          
          // Handle transcript finalization (após 4 segundos de silêncio)
          if (data.transcript_finalize) {
            console.log('Finalizando transcrição:', data.transcript_finalize);
            setTranscripts(prev => {
              const updated = [...prev];
              const existingIndex = updated.findIndex(utt => utt.id === data.transcript_finalize.id);
              
              if (existingIndex >= 0) {
                // Marcar como final
                updated[existingIndex] = {
                  ...updated[existingIndex],
                  is_final: true
                };
              }
              
              return updated;
            });
          }

          // Handle GPT question suggestions
          if (data.gpt_response) {
            try {
              const gptData = JSON.parse(data.gpt_response);
              if (gptData.questions && Array.isArray(gptData.questions)) {
                setQuestions(prev => {
                  // Add new questions, avoiding duplicates
                  const newQuestions = gptData.questions.filter(
                    q => !prev.some(pq => pq.text === q)
                  );
                  return [...prev, ...newQuestions.map(q => ({
                    id: Date.now() + Math.random(),
                    text: q,
                    status: 'pending',
                    isAI: true
                  }))];
                });
              }
            } catch (e) {
              console.error('Error parsing GPT response:', e);
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Auto-reconnect after 3 seconds if interview is still active and component is mounted
        if (interviewId && isMountedRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            // Verificar novamente se ainda está montado antes de reconectar
            if (isMountedRef.current && interviewId) {
              console.log('Attempting to reconnect...');
              connectWebSocket();
            }
          }, 3000);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setIsConnected(false);
    }
  };

  const sendAudioChunk = useCallback((audioBlob) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(audioBlob);
    } else {
      console.warn('WebSocket not connected, cannot send audio chunk');
    }
  }, []);

  return {
    transcripts,
    questions,
    isConnected,
    sendAudioChunk
  };
};
