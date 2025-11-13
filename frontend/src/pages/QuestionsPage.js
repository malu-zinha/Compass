import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Header } from '../components/layout';
import { getGlobalQuestions, createGlobalQuestion, deleteGlobalQuestion, getPositions } from '../services/api';
import styles from '../styles/questions.module.css';

export default function QuestionsPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Estado de seleção de tipo
  const [questionType, setQuestionType] = useState(null); // null, 'general', 'position'
  const [selectedPositionId, setSelectedPositionId] = useState(null);
  const [positions, setPositions] = useState([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  
  // Estado de perguntas
  const [perguntas, setPerguntas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  
  // Selection mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Carregar cargos quando selecionar tipo "position"
  useEffect(() => {
    if (questionType === 'position') {
      loadPositions();
    }
  }, [questionType]);

  // Carregar perguntas quando tipo ou cargo mudar
  useEffect(() => {
    if (questionType) {
      loadQuestions();
    }
  }, [questionType, selectedPositionId]);

  const loadPositions = async () => {
    setLoadingPositions(true);
    try {
      const data = await getPositions(1, 100);
      setPositions(data);
    } catch (error) {
      console.error('Erro ao carregar cargos:', error);
    } finally {
      setLoadingPositions(false);
    }
  };

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const positionId = questionType === 'position' ? selectedPositionId : null;
      const questions = await getGlobalQuestions(positionId);
      setPerguntas(questions.map(q => ({
        id: q.id,
        text: q.question
      })));
    } catch (error) {
      console.error('Erro ao carregar perguntas:', error);
      setPerguntas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFromInput = async () => {
    const t = newQuestionText.trim();
    if (!t) return;
    
    try {
      const positionId = questionType === 'position' ? selectedPositionId : null;
      await createGlobalQuestion(t, positionId);
      setNewQuestionText('');
      await loadQuestions(); // Recarregar perguntas
    } catch (error) {
      console.error('Erro ao criar pergunta:', error);
      alert('Erro ao criar pergunta. Verifique se o backend está rodando.');
    }
  };

  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelected(new Set());
      setSelectionMode(false);
    } else {
      setSelectionMode(true);
    }
  };

  const toggleSelect = (index) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const deleteSelected = () => {
    if (selected.size === 0) return;
    setDeleteConfirm(true);
  };

  const confirmDeleteSelected = async () => {
    try {
      const idsToDelete = Array.from(selected).map(i => perguntas[i].id);
      await Promise.all(idsToDelete.map(id => deleteGlobalQuestion(id)));
      setSelected(new Set());
      setSelectionMode(false);
      setDeleteConfirm(false);
      await loadQuestions(); // Recarregar perguntas
    } catch (error) {
      console.error('Erro ao deletar perguntas:', error);
      alert('Erro ao deletar perguntas. Verifique se o backend está rodando.');
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(false);
  };

  const handleDeleteQuestion = async (questionId) => {
    try {
      await deleteGlobalQuestion(questionId);
      await loadQuestions(); // Recarregar perguntas
    } catch (error) {
      console.error('Erro ao deletar pergunta:', error);
      alert('Erro ao deletar pergunta. Verifique se o backend está rodando.');
    }
  };

  // Tela de seleção de tipo
  if (!questionType) {
    return (
      <div className={styles.wrapper}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <Header 
          title="Perguntas"
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className={styles.main}>
          <div className={styles.contentCard}>
            <div className={styles.titleRow}>
              <h2 className={styles.title}>Selecione o tipo de perguntas</h2>
            </div>

            <section style={{ padding: '3rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <button
                onClick={() => setQuestionType('general')}
                style={{
                  padding: '2rem',
                  background: '#EDE9FF',
                  color: '#371C68',
                  border: '1px solid rgba(55, 28, 104, 0.1)',
                  borderRadius: '12px',
                  fontFamily: 'Coolvetica, sans-serif',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.target.style.background = '#ddd5ff'}
                onMouseLeave={(e) => e.target.style.background = '#EDE9FF'}
              >
                <div style={{ fontFamily: 'Coolvetica, sans-serif', fontWeight: 'normal', marginBottom: '0.5rem' }}>Perguntas Gerais</div>
                <div style={{ fontSize: '0.9rem', color: '#666', fontFamily: 'Inter, sans-serif' }}>
                  Perguntas usadas para todas as entrevistas
                </div>
              </button>

              <button
                onClick={() => setQuestionType('position')}
                style={{
                  padding: '2rem',
                  background: '#EDE9FF',
                  color: '#371C68',
                  border: '1px solid rgba(55, 28, 104, 0.1)',
                  borderRadius: '12px',
                  fontFamily: 'Coolvetica, sans-serif',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.target.style.background = '#ddd5ff'}
                onMouseLeave={(e) => e.target.style.background = '#EDE9FF'}
              >
                <div style={{ fontFamily: 'Coolvetica, sans-serif', fontWeight: 'normal', marginBottom: '0.5rem' }}>Perguntas por Cargo</div>
                <div style={{ fontSize: '0.9rem', color: '#666', fontFamily: 'Inter, sans-serif' }}>
                  Perguntas específicas para um cargo
                </div>
              </button>
            </section>
          </div>
        </main>
      </div>
    );
  }

  // Tela de seleção de cargo (se tipo for "position")
  if (questionType === 'position' && !selectedPositionId) {
    return (
      <div className={styles.wrapper}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <Header 
          title="Perguntas por Cargo"
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className={styles.main}>
          <div className={styles.contentCard}>
            <div className={styles.titleRow}>
              <h2 className={styles.title}>Selecione o cargo</h2>
              <button 
                onClick={() => setQuestionType(null)}
                style={{
                  padding: '0.65rem 1.25rem',
                  background: 'transparent',
                  color: '#371C68',
                  border: '1px solid rgba(55, 28, 104, 0.2)',
                  borderRadius: '8px',
                  fontFamily: 'Coolvetica, sans-serif',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Voltar
              </button>
            </div>

            <section style={{ padding: '2rem' }}>
              {loadingPositions ? (
                <p style={{ fontFamily: 'Inter, sans-serif', textAlign: 'center', color: '#666' }}>
                  Carregando cargos...
                </p>
              ) : positions.length === 0 ? (
                <p style={{ fontFamily: 'Inter, sans-serif', textAlign: 'center', color: '#666' }}>
                  Nenhum cargo cadastrado
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {positions.map((pos) => (
                    <button
                      key={pos.id}
                      onClick={() => setSelectedPositionId(pos.id)}
                      style={{
                        padding: '1.5rem',
                        background: '#EDE9FF',
                        color: '#371C68',
                        border: '1px solid rgba(55, 28, 104, 0.1)',
                        borderRadius: '10px',
                        fontFamily: 'Coolvetica, sans-serif',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#ddd5ff'}
                      onMouseLeave={(e) => e.target.style.background = '#EDE9FF'}
                    >
                      {pos.name}
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    );
  }

  // Tela principal de perguntas
  const selectedPosition = positions.find(p => p.id === selectedPositionId);
  const pageTitle = questionType === 'general' 
    ? 'Perguntas Gerais' 
    : `Perguntas - ${selectedPosition?.name || 'Cargo'}`;

  return (
    <div className={styles.wrapper}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header 
        title={pageTitle}
        onMenuClick={() => setSidebarOpen(true)}
      />

      <main className={styles.main}>
        <div className={styles.contentCard}>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>Lista de perguntas</h2>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button 
                onClick={() => {
                  setQuestionType(null);
                  setSelectedPositionId(null);
                  setPerguntas([]);
                }}
                style={{
                  padding: '0.65rem 1.25rem',
                  background: 'transparent',
                  color: '#371C68',
                  border: '1px solid rgba(55, 28, 104, 0.2)',
                  borderRadius: '8px',
                  fontFamily: 'Coolvetica, sans-serif',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Trocar tipo
              </button>
            </div>
          </div>

          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(0, 0, 0, 0.08)', display: 'flex', gap: '0.75rem' }}>
            <input
              type="text"
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddFromInput()}
              placeholder="Digite uma nova pergunta e pressione Enter"
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '1px solid rgba(55, 28, 104, 0.2)',
                borderRadius: '6px',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
            <button 
              className={styles.addQuestionBtn} 
              onClick={handleAddFromInput}
              aria-label="Adiciona pergunta"
            >
              + Adicionar
            </button>
          </div>

          <section className={styles.board}>
            {loading ? (
              <p style={{ 
                fontFamily: 'Inter, sans-serif', 
                textAlign: 'center', 
                color: '#666', 
                fontSize: '1rem',
                padding: '3rem 1rem'
              }}>
                Carregando perguntas...
              </p>
            ) : perguntas.length === 0 ? (
              <p style={{ 
                fontFamily: 'Inter, sans-serif', 
                textAlign: 'center', 
                color: '#666', 
                fontSize: '1rem',
                padding: '3rem 1rem'
              }}>
                Nenhuma pergunta cadastrada
              </p>
            ) : (
              <ul className={styles.grid}>
                {perguntas.map((q, i) => (
                  <li
                    key={q.id}
                    className={`${styles.card} ${selectionMode && selected.has(i) ? styles.selected : ''}`}
                    onClick={() => selectionMode && toggleSelect(i)}
                  >
                    <div className={styles.cardTitle}>{q.text}</div>
                    <button
                      className={styles.removeX}
                      aria-label={`Remover ${q.text}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteQuestion(q.id);
                      }}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
