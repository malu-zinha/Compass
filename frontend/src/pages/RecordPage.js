import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CheckIcon from '../components/icons/CheckIcon';
import EqualsIcon from '../components/icons/EqualsIcon';
import ThumbsUpIcon from '../components/icons/ThumbsUpIcon';
import ThumbsDownIcon from '../components/icons/ThumbsDownIcon';
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
  
  // Transcrição em tempo real
  const [transcription, setTranscription] = useState([
    // Mock data for development
    { speaker: 'Candidato', text: 'Bom dia! Meu nome é [entrevistado], tenho 21 anos e sou formado em Ciência da Computação.' },
    { speaker: 'Entrevistador', text: 'Olá, fale um pouco sobre suas experiências no mercado de trabalho.' },
    { speaker: 'Candidato', text: 'Claro, já trabalhei como engenheiro de software na Meta e meu emprego mais recente foi como fullstack na Microsoft' }
  ]);
  
  // Perguntas
  const [questions, setQuestions] = useState([
    { id: 1, text: 'Como você se vê em 5 anos?', status: 'completed', isAI: false },
    { id: 2, text: 'Me conte sobre seus hobbies.', status: 'pending', isAI: false },
    { id: 3, text: 'Quais suas experiências anteriores no mercado?', status: 'pending', isAI: false },
    { id: 4, text: 'Fale mais sobre esse seu último emprego.', status: 'pending', isAI: true }
  ]);
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
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
      };

      mediaRecorder.start();
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

    // Prepare data to send to backend
    const formData = new FormData();
    
    const finalBlob = audioBlob || new Blob(chunksRef.current, { type: 'audio/webm' });
    formData.append('audio_file', finalBlob, 'interview.webm');
    
    if (candidateData) {
      formData.append('candidate_name', candidateData.candidateName);
      formData.append('candidate_email', candidateData.candidateEmail);
      formData.append('candidate_phone', candidateData.candidatePhone);
      formData.append('candidate_position', candidateData.candidatePosition);
    }
    
    formData.append('questions', JSON.stringify(questions));
    formData.append('notes', notes);
    formData.append('transcription', JSON.stringify(transcription));
    formData.append('duration', recordingTime);
    
    try {
      // TODO: Backend integration
      // const response = await fetch('http://localhost:8000/api/interviews/complete', {
      //   method: 'POST',
      //   body: formData
      // });
      
      console.log('Interview data ready to send:', {
        audioSize: finalBlob.size,
        candidateData,
        questions,
        notes,
        transcription,
        duration: recordingTime
      });
      
      // Generate interview ID (in real app, this would come from backend)
      const interviewId = Date.now().toString();
      
      // Save interview data temporarily to access in detail page
      const interviewDetailData = {
        id: interviewId,
        candidate: candidateData,
        date: new Date().toLocaleDateString('pt-BR'),
        transcription: transcription,
        questions: questions,
        notes: notes,
        duration: recordingTime
      };
      localStorage.setItem(`interview_${interviewId}`, JSON.stringify(interviewDetailData));
      
      // Clean up interviewData
      localStorage.removeItem('interviewData');
      
      // Navigate to interview detail page
      setTimeout(() => {
        navigate(`/entrevista/${interviewId}`);
      }, 500);

    } catch (error) {
      console.error('Erro ao enviar entrevista:', error);
      alert('Erro ao processar entrevista. Tente novamente.');
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
          <h3>Transcrição</h3>
          <div className="transcription-content">
            {transcription.length === 0 ? (
              <p className="transcription-empty">
                A transcrição aparecerá aqui em tempo real...
              </p>
            ) : (
              transcription.map((item, index) => (
                <div key={index} className="transcription-message">
                  <div className="transcription-speaker">{item.speaker}</div>
                  <div className={`transcription-bubble ${item.speaker.toLowerCase()}`}>
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
                        title="Aceitar sugestão"
                      >
                        <ThumbsUpIcon size={18} color="#1a1a1a" />
                      </button>
      <button 
                        className="reaction-btn dislike"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuestionReaction(question.id, 'dislike');
                        }}
                        title="Rejeitar sugestão"
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
