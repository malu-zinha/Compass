import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createInterview } from '../../../api/interviews';
import { MicrophoneIcon, UploadIcon } from '../../../components/icons';
import { useInterviewDraft } from './useInterviewDraft';
import './InterviewTypePage.css';

function InterviewTypePage() {
  const navigate = useNavigate();
  const { draft } = useInterviewDraft();
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!draft) {
      navigate('/nova-entrevista');
    }
  }, [draft, navigate]);

  const handleSelectType = async (type) => {
    if (!draft) return;

    if (type === 'upload') {
      navigate('/upload');
      return;
    }

    setIsCreating(true);

    try {
      const result = await createInterview({
        position_id: draft.position_id,
        candidate_name: draft.candidate_name,
        candidate_email: draft.candidate_email,
        candidate_phone: draft.candidate_phone,
        recording_consent: draft.recording_consent,
        mode: 'live',
      });

      navigate(`/gravar/${result.id}`);
    } catch (error) {
      console.error('Erro ao criar entrevista:', error);
      alert(error.detail || 'Erro ao criar entrevista. Verifique se o backend está rodando.');
      setIsCreating(false);
    }
  };

  const handleBack = () => {
    navigate('/nova-entrevista');
  };

  if (!draft) {
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
          <p><strong>Cargo:</strong> {draft.position_name}</p>
          <p><strong>Email:</strong> {draft.candidate_email}</p>
          <p><strong>Telefone:</strong> {draft.candidate_phone}</p>
        </div>
      </div>
    </div>
  );
}

export default InterviewTypePage;
