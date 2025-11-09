import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from '../styles/questions.module.css';
import { ReactComponent as PlusIcon } from '../assets/icons/square-plus.svg';
import { ReactComponent as TrashIcon } from '../assets/icons/trash.svg';
import { ReactComponent as FileTextIcon } from '../assets/icons/file-text.svg';
import { ReactComponent as Icon15 } from '../assets/icons/image 15.svg';

export default function QuestionsPage() {
  const navigate = useNavigate();
  const [perguntas, setPerguntas] = useState([
    'Pergunta 1',
    'Pergunta 2',
    'Pergunta 3',
    'Pergunta 4',
    'Pergunta 5',
    'Pergunta 6',
  ]);
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

  const handleClose = () => {
    navigate(-1);
  };

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className={styles.rightBrand}>
          <span className={styles.brandTitle}>Compass <span className={styles.icon} aria-hidden="true"><Icon15 className={styles.iconSvg} aria-hidden="true"/></span></span>
        </div>

        <div className={styles.headerTitle}>
          <div className={styles.title}>Perguntas</div>
        </div>

        <div className={styles.headerActions}>
          <Link to="/" className={styles.newInterview}>
            <span className={styles.reportSticker} aria-hidden="true">
              <FileTextIcon aria-hidden="true" />
            </span>
            <strong>Nova entrevista</strong>
          </Link>

          {selectionMode && (
            <>
              <button className={styles.deleteSelected} onClick={deleteSelected} disabled={selected.size === 0} aria-label="Excluir selecionadas">Excluir ({selected.size})</button>
              <button className={styles.cancelSelection} onClick={toggleSelectionMode} aria-label="Cancelar seleção">Cancelar</button>
            </>
          )}

          <button className={styles.closeX} onClick={handleClose} aria-label="Fechar">×</button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.contentCard}>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>Lista de perguntas</h2>
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

            <div className={styles.footer}>
              <button className={styles.addQuestionBtn} onClick={adicionarPergunta} aria-label="Adiciona pergunta">Adiciona pergunta</button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
