import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './InterviewTypePage.css';

function InterviewTypePage() {
  const navigate = useNavigate();
  const [candidateData, setCandidateData] = useState(null);

  useEffect(() => {
    const savedData = localStorage.getItem('interviewData');
    if (!savedData) {
      navigate('/nova-entrevista');
      return;
    }
    
    setCandidateData(JSON.parse(savedData));
  }, [navigate]);

  const handleSelectType = (type) => {
    if (type === 'live') {
      navigate('/gravar');
    } else if (type === 'upload') {
      navigate('/upload');
    }
  };

  const handleBack = () => {
    navigate('/nova-entrevista');
  };

  if (!candidateData) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="interview-type-container">
      <div className="interview-type-content">
        <button className="back-button" onClick={handleBack}>
          ← Voltar
        </button>
        
        <h1 className="interview-type-title">
          Nova Entrevista para {candidateData.candidateName}
        </h1>
        <p className="interview-type-subtitle">
          Escolha como deseja realizar a entrevista
        </p>

        <div className="type-cards-container">
          <div 
            className="type-card"
            onClick={() => handleSelectType('live')}
          >
            <div className="type-card-icon">🎤</div>
            <h2 className="type-card-title">Entrevista ao vivo</h2>
            <p className="type-card-description">
              Grave a entrevista em tempo real com transcrição automática
            </p>
          </div>

          <div 
            className="type-card"
            onClick={() => handleSelectType('upload')}
          >
            <div className="type-card-icon">📁</div>
            <h2 className="type-card-title">Upload de Áudio</h2>
            <p className="type-card-description">
              Envie um áudio já gravado para análise
            </p>
          </div>
        </div>

        <div className="candidate-info">
          <p><strong>Cargo:</strong> {candidateData.candidatePosition}</p>
          <p><strong>Email:</strong> {candidateData.candidateEmail}</p>
          <p><strong>Telefone:</strong> {candidateData.candidatePhone}</p>
        </div>
      </div>
    </div>
  );
}

export default InterviewTypePage;

