import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sidebar, Header } from '../components/layout';
import CalendarIcon from '../components/icons/CalendarIcon';
import ClockIcon from '../components/icons/ClockIcon';
import { getInterviews, getPositions } from '../services/api';
import './ResultsPage.css';

function ResultsPage() {
  const navigate = useNavigate();
  const { positionId } = useParams();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);

  useEffect(() => {
    loadInterviews();
    if (positionId && positionId !== '0') {
      loadPositionName();
    }
  }, [positionId]);

  const loadPositionName = async () => {
    try {
      const positions = await getPositions();
      const position = positions.find(p => p.id === parseInt(positionId));
      setSelectedPosition(position);
    } catch (error) {
      console.error('Erro ao carregar cargo:', error);
      // Não bloqueia a renderização se o backend não estiver rodando
      setSelectedPosition(null);
    }
  };

  const loadInterviews = async () => {
    try {
      setLoading(true);
      const positionIdNum = positionId ? parseInt(positionId) : 0;
      const data = await getInterviews(positionIdNum);
      
      // Formatar dados do backend para o formato esperado
      const formattedInterviews = data.map(interview => {
        // Parse analysis se for string
        let analysis = {};
        if (interview.analysis && typeof interview.analysis === 'string') {
          try {
            analysis = JSON.parse(interview.analysis);
          } catch (e) {
            console.error('Erro ao parsear análise:', e);
          }
        } else if (typeof interview.analysis === 'object') {
          analysis = interview.analysis;
        }
        
        // Converter score de 0-1000 para porcentagem 0-100%
        const scorePercentage = interview.score ? Math.round((interview.score / 1000) * 100) : 0;
        
        return {
          id: interview.id,
          name: interview.name || 'Candidato sem nome',
          email: interview.email || '',
          date: interview.date ? new Date(interview.date).toLocaleDateString('pt-BR') : 'Data não disponível',
          duration: 'N/A', // Backend não retorna duração
          match: scorePercentage, // Agora é porcentagem (0-100%)
          positives: analysis?.positives || ['Aguardando análise'], // CORRIGIDO: era strengths
          negatives: analysis?.negatives || ['Aguardando análise'], // CORRIGIDO: era weaknesses
          position: interview.position
        };
      });
      
      setInterviews(formattedInterviews);
    } catch (error) {
      console.error('Erro ao carregar entrevistas:', error);
      // Não mostra alert, apenas define lista vazia para permitir edição do layout
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
        title={selectedPosition ? `Ranking - ${selectedPosition.name}` : "Análise de candidatos"}
        showComparar={true}
        onMenuClick={() => setSidebarOpen(true)}
      />
      
      {selectedPosition && (
        <div style={{ 
          padding: '1rem 2rem', 
          background: '#E9F2FF', 
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <strong>{selectedPosition.name}</strong>
            {selectedPosition.vacancies > 0 && (
              <span style={{ marginLeft: '1rem', color: '#666' }}>
                {selectedPosition.vacancies} vaga{selectedPosition.vacancies !== 1 ? 's' : ''} disponível{selectedPosition.vacancies !== 1 ? 'eis' : ''}
              </span>
            )}
          </div>
          <button 
            onClick={() => navigate('/ranking')}
            style={{
              padding: '0.5rem 1rem',
              background: 'white',
              border: '1px solid #3b82f6',
              borderRadius: '6px',
              color: '#3b82f6',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Trocar cargo
          </button>
        </div>
      )}
      
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
