import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Header } from '../components/layout';
import CalendarIcon from '../components/icons/CalendarIcon';
import ClockIcon from '../components/icons/ClockIcon';
import { getInterviews } from '../services/api';
import './ResultsPage.css';

function ResultsPage() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadInterviews();
  }, []);

  const loadInterviews = async () => {
    try {
      setLoading(true);
      const data = await getInterviews();
      
      // Formatar dados do backend para o formato esperado
      const formattedInterviews = data.map(interview => {
        const analysis = interview.analysis;
        return {
          id: interview.id,
          name: interview.name || 'Candidato sem nome',
          email: interview.email || '',
          date: new Date(interview.date).toLocaleDateString('pt-BR'),
          duration: 'N/A', // Backend não retorna duração
          match: interview.score || 0,
          positives: analysis?.strengths || ['Aguardando análise'],
          negatives: analysis?.weaknesses || ['Aguardando análise'],
          position: interview.position
        };
      });
      
      setInterviews(formattedInterviews);
    } catch (error) {
      console.error('Erro ao carregar entrevistas:', error);
      alert('Erro ao carregar entrevistas. Verifique se o backend está rodando.');
      setInterviews([]);
    } finally {
      setLoading(false);
    }
  };

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
