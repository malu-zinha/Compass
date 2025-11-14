import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sidebar, Header } from '../components/layout';
import CalendarIcon from '../components/icons/CalendarIcon';
import ClockIcon from '../components/icons/ClockIcon';
import { getInterviews, getPositions, getAudioUrl } from '../services/api';
import './ResultsPage.css';

function ResultsPage() {
  const navigate = useNavigate();
  const { positionId } = useParams();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [audioDurations, setAudioDurations] = useState({});
  const audioRefs = useRef({});

  useEffect(() => {
    loadInterviews();
    if (positionId && positionId !== '0') {
      loadPositionName();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionId]);

  // Carregar durações dos áudios quando interviews mudarem
  useEffect(() => {
    interviews.forEach(interview => {
      if (interview.hasAudio && !audioDurations[interview.id] && !audioRefs.current[interview.id]) {
        const audio = new Audio();
        audio.preload = 'metadata';
        audio.src = getAudioUrl(interview.id);
        
        const handleLoadedMetadata = () => {
          if (audio.duration && isFinite(audio.duration)) {
            setAudioDurations(prev => ({
              ...prev,
              [interview.id]: audio.duration
            }));
          }
        };
        
        const handleError = () => {
          console.error(`Erro ao carregar áudio da entrevista ${interview.id}`);
        };
        
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('error', handleError);
        
        audioRefs.current[interview.id] = audio;
      }
    });
    
    // Cleanup: remover listeners quando componente desmontar
    return () => {
      Object.entries(audioRefs.current).forEach(([id, audio]) => {
        if (audio) {
          audio.removeEventListener('loadedmetadata', () => {});
          audio.removeEventListener('error', () => {});
        }
      });
    };
  }, [interviews]);

  // Atualizar durações quando audioDurations mudar
  useEffect(() => {
    if (Object.keys(audioDurations).length > 0) {
      setInterviews(prevInterviews => {
        return prevInterviews.map(interview => {
          const audioDuration = audioDurations[interview.id];
          if (audioDuration) {
            const formatDuration = (seconds) => {
              if (!seconds || isNaN(seconds)) return 'N/A';
              
              const hours = Math.floor(seconds / 3600);
              const mins = Math.floor((seconds % 3600) / 60);
              const secs = Math.floor(seconds % 60);
              
              if (hours > 0) {
                return `${hours}h ${mins}m`;
              } else if (mins > 0) {
                return `${mins}m ${secs}s`;
              } else {
                return `${secs}s`;
              }
            };
            
            return {
              ...interview,
              duration: formatDuration(audioDuration)
            };
          }
          return interview;
        });
      });
    }
  }, [audioDurations]);

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
      console.log(`[DEBUG] Carregando entrevistas para positionId: ${positionIdNum}`);
      const data = await getInterviews(positionIdNum);
      console.log(`[DEBUG] Entrevistas carregadas: ${data?.length || 0}`);
      
      // Função para calcular duração do áudio a partir do transcript
      const calculateDuration = (transcript) => {
        if (!transcript) return null;
        
        try {
          let transcriptData = transcript;
          if (typeof transcript === 'string') {
            transcriptData = JSON.parse(transcript);
          }
          
          // Verificar se tem utterances com timestamps
          let utterances = [];
          if (transcriptData.utterances && Array.isArray(transcriptData.utterances)) {
            utterances = transcriptData.utterances;
          } else if (Array.isArray(transcriptData)) {
            utterances = transcriptData;
          }
          
          if (utterances.length > 0) {
            // Pegar o maior timestamp 'end' de todas as utterances
            const maxEnd = Math.max(...utterances.map(u => u.end || 0));
            
            // AssemblyAI retorna timestamps em milissegundos
            // Sempre converter dividindo por 1000
            // Se o valor for muito pequeno (< 1), pode já estar em segundos
            if (maxEnd < 1) {
              return maxEnd; // Já está em segundos
            }
            return maxEnd / 1000; // Converter de ms para segundos
          }
        } catch (e) {
          console.error('Erro ao calcular duração:', e);
        }
        
        return null;
      };
      
      // Função para formatar duração
      const formatDuration = (seconds) => {
        if (!seconds || isNaN(seconds)) return 'N/A';
        
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
          return `${hours}h ${mins}m`;
        } else if (mins > 0) {
          return `${mins}m ${secs}s`;
        } else {
          return `${secs}s`;
        }
      };
      
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
        
        // Usar duração do áudio se disponível, senão calcular do transcript
        const audioDuration = audioDurations[interview.id];
        const durationSeconds = audioDuration || calculateDuration(interview.transcript);
        const formattedDuration = formatDuration(durationSeconds);
        
        return {
          id: interview.id,
          name: interview.name || 'Candidato sem nome',
          email: interview.email || '',
          date: interview.date ? new Date(interview.date).toLocaleDateString('pt-BR') : 'Data não disponível',
          duration: formattedDuration,
          match: scorePercentage, // Agora é porcentagem (0-100%)
          positives: analysis?.positives || ['Aguardando análise'], // CORRIGIDO: era strengths
          negatives: analysis?.negatives || ['Aguardando análise'], // CORRIGIDO: era weaknesses
          position: interview.position,
          hasAudio: !!interview.audio_file
        };
      });
      
      setInterviews(formattedInterviews);
    } catch (error) {
      console.error('Erro ao carregar entrevistas:', error);
      // Mostra mensagem de erro mais clara
      alert(`Erro ao carregar entrevistas: ${error.message}\n\nVerifique se o backend está rodando.`);
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
            {interviews.length === 0 ? (
              <div className="empty-message">
                <p>Nenhuma entrevista realizada</p>
              </div>
            ) : (
              interviews.map((interview) => (
                <div key={interview.id} className="interview-card">
                  <div className="card-header">
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
          </div>
        </div>

        {/* Coluna Direita - Ranking */}
        <div className="ranking-section">
          <h2 className="section-title">Ranking</h2>
          
          <div className="ranking-list">
            {rankedInterviews.length === 0 ? (
              <div className="empty-message">
                <p>Nenhum candidato disponível</p>
              </div>
            ) : (
              rankedInterviews.slice(0, 5).map((interview, index) => (
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
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResultsPage;
