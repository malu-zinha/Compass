import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Sidebar, Header } from '../components/layout';
import { InfoModal } from '../components/common';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import ChevronRightIcon from '../components/icons/ChevronRightIcon';
import PlayIcon from '../components/icons/PlayIcon';
import PauseIcon from '../components/icons/PauseIcon';
import PreviousIcon from '../components/icons/PreviousIcon';
import NextIcon from '../components/icons/NextIcon';
import VolumeIcon from '../components/icons/VolumeIcon';
import { getInterviews } from '../services/api';
import './InterviewDetailPage.css';

function InterviewDetailPage() {
  const { id } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    habilidades: true,
    historico: false,
    positivos: false,
    negativos: false,
    especificas: false,
    anotacoes: false
  });
  const [audioProgress, setAudioProgress] = useState(0);
  const [interviewData, setInterviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadInterviewData();
  }, [id]);

  // Polling effect - verifica se precisa recarregar dados
  useEffect(() => {
    if (!interviewData) return;
    
    // Verificar se transcript existe (mesmo que seja booleano do backend)
    const hasTranscript = interviewData.rawInterview?.transcript !== false && 
                         interviewData.rawInterview?.transcript !== '';
    
    // Verificar se labeled existe e não está vazio
    const hasLabeled = interviewData.transcription?.length > 0;
    
    // Verificar se análise foi gerada
    const hasAnalysis = interviewData.positives?.[0] !== 'Análise ainda não disponível';
    
    const needsProcessing = !hasLabeled || !hasAnalysis;
    
    setIsProcessing(needsProcessing);
    
    if (needsProcessing) {
      const interval = setInterval(() => {
        console.log('Recarregando dados da entrevista...');
        loadInterviewData();
      }, 3000); // Reduzido de 5000 para 3000 (3 segundos)
      
      // Timeout máximo de 5 minutos para evitar polling infinito
      const timeout = setTimeout(() => {
        console.log('Timeout: parando polling após 5 minutos');
        clearInterval(interval);
        setIsProcessing(false);
      }, 300000); // 5 minutos
      
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [interviewData]);

  const loadInterviewData = async () => {
    try {
      setLoading(true);
      const interviews = await getInterviews();
      const interview = interviews.find(i => i.id === parseInt(id));
      
      if (!interview) {
        alert('Entrevista não encontrada');
        return;
      }

      // Formatar dados para o formato esperado
      const analysis = interview.analysis || {};
      const labeled = interview.labeled || [];
      
      setInterviewData({
        rawInterview: interview, // Guardar dados brutos para verificação
        candidate: {
          candidateName: interview.name || 'Candidato sem nome',
          candidateEmail: interview.email || '',
          candidatePhone: interview.number || ''
        },
        date: new Date(interview.date).toLocaleDateString('pt-BR'),
        position: interview.position || 'Cargo não especificado',
        skills: analysis.skills || [],
        history: analysis.experiences || [],
        positives: analysis.strengths || ['Análise ainda não disponível'],
        negatives: analysis.weaknesses || ['Análise ainda não disponível'],
        specific: analysis.cultural_fit || 'Sem informações',
        notes: interview.notes || 'Sem anotações',
        transcription: labeled || [],
        score: interview.score || 0,
        summary: analysis.summary || 'Resumo não disponível'
      });
    } catch (error) {
      console.error('Erro ao carregar entrevista:', error);
      alert('Erro ao carregar dados da entrevista');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{padding: '2rem', textAlign: 'center'}}>Carregando entrevista...</div>;
  }

  if (!interviewData) {
    return <div style={{padding: '2rem', textAlign: 'center'}}>Entrevista não encontrada</div>;
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleProgressClick = (e) => {
    const progressBar = e.currentTarget;
    const clickX = e.clientX - progressBar.getBoundingClientRect().left;
    const width = progressBar.offsetWidth;
    const percentage = (clickX / width) * 100;
    setAudioProgress(percentage);
  };

  return (
    <div className="interview-detail-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header 
        title={`Candidato 1 - ${interviewData.date}`}
        showInfo={true}
        onInfoClick={() => setShowModal(true)}
        onMenuClick={() => setSidebarOpen(true)}
      />
      
      <div className="detail-container">
        {/* Coluna Esquerda - Resumo */}
        <div className="resume-column">
          <h2 className="section-main-title">Resumo</h2>
          
          <div className="resume-content">
            {/* Habilidades */}
            <div className="accordion-section">
            <button 
              className="accordion-header"
              onClick={() => toggleSection('habilidades')}
            >
              <span>Habilidades</span>
              <span className="accordion-icon">
                {expandedSections.habilidades ? (
                  <ChevronDownIcon size={16} color="#1a1a1a" />
                ) : (
                  <ChevronRightIcon size={16} color="#1a1a1a" />
                )}
              </span>
            </button>
            {expandedSections.habilidades && (
              <div className="accordion-content">
                {isProcessing && (!interviewData.skills || interviewData.skills.length === 0) ? (
                  <p className="loading-message">⏳ Carregando análise...</p>
                ) : (
                  <ol className="skills-list">
                    {interviewData.skills.map((skill, idx) => (
                      <li key={idx}>{skill}</li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>

          {/* Histórico */}
          <div className="accordion-section">
            <button 
              className="accordion-header"
              onClick={() => toggleSection('historico')}
            >
              <span>Histórico</span>
              <span className="accordion-icon">
                {expandedSections.historico ? (
                  <ChevronDownIcon size={16} color="#1a1a1a" />
                ) : (
                  <ChevronRightIcon size={16} color="#1a1a1a" />
                )}
              </span>
            </button>
            {expandedSections.historico && (
              <div className="accordion-content">
                {isProcessing && (!interviewData.history || interviewData.history.length === 0) ? (
                  <p className="loading-message">⏳ Carregando análise...</p>
                ) : (
                  interviewData.history.map((item, idx) => (
                    <div key={idx} className="history-item">
                      <div className="history-title">{item.title}</div>
                      <div className="history-description">{item.description}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Pontos Positivos */}
          <div className="accordion-section">
            <button 
              className="accordion-header"
              onClick={() => toggleSection('positivos')}
            >
              <span>Pontos positivos</span>
              <span className="accordion-icon">
                {expandedSections.positivos ? (
                  <ChevronDownIcon size={16} color="#1a1a1a" />
                ) : (
                  <ChevronRightIcon size={16} color="#1a1a1a" />
                )}
              </span>
            </button>
            {expandedSections.positivos && (
              <div className="accordion-content">
                {isProcessing && interviewData.positives?.[0] === 'Análise ainda não disponível' ? (
                  <p className="loading-message">⏳ Carregando análise...</p>
                ) : (
                  interviewData.positives.map((point, idx) => (
                    <div key={idx} className="point-item">{point}</div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Pontos Negativos */}
          <div className="accordion-section">
            <button 
              className="accordion-header"
              onClick={() => toggleSection('negativos')}
            >
              <span>Pontos negativos</span>
              <span className="accordion-icon">
                {expandedSections.negativos ? (
                  <ChevronDownIcon size={16} color="#1a1a1a" />
                ) : (
                  <ChevronRightIcon size={16} color="#1a1a1a" />
                )}
              </span>
            </button>
            {expandedSections.negativos && (
              <div className="accordion-content">
                {isProcessing && interviewData.negatives?.[0] === 'Análise ainda não disponível' ? (
                  <p className="loading-message">⏳ Carregando análise...</p>
                ) : (
                  interviewData.negatives.map((point, idx) => (
                    <div key={idx} className="point-item">{point}</div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Informações Específicas */}
          <div className="accordion-section">
            <button 
              className="accordion-header"
              onClick={() => toggleSection('especificas')}
            >
              <span>Informações específicas</span>
              <span className="accordion-icon">
                {expandedSections.especificas ? (
                  <ChevronDownIcon size={16} color="#1a1a1a" />
                ) : (
                  <ChevronRightIcon size={16} color="#1a1a1a" />
                )}
              </span>
            </button>
            {expandedSections.especificas && (
              <div className="accordion-content">
                <p>{interviewData.specific}</p>
              </div>
            )}
          </div>

          {/* Anotações */}
          <div className="accordion-section">
            <button 
              className="accordion-header"
              onClick={() => toggleSection('anotacoes')}
            >
              <span>Anotações</span>
              <span className="accordion-icon">
                {expandedSections.anotacoes ? (
                  <ChevronDownIcon size={16} color="#1a1a1a" />
                ) : (
                  <ChevronRightIcon size={16} color="#1a1a1a" />
                )}
              </span>
            </button>
            {expandedSections.anotacoes && (
              <div className="accordion-content">
                <p>{interviewData.notes}</p>
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Coluna Direita - Transcrição */}
        <div className="transcription-column">
          <h2 className="section-main-title">Transcrição</h2>
          
          <div className="transcription-content">
            {!interviewData.transcription || interviewData.transcription.length === 0 ? (
              <p className="loading-message">⏳ Carregando transcrição...</p>
            ) : (
              interviewData.transcription.map((message, idx) => {
                const isInterviewer = message.speaker.toLowerCase() === 'entrevistador';
                return (
                  <div key={idx} className={`transcription-message ${isInterviewer ? 'message-right' : 'message-left'}`}>
                    <div className="message-speaker">{message.speaker}</div>
                    <div className={`message-bubble ${isInterviewer ? 'interviewer' : 'interviewee'}`}>
                      {message.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Audio Player */}
          <div className="audio-player">
            <div 
              className="audio-progress-bar"
              onClick={handleProgressClick}
            >
              <div 
                className="audio-progress-fill"
                style={{ width: `${audioProgress}%` }}
              />
            </div>
            <div className="player-controls">
              <span className="player-time">00:00 / 4:59</span>
              <div className="player-buttons">
                <button className="player-btn">
                  <PreviousIcon size={20} color="#1a1a1a" />
                </button>
                <button className="player-btn play-btn">
                  <PlayIcon size={20} color="#1a1a1a" />
                </button>
                <button className="player-btn">
                  <NextIcon size={20} color="#1a1a1a" />
                </button>
              </div>
              <button className="volume-btn">
                <VolumeIcon size={20} color="#1a1a1a" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <InfoModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        candidateData={interviewData.candidate}
      />
    </div>
  );
}

export default InterviewDetailPage;
