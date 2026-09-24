import { PauseIcon, PlayIcon } from '../../../components/icons';
import { Button } from '../../../components/ui';
import styles from './AudioPlayer.module.css';

export const formatTime = (seconds) => {
  if (!seconds || Number.isNaN(seconds) || !Number.isFinite(seconds)) return '00:00';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

/*
 * Player da gravação: botão nomeado (Reproduzir/Pausar) e barra de progresso
 * como <input type="range">, que dá seek por teclado (setas, Home/End) e
 * anuncia a posição. `player` é o retorno de useAudioPlayer.
 */
export default function AudioPlayer({ player }) {
  const { audioRef, url, isPlaying, currentTime, duration, audioError, togglePlayPause, seek, audioHandlers } = player;
  const known = duration && Number.isFinite(duration) && duration > 0;
  const progress = known ? (currentTime / duration) * 100 : 0;

  return (
    <div className={styles.player}>
      <audio ref={audioRef} src={url || undefined} preload="metadata" crossOrigin="anonymous" {...audioHandlers} />
      {audioError && <p className={styles.error} role="alert">{audioError}</p>}
      <div className={styles.controls}>
        <Button
          variant="primary"
          iconOnly
          icon={isPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
          aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
          onClick={togglePlayPause}
          className={styles.play}
        />
        <input
          type="range"
          className={styles.range}
          min={0}
          max={known ? duration : 0}
          step={1}
          value={Math.min(currentTime, known ? duration : 0)}
          onChange={(e) => seek(Number(e.target.value))}
          disabled={!known}
          aria-label="Posição da gravação"
          aria-valuetext={`${formatTime(currentTime)} de ${known ? formatTime(duration) : 'duração desconhecida'}`}
          style={{ '--progress': `${progress}%` }}
        />
        <span className={styles.time}>
          {formatTime(currentTime)} / {known ? formatTime(duration) : '∞'}
        </span>
      </div>
    </div>
  );
}
