import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import CalendarIcon from '../components/icons/CalendarIcon';
import ClockIcon from '../components/icons/ClockIcon';
import './ResultsPage.css';

function ResultsPage() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Mock data - substituir com fetch real
    const mockInterviews = [
      {
        id: 1,
        name: 'Candidato #1',
        email: 'candidato1@gmail.com',
        date: '14/10/2025',
        duration: '40 minutos',
        match: 83,
        positives: ['Pontos positivos do candidato'],
        negatives: ['Pontos negativos do candidato']
      },
      {
        id: 2,
        name: 'Candidato #2',
        email: 'candidato#2@gmail.com',
        date: '15/10/2025',
        duration: '39 minutos',
        match: 82,
        positives: ['Pontos positivos do candidato'],
        negatives: ['Pontos negativos do candidato']
      },
      {
        id: 3,
        name: 'Candidato #3',
        email: 'candidato#3@gmail.com',
        date: '15/10/2025',
        duration: '45 minutos',
        match: 98,
        positives: ['Pontos positivos do candidato'],
        negatives: ['Pontos negativos do candidato']
      },
      {
        id: 4,
        name: 'Candidato #4',
        email: 'candidato#4@gmail.com',
        date: '15/10/2025',
        duration: '45 minutos',
        match: 98,
        positives: ['Pontos positivos do candidato'],
        negatives: ['Pontos negativos do candidato']
      },
      {
        id: 5,
        name: 'Candidato #5',
        email: 'candidato#5@gmail.com',
        date: '16/10/2025',
        duration: '27 minutos',
        match: 86,
        positives: ['Pontos positivos do candidato'],
        negatives: ['Pontos negativos do candidato']
      },
      {
        id: 6,
        name: 'Candidato #6',
        email: 'candidato#6@gmail.com',
        date: '16/10/2025',
        duration: '32 minutos',
        match: 75,
        positives: ['Pontos positivos do candidato'],
        negatives: ['Pontos negativos do candidato']
      },
      {
        id: 7,
        name: 'Candidato #7',
        email: 'candidato#7@gmail.com',
        date: '17/10/2025',
        duration: '42 minutos',
        match: 80,
        positives: ['Pontos positivos do candidato'],
        negatives: ['Pontos negativos do candidato']
      },
      {
        id: 8,
        name: 'Candidato #8',
        email: 'candidato#8@gmail.com',
        date: '17/10/2025',
        duration: '38 minutos',
        match: 77,
        positives: ['Pontos positivos do candidato'],
        negatives: ['Pontos negativos do candidato']
      }
    ];

    setInterviews(mockInterviews);
    setLoading(false);
  }, []);

  const rankedInterviews = [...interviews].sort((a, b) => b.match - a.match);

  const handleViewDetails = (id) => {
    navigate(`/entrevista/${id}`);
  };

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  return (
    <div className="results-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header 
        title="Análise de candidatos"
        showComparar={true}
        onMenuClick={() => setSidebarOpen(true)}
      />
      
      <div className="results-container">
        {/* Coluna Esquerda - Entrevistados */}
        <div className="interviews-grid-section">
          <h2 className="section-title">Entrevistados</h2>
          
          <div className="interviews-grid">
            {interviews.map((interview) => (
              <div key={interview.id} className="interview-card">
                <h3 className="card-title">{interview.name}</h3>
                
                <div className="card-section">
                  <div className="section-label positives">Pontos positivos</div>
                  {interview.positives.map((point, idx) => (
                    <div key={idx} className="section-text">[{point}]</div>
                  ))}
                </div>
                
                <div className="card-section">
                  <div className="section-label negatives">Pontos negativos</div>
                  {interview.negatives.map((point, idx) => (
                    <div key={idx} className="section-text">[{point}]</div>
                  ))}
                </div>
                
                <button 
                  className="btn-ver-detalhes"
                  onClick={() => handleViewDetails(interview.id)}
                >
                  Ver detalhes
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Coluna Direita - Ranking */}
        <div className="ranking-section">
          <h2 className="section-title">Ranking</h2>
          
          <div className="ranking-list">
            {rankedInterviews.slice(0, 5).map((interview, index) => (
              <div key={interview.id} className="ranking-item">
                <div className="ranking-header">
                  <div className="ranking-number">{index + 1}</div>
                  <div className="ranking-info">
                    <div className="ranking-name">{interview.name}</div>
                    <div className="ranking-email">{interview.email}</div>
                  </div>
                  <div className="ranking-match">{interview.match}% match</div>
                </div>
                
                <div className="ranking-meta">
                  <span className="ranking-meta-item">
                    <CalendarIcon size={16} color="#666" />
                    <span>{interview.date}</span>
                  </span>
                  <span className="ranking-meta-item">
                    <ClockIcon size={16} color="#666" />
                    <span>{interview.duration}</span>
                  </span>
                </div>
                
                <button 
                  className="btn-ver-detalhes-small"
                  onClick={() => handleViewDetails(interview.id)}
                >
                  Ver detalhes
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResultsPage;
