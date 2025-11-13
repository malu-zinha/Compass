import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { generateAnalysis, updateInterviewNotes, getInterviewById } from '../services/api';
import { useRealtimeTranscription } from '../hooks/useRealtimeTranscription';
import './RecordPage.css';

function RecordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Dados passados pela página anterior
  const [interviewId, setInterviewId] = useState(null);
  const [candidateData, setCandidateData] = useState(null);
  
  // Gravação
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorNodeRef = useRef(null);
  const isRecordingRef = useRef(false);
  
  // Transcrição em tempo real via WebSocket
  const { transcripts, questions: aiQuestions, isConnected, sendAudioChunk } = useRealtimeTranscription(interviewId);
  
  // Perguntas combinadas (AI + pré-programadas)
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  
  // Anotações
  const [notes, setNotes] = useState('');
  
  // Estado de processamento
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  
  // Inicialização
  useEffect(() => {
    // Pegar dados do state da navegação
    if (location.state?.interviewId && location.state?.candidateData) {
      setInterviewId(location.state.interviewId);
      setCandidateData(location.state.candidateData);
      console.log('Interview ID recebido:', location.state.interviewId);
    } else {
      // Fallback: tentar localStorage
      const savedData = localStorage.getItem('interviewData');
      if (!savedData) {
        alert('Dados da entrevista não encontrados');
        navigate('/nova-entrevista');
        return;
      }
      setCandidateData(JSON.parse(savedData));
    }
    
    return () => {
      stopRecording();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [location, navigate]);

  // Auto-start recording quando tiver interviewId
  useEffect(() => {
    if (interviewId && !isRecording) {
      startRecording();
    }
  }, [interviewId]);
  
  // Timer
  useEffect(() => {
    if (isRecording) {
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRecording]);

  // Função para converter Float32Array para PCM16 (Int16Array)
  const convertToPCM16 = (float32Array) => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp entre -1 e 1, depois multiplica por 32767
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array.buffer;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1, // Mono
          sampleRate: 16000, // 16kHz
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      streamRef.current = stream;
      
      // Criar AudioContext para processar áudio
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });
      audioContextRef.current = audioContext;

      // Criar source node do stream
      const source = audioContext.createMediaStreamSource(stream);
      
      // Criar ScriptProcessorNode para processar áudio (4096 samples = ~256ms a 16kHz)
      const bufferSize = 4096;
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
      processorNodeRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!isRecordingRef.current) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        // Converter para PCM16 e enviar
        const pcmData = convertToPCM16(inputData);
        sendAudioChunk(pcmData);
      };

      // Conectar nodes
      source.connect(processor);
      processor.connect(audioContext.destination);

      // Também salvar em WebM para arquivo final
      const options = { mimeType: 'audio/webm;codecs=opus' };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        // WebM é salvo apenas para arquivo final, não para transcrição em tempo real
        // A transcrição usa o PCM do ScriptProcessorNode
      };

      // Capturar dados a cada 1 segundo para salvar arquivo
      mediaRecorder.start(1000);
      isRecordingRef.current = true;
      setIsRecording(true);
      console.log('Gravação iniciada');
    } catch (error) {
      console.error('Erro ao acessar microfone:', error);
      alert('Erro ao acessar o microfone. Verifique as permissões.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      isRecordingRef.current = false;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Desconectar e fechar AudioContext
      if (processorNodeRef.current) {
        processorNodeRef.current.disconnect();
        processorNodeRef.current = null;
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      console.log('Gravação parada');
    }
  };


  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Função para verificar se a transcrição está pronta (com retry otimizado)
  const waitForTranscript = async (maxRetries = 5, delayMs = 500) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        setProcessingMessage(`Aguardando transcrição... (${i + 1}/${maxRetries})`);
        const interview = await getInterviewById(interviewId);
        // Verificar se transcript existe e não está vazio (pode ser array ou string JSON)
        if (interview.transcript) {
          let transcriptData = interview.transcript;
          // Se for string, tentar fazer parse
          if (typeof transcriptData === 'string' && transcriptData.trim()) {
            try {
              transcriptData = JSON.parse(transcriptData);
            } catch (e) {
              // Se não for JSON válido, considerar como vazio
              transcriptData = null;
            }
          }
          // Verificar se é array e tem elementos
          if (Array.isArray(transcriptData) && transcriptData.length > 0) {
            console.log('Transcrição encontrada!');
            return true;
          }
        }
      } catch (error) {
        console.log(`Tentativa ${i + 1}/${maxRetries}: Transcrição ainda não disponível...`);
      }
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    return false;
  };

  const handleEndInterview = async () => {
    stopRecording();
    
    if (!interviewId) {
      alert('ID da entrevista não encontrado!');
      return;
    }

    setIsProcessing(true);
    setProcessingMessage('Processando entrevista...');

    try {
      // Salvar anotações primeiro
      if (notes.trim()) {
        setProcessingMessage('Salvando anotações...');
        await updateInterviewNotes(interviewId, notes);
      }
      
      // Aguardar WebSocket finalizar e transcrição estar pronta (otimizado: 5 tentativas, 500ms)
      setProcessingMessage('Aguardando transcrição...');
      const transcriptReady = await waitForTranscript(5, 500);
      
      if (!transcriptReady) {
        console.warn('Transcrição não encontrada após várias tentativas, tentando gerar análise mesmo assim...');
        setProcessingMessage('Transcrição ainda processando, tentando gerar análise...');
      }
      
      // Gerar análise
      setProcessingMessage('Gerando análise e resumo... (isso pode levar alguns minutos)');
      console.log('Iniciando geração de análise...');
      const startTime = Date.now();
      await generateAnalysis(interviewId);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`Análise gerada em ${duration} segundos`);
      
      // Clean up
      localStorage.removeItem('interviewData');
      
      // Navegar para a página de detalhes
      setIsProcessing(false);
      navigate(`/entrevista/${interviewId}`);

    } catch (error) {
      console.error('Erro ao processar entrevista:', error);
      setIsProcessing(false);
      setProcessingMessage('');
      alert(`Erro ao processar entrevista: ${error.message}\n\nMas os dados foram salvos. ID: ${interviewId}`);
      navigate('/inicio');
    }
  };

  const allQuestions = [...aiQuestions];

  if (!candidateData) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="record-page-container">
      {/* Transcrição Panel */}
      <div className="transcription-panel">
        <div className="transcription-card">
          <h3>
            Transcrição 
            {isConnected && <span style={{color: '#16a34a', fontSize: '0.8rem', marginLeft: '0.5rem'}}>● AO VIVO</span>}
            {isRecording && !isConnected && <span style={{color: '#eab308', fontSize: '0.8rem', marginLeft: '0.5rem'}}>⚠ Conectando...</span>}
          </h3>
          <div className="transcription-content">
            {transcripts.length > 0 && transcripts.map((item, index) => {
                const speakerLabel = item.speaker === 'A' || item.speaker === 'a' || item.speaker === 'A' 
                  ? 'Pessoa 1' 
                  : 'Pessoa 2';
                const isPersonOne = speakerLabel === 'Pessoa 1';
                
                return (
                  <div key={index} className={`transcription-message ${isPersonOne ? 'message-left' : 'message-right'}`}>
                    <div className="message-speaker">{speakerLabel}</div>
                    <div className={`transcription-bubble ${isPersonOne ? 'candidato' : 'entrevistador'}`}>
                      {item.text}
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>
      
      {/* Right Panel */}
      <div className="right-panel">
        {/* Questions Section */}
        <div className="questions-section">
          <h3>Perguntas</h3>
          
          <div className="questions-list">
            {allQuestions.length === 0 && (
              <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>
                {isConnected ? 'Sugestões de perguntas aparecerão aqui...' : 'Aguardando sugestões de perguntas...'}
              </p>
            )}
            {allQuestions.map((question) => (
              <div
                key={question.id}
                className={`question-item ${selectedQuestionId === question.id ? 'selected' : ''}`}
                onClick={() => setSelectedQuestionId(question.id)}
              >
                <div className="question-header">
                  <div className="question-number-status">
                    <span className="question-number">
                      🤖 IA
                    </span>
                  </div>
                </div>
                
                <p className="question-text">{question.text}</p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Notes Section */}
        <div className="notes-section">
          <h3>Anotações</h3>
          <textarea
            className="notes-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
          disabled={!interviewId || isProcessing}
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
