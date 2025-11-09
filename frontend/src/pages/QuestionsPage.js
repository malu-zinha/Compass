import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from '../styles/questions.module.css';

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
  // perguntas list remains static here per user request

  const handleClose = () => {
    navigate(-1);
  };

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className={styles.leftActions}>
          <Link to="/" className={styles.newInterview}>
            <span className={styles.reportSticker} aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M9 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" stroke="#371C68" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 7h6M9 11h6" stroke="#371C68" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <strong>Nova entrevista</strong>
          </Link>
          <button onClick={adicionarPergunta} className={styles.plusButton} aria-label="Adicionar pergunta">
            <span className={styles.plusSticker} aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M12 5v14" stroke="#065f46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 12h14" stroke="#065f46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </button>
        </div>
        <button className={styles.closeX} onClick={handleClose} aria-label="Fechar">×</button>
      </header>

      <main className={styles.main}>
        <div className={styles.contentCard}>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>Lista de perguntas</h2>
          </div>

          <section className={styles.board}>
            <ul className={styles.grid}>
              {perguntas.map((q, i) => (
                <li key={i} className={styles.card}>
                  <div className={styles.cardTitle}>{q}</div>
                  <input className={styles.cardInput} placeholder={`Digite o conteúdo da ${q.toLowerCase()}`} />
                </li>
              ))}
            </ul>

            <div className={styles.footer} />
          </section>
        </div>
      </main>
    </div>
  );
}
