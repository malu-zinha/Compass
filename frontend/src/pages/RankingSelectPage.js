import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Header } from '../components/layout';
import { getPositions } from '../services/api';
import './RankingSelectPage.css';

function RankingSelectPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPositions();
  }, []);

  const loadPositions = async () => {
    try {
      setLoading(true);
      const data = await getPositions();
      setPositions(data);
    } catch (error) {
      console.error('Erro ao carregar cargos:', error);
      alert('Erro ao carregar cargos. Verifique se o backend está rodando.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPosition = (positionId) => {
    navigate(`/entrevistas/${positionId}`);
  };

  const handleViewAll = () => {
    navigate('/entrevistas/0');
  };

  return (
    <div className="ranking-select-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header 
        title="Selecionar Ranking"
        onMenuClick={() => setSidebarOpen(true)}
      />
      
      <div className="ranking-select-content">
        <div className="ranking-select-header">
          <h2 className="section-title">Escolha o cargo para ver o ranking</h2>
          <p className="section-subtitle">
            Selecione um cargo específico ou veja todos os candidatos
          </p>
        </div>

        <div className="positions-grid">
          {loading ? (
            <p style={{ padding: '2rem', textAlign: 'center' }}>Carregando cargos...</p>
          ) : (
            <>
              {/* Opção "Todos os candidatos" */}
              <div 
                className="position-card all-candidates"
                onClick={handleViewAll}
              >
                <div className="position-card-icon">📊</div>
                <h3 className="position-card-title">Todos os Candidatos</h3>
                <p className="position-card-description">
                  Ver ranking de todos os candidatos de todos os cargos
                </p>
              </div>

              {/* Cargos específicos */}
              {positions.map((position) => (
                <div 
                  key={position.id} 
                  className="position-card"
                  onClick={() => handleSelectPosition(position.id)}
                >
                  <div className="position-card-icon">💼</div>
                  <h3 className="position-card-title">{position.name}</h3>
                  <p className="position-card-description">{position.description}</p>
                  {position.vacancies > 0 && (
                    <div className="position-vacancies">
                      {position.vacancies} vaga{position.vacancies !== 1 ? 's' : ''} disponível{position.vacancies !== 1 ? 'eis' : ''}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default RankingSelectPage;

