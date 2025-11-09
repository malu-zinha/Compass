import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import InfoModal from '../components/InfoModal';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import ChevronRightIcon from '../components/icons/ChevronRightIcon';
import PlayIcon from '../components/icons/PlayIcon';
import PauseIcon from '../components/icons/PauseIcon';
import PreviousIcon from '../components/icons/PreviousIcon';
import NextIcon from '../components/icons/NextIcon';
import VolumeIcon from '../components/icons/VolumeIcon';
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

  // Mock data - substituir com fetch real
  const [interviewData] = useState({
    candidate: {
      candidateName: 'Maria Luisa Quintela',
      candidateEmail: 'maluquintela@gmail.com',
      candidatePhone: '(83) 9 9999-9999'
    },
    date: '25/12/2025',
    skills: ['Python', 'React', 'C++'],
    history: [
      {
        title: 'Engenheiro de software - Meta',
        description: 'Explicação detalhada sobre a experiência do candidato.'
      },
      {
        title: 'Pesquisador - Tril Lab',
        description: 'Explicação detalhada sobre a experiência do candidato.'
      }
    ],
    positives: ['Ponto positivo 1', 'Ponto positivo 2'],
    negatives: ['Ponto negativo 1'],
    specific: 'Informações específicas do candidato',
    notes: 'Anotações sobre o candidato',
    transcription: [
      { speaker: 'Nome', text: 'Bom dia! Meu nome é [entrevistado], tenho 21 anos e sou formado em Ciência da Computação.' },
      { speaker: 'Entrevistador', text: 'Olá, fale um pouco sobre suas experiências no mercado de trabalho.' },
      { speaker: 'Nome', text: 'Claro, já trabalhei como engenheiro de software na Meta e meu emprego mais recente foi como fullstack na Microsoft' },
      { speaker: 'Entrevistador', text: 'Perfeito! Agora fale sobre suas habilidades técnicas, você tem experiência com quais linguagens de programa o?' },
      { speaker: 'User', text: 'Tenho experiência com Python, C, C++ e Java.' }
    ]
  });

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
                <ol className="skills-list">
                  {interviewData.skills.map((skill, idx) => (
                    <li key={idx}>{skill}</li>
                  ))}
                </ol>
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
                {interviewData.history.map((item, idx) => (
                  <div key={idx} className="history-item">
                    <div className="history-title">{item.title}</div>
                    <div className="history-description">{item.description}</div>
                  </div>
                ))}
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
                {interviewData.positives.map((point, idx) => (
                  <div key={idx} className="point-item">{point}</div>
                ))}
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
                {interviewData.negatives.map((point, idx) => (
                  <div key={idx} className="point-item">{point}</div>
                ))}
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

        {/* Coluna Direita - Transcrição */}
        <div className="transcription-column">
          <h2 className="section-main-title">Transcrição</h2>
          
          <div className="transcription-content">
            {interviewData.transcription.map((message, idx) => {
              const isInterviewer = message.speaker.toLowerCase() === 'entrevistador';
              return (
                <div key={idx} className={`transcription-message ${isInterviewer ? 'message-right' : 'message-left'}`}>
                  <div className="message-speaker">{message.speaker}</div>
                  <div className={`message-bubble ${isInterviewer ? 'interviewer' : 'interviewee'}`}>
                    {message.text}
                  </div>
                </div>
              );
            })}
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
