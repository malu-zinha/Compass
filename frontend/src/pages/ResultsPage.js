import React, { useState, useEffect } from 'react';

function ResultsPage() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/interviews');
      
      if (!response.ok) {
        throw new Error('Erro ao buscar entrevistas');
      }

      const data = await response.json();
      setInterviews(data.interviews || []);
    } catch (error) {
      setError(`Erro ao carregar resultados: ${error.message}`);
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setSelectedId(selectedId === id ? null : id);
  };

  const deleteInterview = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar esta entrevista?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/interviews/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao deletar entrevista');
      }

      // Atualizar lista
      await fetchInterviews();
      setSelectedId(null);
    } catch (error) {
      alert(`Erro ao deletar: ${error.message}`);
      console.error('Erro:', error);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="results-page">
        <div className="loading">
          ⏳ Carregando resultados...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-page">
        <div className="error">
          ❌ {error}
        </div>
        <button 
          className="send-button"
          onClick={fetchInterviews}
          style={{ marginTop: '1rem' }}
        >
          🔄 Tentar Novamente
        </button>
      </div>
    );
  }

  if (interviews.length === 0) {
    return (
      <div className="results-page">
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <h3>Nenhuma entrevista encontrada</h3>
          <p>Vá para a página de gravação para criar sua primeira entrevista!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="results-page">
      <h2>📋 Resultados das Entrevistas</h2>
      
      <div className="interview-list">
        {interviews.map((interview) => (
          <div 
            key={interview.id}
            className={`interview-card ${selectedId === interview.id ? 'selected' : ''}`}
          >
            <div className="interview-date">
              📅 {formatDate(interview.date)}
            </div>
            
            <div className="interview-preview">
              <strong>ID:</strong> {interview.id}
              {interview.summary && (
                <span> • ✅ Processado</span>
              )}
              {!interview.summary && (
                <span> • ⏳ Processando...</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="expand-button"
                onClick={() => toggleExpand(interview.id)}
              >
                {selectedId === interview.id ? '▲ Ocultar' : '▼ Ver Detalhes'}
              </button>
              <button 
                className="expand-button"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteInterview(interview.id);
                }}
                style={{ background: '#dc2626' }}
              >
                🗑️ Deletar
              </button>
            </div>

            {selectedId === interview.id && (
              <div className="interview-details">
                
                {/* Transcrição */}
                <div className="detail-section">
                  <h3>📝 Transcrição</h3>
                  {interview.transcription ? (
                    <div className="transcription">
                      {interview.transcription}
                    </div>
                  ) : (
                    <p style={{ color: '#666' }}>Transcrição não disponível</p>
                  )}
                </div>

                {/* Resumo */}
                <div className="detail-section">
                  <h3>✨ Resumo Padrão</h3>
                  {interview.summary ? (
                    <div className="summary">
                      {interview.summary}
                    </div>
                  ) : (
                    <p style={{ color: '#666' }}>Resumo não disponível</p>
                  )}
                </div>

              </div>
            )}
          </div>
        ))}
      </div>

      <button 
        className="send-button"
        onClick={fetchInterviews}
        style={{ marginTop: '2rem' }}
      >
        🔄 Atualizar Lista
      </button>
    </div>
  );
}

export default ResultsPage;

