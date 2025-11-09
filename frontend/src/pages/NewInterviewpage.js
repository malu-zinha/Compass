import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './NewInterviewpage.css';

function NewInterviewPage() {
  const navigate = useNavigate();
  
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [candidatePosition, setCandidatePosition] = useState('');
  const [availableJobs, setAvailableJobs] = useState([]);

  useEffect(() => {
    // Carregar cargos disponíveis do localStorage
    const savedJobs = localStorage.getItem('jobs');
    if (savedJobs) {
      setAvailableJobs(JSON.parse(savedJobs));
    }
  }, []);

  const isFormValid = () => {
    return candidateName.trim() && 
           candidateEmail.trim() && 
           candidatePhone.trim() && 
           candidatePosition.trim() &&
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

    const interviewData = {
      candidateName: candidateName.trim(),
      candidateEmail: candidateEmail.trim(),
      candidatePhone: candidatePhone.trim(),
      candidatePosition: candidatePosition.trim(),
      timestamp: new Date().toISOString()
    };

    localStorage.setItem('interviewData', JSON.stringify(interviewData));
    navigate('/gravar');
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
              value={candidatePosition}
              onChange={(e) => setCandidatePosition(e.target.value)}
              className="form-select"
            >
              <option value="">Selecione um cargo</option>
              {availableJobs.map((job) => (
                <option key={job.id} value={job.name}>
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
          Iniciar gravação
        </button>
      </div>
    </div>
  );
}

export default NewInterviewPage;

