import React from 'react';
import PlayIcon from '../../../components/icons/PlayIcon';
import VolumeIcon from '../../../components/icons/VolumeIcon';

const formatTime = (seconds) => {
  if (!seconds || Number.isNaN(seconds) || !Number.isFinite(seconds)) return '00:00';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// Player de áudio: marcação atual, incluindo o emoji de pausa (a troca de
// ícone fica para a fase de design). `player` é o retorno de useAudioPlayer.
function AudioPlayer({ player }) {
  const {
    audioRef, url, isPlaying, currentTime, duration, audioError,
    togglePlayPause, handleProgressClick, audioHandlers,
  } = player;
  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <audio
        ref={audioRef}
        src={url || undefined}
        preload="metadata"
        crossOrigin="anonymous"
        {...audioHandlers}
      />

      <div className="audio-player">
        {audioError && (
          <div className="audio-error-message">
            ⚠️ {audioError}
          </div>
        )}
        <div className="audio-progress-bar" onClick={handleProgressClick}>
          <div className="audio-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="player-controls">
          <span className="player-time">
            {formatTime(currentTime)} / {duration && Number.isFinite(duration) && duration > 0 ? formatTime(duration) : '∞'}
          </span>
          <div className="player-buttons">
            <button className="player-btn play-btn" onClick={togglePlayPause}>
              {isPlaying ? (
                <span style={{ fontSize: '20px' }}>⏸</span>
              ) : (
                <PlayIcon size={20} color="#1a1a1a" />
              )}
            </button>
          </div>
          <button className="volume-btn">
            <VolumeIcon size={20} color="#1a1a1a" />
          </button>
        </div>
      </div>
    </>
  );
}

export default AudioPlayer;
