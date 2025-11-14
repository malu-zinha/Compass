import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCandidate } from '../services/api';
import { MicrophoneIcon, UploadIcon } from '../components/icons';
import './InterviewTypePage.css';

function InterviewTypePage() {
  const navigate = useNavigate();
  const [candidateData, setCandidateData] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const savedData = localStorage.getItem('interviewData');
    if (!savedData) {
      navigate('/nova-entrevista');
      return;
    }
    
    setCandidateData(JSON.parse(savedData));
  }, [navigate]);

  const handleSelectType = async (type) => {
    if (!candidateData) return;
    
    setIsCreating(true);
    
    try {
      // Criar o candidato no backend
      const result = await createCandidate({
        name: candidateData.candidateName,
        email: candidateData.candidateEmail,
        phone: candidateData.candidatePhone,
        notes: '',
        position_id: candidateData.candidatePositionId
      });
      
      const interviewId = result.id;
      console.log('Candidato criado com ID:', interviewId);
      
      // Navegar para a página correspondente passando o interviewId
      if (type === 'live') {
        navigate('/gravar', { state: { interviewId, candidateData } });
      } else if (type === 'upload') {
        navigate('/upload', { state: { interviewId, candidateData } });
      }
    } catch (error) {
      console.error('Erro ao criar candidato:', error);
      alert('Erro ao criar candidato. Verifique se o backend está rodando.');
      setIsCreating(false);
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
        <button className="back-button" onClick={handleBack} disabled={isCreating}>
          Voltar
        </button>
        
        <h1 className="interview-type-title">
          Nova Entrevista
        </h1>
        <p className="interview-type-subtitle">
          Escolha como deseja realizar a entrevista
        </p>

        <div className="type-cards-container">
          <div 
            className={`type-card ${isCreating ? 'disabled' : ''}`}
            onClick={() => !isCreating && handleSelectType('live')}
          >
            <div className="type-card-icon">
              <MicrophoneIcon size={48} color="#371C68" />
            </div>
            <h2 className="type-card-title">Entrevista ao vivo</h2>
            <p className="type-card-description">
              Grave a entrevista em tempo real com transcrição automática
            </p>
          </div>

          <div 
            className={`type-card ${isCreating ? 'disabled' : ''}`}
            onClick={() => !isCreating && handleSelectType('upload')}
          >
            <div className="type-card-icon">
              <UploadIcon size={48} color="#371C68" />
            </div>
            <h2 className="type-card-title">Upload de Áudio</h2>
            <p className="type-card-description">
              Envie um áudio já gravado para análise
            </p>
          </div>
        </div>

        {isCreating && (
          <p style={{ textAlign: 'center', marginTop: '1rem' }}>
            Criando entrevista...
          </p>
        )}

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
