import { useEffect, useRef } from 'react';
import styles from './RecordPage.module.css';

/* Transcrição ao vivo: texto corrido, trechos provisórios esmaecidos, rolagem acompanha o fim. */
export default function TranscriptPanel({ turns }) {
  const contentRef = useRef(null);

  useEffect(() => {
    if (contentRef.current && turns.length > 0) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [turns]);

  return (
    <div className={styles.transcript} ref={contentRef} aria-live="polite" aria-atomic="false">
      {turns.length === 0 ? (
        <p className={styles.transcriptEmpty}>Aguardando transcrição em tempo real...</p>
      ) : (
        <p className={styles.transcriptText}>
          {turns.map((turn, index) => {
            const typing = !turn.is_final && index === turns.length - 1;
            return (
              <span key={`${turn.generation}-${turn.turn_id}`} className={turn.is_final ? undefined : styles.interim}>
                {turn.text}
                {typing && <span className={styles.typing} aria-hidden="true">…</span>}{' '}
              </span>
            );
          })}
        </p>
      )}
    </div>
  );
}
