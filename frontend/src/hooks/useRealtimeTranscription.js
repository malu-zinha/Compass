import { useState, useEffect, useRef, useCallback } from 'react';

const WS_BASE_URL = 'ws://localhost:8000';

export const useRealtimeTranscription = (interviewId) => {
  const [transcripts, setTranscripts] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    if (!interviewId) {
      console.log('No interview ID provided, skipping WebSocket connection');
      return;
    }

    console.log('Connecting to WebSocket for interview:', interviewId);
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
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
            setTranscripts(prev => [...prev, ...data.transcript_update]);
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
        
        // Auto-reconnect after 3 seconds if interview is still active
        if (interviewId) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect...');
            connectWebSocket();
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
