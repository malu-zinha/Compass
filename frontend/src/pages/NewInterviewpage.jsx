import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPositions } from '../services/api';
import './NewInterviewpage.css';

function NewInterviewPage() {
  const navigate = useNavigate();
  
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [candidatePositionId, setCandidatePositionId] = useState('');
  const [availableJobs, setAvailableJobs] = useState([]);

  useEffect(() => {
    loadPositions();
  }, []);

  const loadPositions = async () => {
    try {
      const data = await getPositions();
      setAvailableJobs(data);
    } catch (error) {
      console.error('Erro ao carregar cargos:', error);
      alert('Erro ao carregar cargos. Verifique se o backend está rodando.');
    }
  };

  const isFormValid = () => {
    return candidateName.trim() && 
           candidateEmail.trim() && 
           candidatePhone.trim() && 
           candidatePositionId &&
           validateEmail(candidateEmail);
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleStartInterview = () => {
    if (!isFormValid()) {
      alert('Por favor, preencha todos os campos corretamente!');
      return;
    }

    const selectedJob = availableJobs.find(j => j.id === parseInt(candidatePositionId));
    
    const interviewData = {
      candidateName: candidateName.trim(),
      candidateEmail: candidateEmail.trim(),
      candidatePhone: candidatePhone.trim(),
      candidatePositionId: parseInt(candidatePositionId),
      candidatePosition: selectedJob ? selectedJob.name : '',
      timestamp: new Date().toISOString()
    };

    localStorage.setItem('interviewData', JSON.stringify(interviewData));
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

