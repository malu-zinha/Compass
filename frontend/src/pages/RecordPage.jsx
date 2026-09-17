import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { generateAnalysis, updateInterviewNotes, getInterviewById, getGlobalQuestions } from '../services/api';
import { useRealtimeTranscription } from '../hooks/useRealtimeTranscription';
import { InfoIcon, FileTextIcon, BriefcaseIcon } from '../components/icons';
import { API_URL } from '../api/config';
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
  const audioChunksRef = useRef([]);
  
  // Transcrição em tempo real via WebSocket (SEM diarização completa)
  // NOTA: Esta transcrição é TEMPORÁRIA e será SUBSTITUÍDA pela transcrição
  // com diarização completa após o upload do áudio ao finalizar a entrevista
  const { transcripts, questions: aiQuestions, isConnected, sendAudioChunk } = useRealtimeTranscription(interviewId);
  
  // Perguntas cadastradas (globais + específicas do cargo)
  const [registeredQuestions, setRegisteredQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  
  // Perguntas combinadas (AI + pré-programadas)
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  
  // Anotações
  const [notes, setNotes] = useState('');
  
  // Estado de processamento
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  
  // Ref para auto-scroll da transcrição
  const transcriptionContentRef = useRef(null);
  
  // Função de cleanup completa para garantir que o microfone seja desligado
  // Função para enviar áudio para o backend
  const uploadAudioToBackend = async () => {
    if (audioChunksRef.current.length === 0) {
      console.warn('Nenhum áudio gravado para enviar');
      return false;
    }

    try {
      console.log(`Enviando ${audioChunksRef.current.length} chunks de áudio para o backend...`);
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      console.log('Tamanho do áudio:', audioBlob.size, 'bytes');
      console.log('Duração da gravação:', recordingTime, 'segundos');
      
      const formData = new FormData();
      formData.append('audio', audioBlob, `interview_${interviewId}.webm`);
      // Enviar também a duração da gravação para o backend usar como metadata
      formData.append('duration', recordingTime.toString());
      
      const response = await fetch(`${API_URL}/positions/interviews/${interviewId}/upload-audio`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao enviar áudio: ${response.status}`);
      }
      
      console.log('✅ Áudio enviado com sucesso para o backend');
      console.log('✅ Duração enviada:', recordingTime, 'segundos');
      audioChunksRef.current = []; // Limpar chunks após envio
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar áudio:', error);
      return false;
    }
  };

  const cleanupAllResources = () => {
    console.log('Limpando todos os recursos de áudio...');
    
    // Parar gravação
    isRecordingRef.current = false;
    
    // Parar MediaRecorder
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {
        console.warn('Erro ao parar MediaRecorder:', e);
      }
      mediaRecorderRef.current = null;
    }
    
    // Desconectar e limpar processor
    if (processorNodeRef.current) {
      try {
        processorNodeRef.current.disconnect();
      } catch (e) {
        console.warn('Erro ao desconectar processor:', e);
      }
      processorNodeRef.current = null;
    }
    
    // Fechar AudioContext
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      } catch (e) {
        console.warn('Erro ao fechar AudioContext:', e);
      }
      audioContextRef.current = null;
    }
    
    // Parar todas as tracks do stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Track parada:', track.kind);
      });
      streamRef.current = null;
    }
    
    // Parar timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    setIsRecording(false);
    console.log('Recursos de áudio limpos');
  };

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
    
    // Listener para quando o usuário tenta sair da página
    const handleBeforeUnload = () => {
      cleanupAllResources();
    };
    
    // Listener para quando o usuário navega (popstate - botão voltar)
    const handlePopState = () => {
      cleanupAllResources();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    
    // Cleanup quando componente é desmontado
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      cleanupAllResources();
    };
  }, [location, navigate]);

  // Auto-scroll da transcrição quando novos transcripts chegam
  useEffect(() => {
    if (transcriptionContentRef.current && transcripts.length > 0) {
      transcriptionContentRef.current.scrollTop = transcriptionContentRef.current.scrollHeight;
    }
  }, [transcripts]);

  // Carregar perguntas cadastradas quando tiver interviewId e position_id
  useEffect(() => {
    const loadRegisteredQuestions = async () => {
      if (!candidateData?.candidatePositionId) {
        return;
      }
      
      setLoadingQuestions(true);
      try {
        // Carregar perguntas globais (sem position_id)
        const globalQuestions = await getGlobalQuestions(null);
        
        // Carregar perguntas específicas do cargo (com position_id)
        const positionQuestions = await getGlobalQuestions(candidateData.candidatePositionId);
        
        // Combinar todas as perguntas cadastradas
        const allRegistered = [
          ...globalQuestions.map(q => ({
            id: `global-${q.id}`,
            text: q.question,
            isAI: false,
            isGlobal: true
          })),
          ...positionQuestions.map(q => ({
            id: `position-${q.id}`,
            text: q.question,
            isAI: false,
            isGlobal: false
          }))
        ];
        
        setRegisteredQuestions(allRegistered);
        console.log(`Carregadas ${allRegistered.length} perguntas cadastradas (${globalQuestions.length} globais + ${positionQuestions.length} do cargo)`);
      } catch (error) {
        console.error('Erro ao carregar perguntas cadastradas:', error);
        setRegisteredQuestions([]);
      } finally {
        setLoadingQuestions(false);
      }
    };
    
    loadRegisteredQuestions();
  }, [candidateData?.candidatePositionId]);

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
        if (e.data && e.data.size > 0) {
          console.log('Áudio chunk recebido:', e.data.size, 'bytes');
          audioChunksRef.current.push(e.data);
        }
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
            } catch {
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
      } catch {
        console.log(`Tentativa ${i + 1}/${maxRetries}: Transcrição ainda não disponível...`);
      }
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    return false;
  };

  const handleEndInterview = async () => {
    if (!interviewId) {
      alert('ID da entrevista não encontrado!');
      return;
    }

    setIsProcessing(true);
    const startTotal = Date.now();
    
    console.log('\n' + '='.repeat(80));
    console.log('⏱️  INICIANDO FINALIZAÇÃO DA ENTREVISTA');
    console.log('='.repeat(80) + '\n');
    
    try {
      // 1. Parar gravação (mas não limpar recursos ainda)
      console.log('[1/6] Parando gravação...');
      const startStop = Date.now();
      setProcessingMessage('Parando gravação...');
      isRecordingRef.current = false;
      setIsRecording(false);
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        // Aguardar para garantir que ondataavailable seja chamado
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      console.log(`⏱️  [1/6] Gravação parada em ${((Date.now() - startStop) / 1000).toFixed(2)}s`);
      
      // 2. Enviar áudio para o backend
      console.log('[2/6] Enviando áudio para o servidor...');
      console.log('📝 O backend irá processar o áudio COM DIARIZAÇÃO em background');
      console.log('📝 Esta transcrição com diarização substituirá a transcrição em tempo real');
      const startUpload = Date.now();
      setProcessingMessage('Enviando áudio para o servidor (será processado com diarização)...');
      const audioSent = await uploadAudioToBackend();
      if (!audioSent) {
        console.warn('⚠️ Falha ao enviar áudio, mas continuando com a análise...');
      } else {
        console.log(`⏱️  [2/6] Áudio enviado em ${((Date.now() - startUpload) / 1000).toFixed(2)}s`);
        console.log('✅ Backend iniciará transcrição COM DIARIZAÇÃO em background');
      }
      
      // 3. Limpar recursos de áudio
      console.log('[3/6] Limpando recursos de áudio...');
      cleanupAllResources();
      console.log('✅ [3/6] Recursos limpos');
      
      // 4. Salvar anotações
      if (notes.trim()) {
        console.log('[4/6] Salvando anotações...');
        const startNotes = Date.now();
        setProcessingMessage('Salvando anotações...');
        await updateInterviewNotes(interviewId, notes);
        console.log(`⏱️  [4/6] Anotações salvas em ${((Date.now() - startNotes) / 1000).toFixed(2)}s`);
      } else {
        console.log('[4/6] Sem anotações para salvar');
      }
      
      // 5. Aguardar transcrição estar pronta
      console.log('[5/6] Aguardando transcrição estar pronta...');
      const startWait = Date.now();
      setProcessingMessage('Aguardando transcrição...');
      const transcriptReady = await waitForTranscript(5, 500);
      
      if (!transcriptReady) {
        console.warn('⚠️ Transcrição não encontrada após várias tentativas');
        console.warn('⚠️ O backend irá transcrever o áudio durante a análise');
        setProcessingMessage('Preparando para análise...');
      } else {
        console.log(`✅ [5/6] Transcrição confirmada em ${((Date.now() - startWait) / 1000).toFixed(2)}s`);
      }
      
      // 6. Gerar análise
      console.log('[6/6] Gerando análise com IA...');
      setProcessingMessage('Gerando análise e resumo... (isso pode levar alguns minutos)');
      const startAnalysis = Date.now();
      await generateAnalysis(interviewId);
      const analysisTime = ((Date.now() - startAnalysis) / 1000).toFixed(2);
      console.log(`⏱️  [6/6] Análise gerada em ${analysisTime}s`);
      
      // Clean up
      localStorage.removeItem('interviewData');
      
      // Garantir que recursos estão limpos antes de navegar
      cleanupAllResources();
      
      const totalTime = ((Date.now() - startTotal) / 1000).toFixed(2);
      console.log('\n' + '='.repeat(80));
      console.log(`⏱️  TEMPO TOTAL: ${totalTime}s`);
      console.log('='.repeat(80) + '\n');
      
      // Navegar para a página de detalhes
      setIsProcessing(false);
      navigate(`/entrevista/${interviewId}`);

    } catch (error) {
      console.error('Erro ao processar entrevista:', error);
      setIsProcessing(false);
      setProcessingMessage('');
      // Garantir cleanup mesmo em caso de erro
      cleanupAllResources();
      alert(`Erro ao processar entrevista: ${error.message}\n\nMas os dados foram salvos. ID: ${interviewId}`);
      navigate('/inicio');
    }
  };

  // Combinar todas as perguntas: cadastradas (globais + específicas) + IA
  const allQuestions = [
    ...registeredQuestions,
    ...aiQuestions
  ];

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
          <div className="transcription-content" ref={transcriptionContentRef}>
            {transcripts.length === 0 ? (
              <div className="transcription-empty">
                Aguardando transcrição em tempo real...
              </div>
            ) : (
              <div className="transcription-text-block">
                {transcripts.map((item, index) => {
                const key = item.id || `transcript-${index}`;
                  const isLastItem = index === transcripts.length - 1;
                  const showTypingIndicator = !item.is_final && isLastItem;
                
                return (
                    <span 
                      key={key} 
                      className={`transcription-segment ${item.is_final ? 'final' : 'transcribing'}`}
                    >
                      {item.text}
                      {showTypingIndicator && <span className="typing-indicator">...</span>}
                      {' '}
                    </span>
                  );
                })}
                    </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Right Panel */}
      <div className="right-panel">
        {/* Questions Section */}
        <div className="questions-section">
          <h3>Perguntas</h3>
          
          <div className="questions-list">
            {loadingQuestions && (
              <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>
                Carregando perguntas...
              </p>
            )}
            {!loadingQuestions && allQuestions.length === 0 && (
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
                      {question.isAI ? (
                        <>
                          <InfoIcon size={16} color="#371C68" />
                          IA
                        </>
                      ) : question.isGlobal ? (
                        <>
                          <FileTextIcon size={16} color="#371C68" />
                          Geral
                        </>
                      ) : (
                        <>
                          <BriefcaseIcon size={16} color="#371C68" />
                          Cargo
                        </>
                      )}
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
