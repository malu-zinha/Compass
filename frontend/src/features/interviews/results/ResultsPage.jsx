import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../../components/layout';
import CalendarIcon from '../../../components/icons/CalendarIcon';
import ClockIcon from '../../../components/icons/ClockIcon';
import { listInterviews } from '../../../api/interviews';
import { getPosition } from '../../../api/positions';
import { useUserSettings } from '../../../auth/SettingsContext';
import { formatDate, formatDuration, scoreToPercent } from '../../../lib/format';
import { PROCESSING_STATUSES } from '../../../lib/transcript';
import './ResultsPage.css';
import { Button, useToast } from '../../../components/ui';
import { CompareIcon } from '../../../components/icons';

const PER_PAGE = 20;
const RANKING_SIZE = 5;
const MAX_COMPARE = 3;
const PENDING_STATUSES = ['draft', ...PROCESSING_STATUSES];

// Pontos positivos/negativos só existem com a análise concluída.
function cardPoints(interview, key) {
  if (interview.status === 'done') return interview[key] || [];
  if (interview.status === 'error') return ['Falha no processamento'];
  if (PENDING_STATUSES.includes(interview.status)) return ['Aguardando análise'];
  return [];
}

function toCard(interview, settings) {
  return {
    id: interview.id,
    positionId: interview.position_id,
    status: interview.status,
    name: interview.candidate_name,
    email: interview.candidate_email,
    date: formatDate(interview.created_at, settings),
    duration: formatDuration(interview.audio_duration_seconds),
    match: scoreToPercent(interview.score),
    positives: cardPoints(interview, 'positives'),
    negatives: cardPoints(interview, 'negatives'),
  };
}

function ResultsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { positionId } = useParams();
  const { settings } = useUserSettings();
  const positionFilter = positionId ? Number(positionId) : undefined;
  const [position, setPosition] = useState(null);
  const [list, setList] = useState({ items: [], page: 1, pages: 1 });
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setSelecting(false);
    setSelected([]);
    Promise.all([
      listInterviews({ positionId: positionFilter, sort: '-created_at', page: 1, perPage: PER_PAGE }),
      listInterviews({ positionId: positionFilter, status: 'done', sort: '-score', perPage: RANKING_SIZE }),
    ])
      .then(([firstPage, top]) => {
        if (!active) return;
        setList({ items: firstPage.items, page: firstPage.page, pages: firstPage.pages });
        setRanking(top.items);
      })
      .catch((error) => {
        if (!active) return;
        console.error('Erro ao carregar entrevistas:', error);
        toast.error(error.detail || 'Erro ao carregar entrevistas. Verifique se o backend está rodando.');
        setList({ items: [], page: 1, pages: 1 });
        setRanking([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [positionFilter, toast]);

  useEffect(() => {
    if (!positionFilter) return undefined;
    let active = true;
    getPosition(positionFilter)
      .then((data) => {
        if (active) setPosition(data);
      })
      .catch((error) => {
        // Não bloqueia a página: sem o cargo, o título volta ao padrão.
        console.error('Erro ao carregar cargo:', error);
      });
    return () => { active = false; };
  }, [positionFilter, toast]);

  const selectedPosition = positionFilter && position?.id === positionFilter ? position : null;

  const handleLoadMore = async () => {
    try {
      setLoadingMore(true);
      const next = await listInterviews({
        positionId: positionFilter, sort: '-created_at', page: list.page + 1, perPage: PER_PAGE,
      });
      setList((prev) => {
        // Entrevistas criadas entre uma página e outra deslocam a lista; evita repetir cartões.
        const known = new Set(prev.items.map((item) => item.id));
        const items = [...prev.items, ...next.items.filter((item) => !known.has(item.id))];
        return { items, page: next.page, pages: next.pages };
      });
    } catch (error) {
      console.error('Erro ao carregar mais entrevistas:', error);
      toast.error(error.detail || 'Erro ao carregar mais entrevistas. Tente novamente.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleToggleSelecting = () => {
    setSelecting((prev) => !prev);
    setSelected([]);
  };

  const isSelected = (card) => selected.some((item) => item.id === card.id);

  // Até 3 entrevistas, todas do mesmo cargo da primeira escolhida.
  const canSelect = (card) => {
    if (isSelected(card)) return true;
    if (selected.length >= MAX_COMPARE) return false;
    return selected.length === 0 || selected[0].positionId === card.positionId;
  };

  const handleToggleSelected = (card) => {
    setSelected((prev) => (prev.some((item) => item.id === card.id)
      ? prev.filter((item) => item.id !== card.id)
      : [...prev, { id: card.id, positionId: card.positionId }]));
  };

  const handleCompareSelected = () => {
    navigate(`/comparar?ids=${selected.map((item) => item.id).join(',')}`);
  };

  const handleViewDetails = (id) => {
    navigate(`/entrevista/${id}`);
  };

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  const cards = list.items.map((interview) => toCard(interview, settings));
  const rankedCards = ranking.map((interview) => toCard(interview, settings));

  return (
    <div className="results-page">
      <PageHeader
        title={selectedPosition ? `Ranking - ${selectedPosition.name}` : "Análise de candidatos"}
        actions={
          <Button
            variant={selecting ? 'ghost' : 'secondary'}
            icon={<CompareIcon size={16} />}
            onClick={handleToggleSelecting}
          >
            {selecting ? 'Cancelar' : 'Comparar'}
          </Button>
        }
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
            {selecting && selected.length >= 2 && (
              <button className="btn-ver-detalhes" onClick={handleCompareSelected}>
                Comparar selecionados ({selected.length})
              </button>
            )}

            {cards.length === 0 ? (
              <div className="empty-message">
                <p>Nenhuma entrevista realizada</p>
              </div>
            ) : (
              cards.map((interview) => (
                <div key={interview.id} className="interview-card">
                  <div className="card-header">
                    {selecting && interview.status === 'done' && (
                      <input
                        type="checkbox"
                        aria-label={`Selecionar ${interview.name}`}
                        checked={isSelected(interview)}
                        disabled={!canSelect(interview)}
                        onChange={() => handleToggleSelected(interview)}
                      />
                    )}
                    <h3 className="card-title">{interview.name}</h3>
                    <span className="card-email">{interview.email}</span>
                  </div>
                  
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
              ))
            )}

            {list.page < list.pages && (
              <button className="btn-ver-detalhes" onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? 'Carregando...' : 'Carregar mais'}
              </button>
            )}
          </div>
        </div>

        {/* Coluna Direita - Ranking */}
        <div className="ranking-section">
          <h2 className="section-title">Ranking</h2>
          
          <div className="ranking-list">
            {rankedCards.length === 0 ? (
              <div className="empty-message">
                <p>Nenhum candidato disponível</p>
              </div>
            ) : (
              rankedCards.map((interview, index) => (
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
                      <CalendarIcon size={16} />
                      <span>{interview.date}</span>
                    </span>
                    <span className="ranking-meta-item">
                      <ClockIcon size={16} />
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
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResultsPage;
