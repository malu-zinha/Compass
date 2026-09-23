import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listPositions } from '../../../api/positions';
import { useInterviewDraft } from './useInterviewDraft';
import './NewInterviewPage.css';

function NewInterviewPage() {
  const navigate = useNavigate();
  const { saveDraft } = useInterviewDraft();

  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [candidatePositionId, setCandidatePositionId] = useState('');
  const [recordingConsent, setRecordingConsent] = useState(false);
  const [availableJobs, setAvailableJobs] = useState([]);

  useEffect(() => {
    loadPositions();
  }, []);

  const loadPositions = async () => {
    try {
      const data = await listPositions();
      setAvailableJobs(data.items);
    } catch (error) {
      console.error('Erro ao carregar cargos:', error);
      alert(error.detail || 'Erro ao carregar cargos. Verifique se o backend está rodando.');
    }
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const isFormValid = () => {
    return candidateName.trim() &&
           candidateEmail.trim() &&
           candidatePhone.trim() &&
           candidatePositionId &&
           recordingConsent &&
           validateEmail(candidateEmail);
  };

  const handleStartInterview = () => {
    if (!isFormValid()) {
      alert('Por favor, preencha todos os campos corretamente!');
      return;
    }

    const selectedJob = availableJobs.find((job) => job.id === parseInt(candidatePositionId, 10));

    saveDraft({
      candidate_name: candidateName.trim(),
      candidate_email: candidateEmail.trim(),
      candidate_phone: candidatePhone.trim(),
      position_id: parseInt(candidatePositionId, 10),
      position_name: selectedJob ? selectedJob.name : '',
      recording_consent: recordingConsent,
    });

    navigate('/tipo-entrevista');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && isFormValid()) {
      handleStartInterview();
    }
  };

  return (
    <div className="new-interview-container">
      <div className="new-interview-content">
        <h1 className="new-interview-title">Nova entrevista</h1>
        <p className="new-interview-subtitle">
          Preencha as informações para iniciar a gravação
        </p>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="candidate-name">Nome do candidato</label>
            <input
              id="candidate-name"
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder=""
              autoComplete="name"
            />
          </div>

          <div className="form-field">
            <label htmlFor="candidate-email">E-mail</label>
            <input
              id="candidate-email"
              type="email"
              value={candidateEmail}
              onChange={(e) => setCandidateEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder=""
              autoComplete="email"
            />
          </div>

          <div className="form-field">
            <label htmlFor="candidate-phone">Número</label>
            <input
              id="candidate-phone"
              type="tel"
              value={candidatePhone}
              onChange={(e) => setCandidatePhone(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder=""
              autoComplete="tel"
            />
          </div>

          <div className="form-field">
            <label htmlFor="candidate-position">Cargo</label>
            <select
              id="candidate-position"
              value={candidatePositionId}
              onChange={(e) => setCandidatePositionId(e.target.value)}
              className="form-select"
            >
              <option value="">Selecione um cargo</option>
              {availableJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label
              htmlFor="recording-consent"
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            >
              <input
                id="recording-consent"
                type="checkbox"
                checked={recordingConsent}
                onChange={(e) => setRecordingConsent(e.target.checked)}
              />
              Confirmo que o candidato autorizou a gravação e o processamento da entrevista.
            </label>
          </div>
        </div>

        <button
          className="start-interview-btn"
          onClick={handleStartInterview}
          disabled={!isFormValid()}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

export default NewInterviewPage;
