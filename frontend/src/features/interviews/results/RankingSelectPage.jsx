import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/layout';
import { listPositions } from '../../../api/positions';
import './RankingSelectPage.css';
import { useToast } from '../../../components/ui';

function RankingSelectPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPositions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listPositions();
      setPositions(data.items);
    } catch (error) {
      console.error('Erro ao carregar cargos:', error);
      toast.error(error.detail || 'Erro ao carregar cargos. Verifique se o backend está rodando.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  const handleSelectPosition = (positionId) => {
    navigate(`/entrevistas/${positionId}`);
  };

  const handleViewAll = () => {
    navigate('/entrevistas');
  };

  return (
    <div className="ranking-select-page">
      <PageHeader title="Selecionar Ranking" />

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
