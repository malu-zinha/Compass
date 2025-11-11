import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import styles from '../styles/questions.module.css';

export default function QuestionsPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [perguntas, setPerguntas] = useState([
    'Pergunta 1',
    'Pergunta 2',
    'Pergunta 3',
    'Pergunta 4',
    'Pergunta 5',
    'Pergunta 6',
  ]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const adicionarPergunta = () => {
    const novaPergunta = `Pergunta ${perguntas.length + 1}`;
    setPerguntas((p) => [...p, novaPergunta]);
  };
  // selection mode state (allows selecting multiple questions to delete)
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState(false);

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

  const handleAddFromInput = () => {
    const t = newQuestionText.trim();
    if (!t) return;
    setPerguntas((p) => [...p, t]);
    setNewQuestionText('');
  };

  const deleteSelected = () => {
    if (selected.size === 0) return;
    // show confirmation anchored at the trash area
    setDeleteConfirm(true);
  };

  const confirmDeleteSelected = () => {
    setPerguntas((prev) => prev.filter((_, i) => !selected.has(i)));
    setSelected(new Set());
    setSelectionMode(false);
    setDeleteConfirm(false);
  };

  const cancelDelete = () => {
    setDeleteConfirm(false);
  };

  const handleTitleTrashClick = (e) => {
    e.stopPropagation();
    // if already in selection mode and something selected -> delete
    if (selectionMode) {
      if (selected.size > 0) deleteSelected();
      else setSelectionMode(false);
    } else {
      setSelectionMode(true);
    }
  };

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
            <h2 className={styles.title}>Lista de perguntas</h2>
            <button className={styles.addQuestionBtn} onClick={adicionarPergunta} aria-label="Adiciona pergunta">
              + Adicionar pergunta
            </button>
          </div>

          <section className={styles.board}>
            <ul className={styles.grid}>
              {perguntas.map((q, i) => (
                <li
                  key={i}
                  className={`${styles.card} ${selectionMode && selected.has(i) ? styles.selected : ''}`}
                  onClick={() => selectionMode && toggleSelect(i)}
                >
                  <div className={styles.cardTitle}>{q}</div>
                  <input className={styles.cardInput} placeholder={`Digite o conteúdo da ${q.toLowerCase()}`} />
                  <button
                    className={styles.removeX}
                    aria-label={`Remover ${q}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPerguntas((p) => p.filter((_, idx) => idx !== i));
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
