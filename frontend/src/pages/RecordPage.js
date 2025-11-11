import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CheckIcon from '../components/icons/CheckIcon';
import EqualsIcon from '../components/icons/EqualsIcon';
import ThumbsUpIcon from '../components/icons/ThumbsUpIcon';
import ThumbsDownIcon from '../components/icons/ThumbsDownIcon';
import { uploadInterview, saveCandidateInfo } from '../services/api';
import { useRealtimeTranscription } from '../hooks/useRealtimeTranscription';
import './RecordPage.css';

function RecordPage() {
  const navigate = useNavigate();
  
  // Dados do candidato
  const [candidateData, setCandidateData] = useState(null);
  
  // Gravação
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const streamRef = useRef(null);
  
  // Transcrição em tempo real via WebSocket
  const { transcripts: realtimeTranscripts, isConnected, sendAudioChunk } = useRealtimeTranscription(isRecording);
  
  // Perguntas (vazio inicialmente - adicione durante a entrevista)
  const [questions, setQuestions] = useState([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  
  // Anotações
  const [notes, setNotes] = useState('');
  
  // Inicialização
  useEffect(() => {
    const savedData = localStorage.getItem('interviewData');
    if (!savedData) {
      navigate('/nova-entrevista');
      return;
    }
    
    setCandidateData(JSON.parse(savedData));
    
    // Auto-start recording
    startRecording();
    
    return () => {
      stopRecording();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);
  
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const options = { mimeType: 'audio/webm;codecs=opus' };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          
          // Enviar chunk para transcrição em tempo real
          sendAudioChunk(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
      };

      // Capturar dados a cada 5 segundos para transcrição em tempo real
      mediaRecorder.start(5000); // 5000ms = 5 segundos
      setIsRecording(true);
    } catch (error) {
      console.error('Erro ao acessar microfone:', error);
      alert('Erro ao acessar o microfone. Verifique as permissões.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const toggleQuestionStatus = (id) => {
    setQuestions(questions.map(q => 
      q.id === id 
        ? { ...q, status: q.status === 'completed' ? 'pending' : 'completed' }
        : q
    ));
  };
  
  const handleQuestionReaction = (id, reaction) => {
    console.log(`Question ${id} ${reaction}`);
    // Backend integration: send reaction
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleEndInterview = async () => {
    stopRecording();
    
    if (!audioBlob && !chunksRef.current.length) {
      alert('Nenhum áudio gravado!');
      return;
    }

    const finalBlob = audioBlob || new Blob(chunksRef.current, { type: 'audio/webm' });
    
    if (!candidateData || !candidateData.candidatePositionId) {
      alert('Dados do candidato incompletos!');
      return;
    }

    try {
      // Upload do áudio
      const result = await uploadInterview(finalBlob, candidateData.candidatePositionId);
      const interviewId = result.id;
      console.log('Upload concluído! Interview ID:', interviewId);
      
      // Salvar dados do candidato
      await saveCandidateInfo(interviewId, {
        name: candidateData.candidateName,
        email: candidateData.candidateEmail,
        phone: candidateData.candidatePhone,
        notes: notes
      });
      console.log('Dados do candidato salvos!');
      
      // Clean up
      localStorage.removeItem('interviewData');
      
      // Navegar para a página inicial
      alert('Entrevista enviada com sucesso!');
      navigate('/inicio');

    } catch (error) {
      console.error('Erro ao processar entrevista:', error);
      alert(`Erro ao enviar entrevista: ${error.message}\n\nVerifique se o backend está rodando em http://localhost:8000`);
    }
  };

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
            {isRecording && !isConnected && <span style={{color: '#eab308', fontSize: '0.8rem', marginLeft: '0.5rem'}}>⚠ Offline</span>}
          </h3>
          <div className="transcription-content">
            {realtimeTranscripts.length === 0 ? (
              <p className="transcription-empty">
                {isRecording 
                  ? isConnected 
                    ? '🎤 Gravando... A transcrição aparecerá aqui em tempo real (a cada 5 segundos)'
                    : '🎤 Gravando... (Transcrição em tempo real indisponível - será processada ao final)'
                  : 'A transcrição aparecerá aqui em tempo real...'
                }
              </p>
            ) : (
              realtimeTranscripts.map((item, index) => (
                <div key={index} className="transcription-message">
                  <div className="transcription-bubble candidato" style={{opacity: item.isFinal ? 1 : 0.7}}>
                    {item.text}
                  </div>
                </div>
              ))
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
            {questions.map((question) => (
              <div
                key={question.id}
                className={`question-item ${selectedQuestionId === question.id ? 'selected' : ''}`}
                onClick={() => setSelectedQuestionId(question.id)}
              >
                <div className="question-header">
                  <div className="question-number-status">
                    <span className="question-number">Pergunta #{question.id}</span>
                    <button
                      className={`status-icon ${question.status}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleQuestionStatus(question.id);
                      }}
                      title={question.status === 'completed' ? 'Marcar como pendente' : 'Marcar como concluída'}
                    >
                      <span className="status-icon-symbol">
                        {question.status === 'completed' ? (
                          <CheckIcon size={16} color="#1a1a1a" />
                        ) : (
                          <EqualsIcon size={16} color="#1a1a1a" />
                        )}
                      </span>
                    </button>
                  </div>
                  
                  {question.isAI && (
                    <div className="question-ai-controls">
                      <button
                        className="reaction-btn like"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuestionReaction(question.id, 'like');
                        }}
                        aria-label="Aceitar sugestão"
                      >
                        <ThumbsUpIcon size={18} color="#1a1a1a" />
                      </button>
                      <button 
                        className="reaction-btn dislike"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuestionReaction(question.id, 'dislike');
                        }}
                        aria-label="Rejeitar sugestão"
                      >
                        <ThumbsDownIcon size={18} color="#1a1a1a" />
                      </button>
                    </div>
                  )}
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
          {formatTime(recordingTime)} / 30:00
        </div>
          <button 
          className="end-interview-btn"
          onClick={handleEndInterview}
          >
          Encerrar gravação
          </button>
        </div>
    </div>
  );
}

export default RecordPage;
