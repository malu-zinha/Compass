import { useEffect, useRef } from 'react';
import { Spinner } from '../../../components/ui';
import { speakerLabel } from '../../../lib/transcript';
import { formatTime } from './AudioPlayer';
import styles from './TranscriptView.module.css';

/*
 * Transcrição em conversa: entrevistador à direita, candidato à esquerda. A
 * fala que está tocando fica destacada e volta ao centro da rolagem; com
 * áudio, o horário de cada fala é um botão que pula para ela.
 */
export default function TranscriptView({ transcript, speakerRoles, activeMessageIndex, statusMessage, onSeek }) {
  const containerRef = useRef(null);
  const messageRefs = useRef({});

  useEffect(() => {
    if (activeMessageIndex === null || activeMessageIndex === undefined) return;
    const el = messageRefs.current[activeMessageIndex];
    const container = containerRef.current;
    if (!el || !container) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < container.scrollTop || bottom > container.scrollTop + container.clientHeight) {
      const target = top - container.clientHeight / 2 + el.offsetHeight / 2;
      container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    }
  }, [activeMessageIndex]);

  if (!transcript || transcript.length === 0) {
    return (
      <div className={styles.empty}>
        {statusMessage && <Spinner label={statusMessage} />}
        <p>{statusMessage || 'Nenhuma informação coletada'}</p>
      </div>
    );
  }

  return (
    <ol className={styles.transcript} ref={containerRef}>
      {transcript.map((message, idx) => {
        const label = speakerLabel(message.speaker, speakerRoles || []);
        const mine = label === 'Entrevistador';
        const active = activeMessageIndex === idx;
        const start = (message.start_ms ?? 0) / 1000;
        return (
          <li
            key={idx}
            ref={(el) => { messageRefs.current[idx] = el; }}
            className={`${styles.message} ${mine ? styles.right : styles.left} ${active ? styles.active : ''}`}
            aria-current={active ? 'true' : undefined}
          >
            <div className={styles.meta}>
              <span className={styles.speaker}>{label}</span>
              {onSeek ? (
                <button type="button" className={styles.time} onClick={() => onSeek(start)} aria-label={`Ouvir a partir de ${formatTime(start)}`}>
                  {formatTime(start)}
                </button>
              ) : (
                <span className={styles.time}>{formatTime(start)}</span>
              )}
            </div>
            <p className={styles.bubble}>{message.text}</p>
          </li>
        );
      })}
    </ol>
  );
}
