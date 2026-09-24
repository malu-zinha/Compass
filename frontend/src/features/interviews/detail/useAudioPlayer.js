import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudioUrl } from '../../../api/interviews';

// Índice da fala que está tocando em `currentTimeMs` (timestamps da API em ms).
// Nos silêncios entre duas falas, continua na última que começou: o destaque
// não some no meio da conversa.
export function findActiveIndex(transcript, currentTimeMs) {
  if (!transcript || transcript.length === 0) return null;
  let active = null;
  for (let i = 0; i < transcript.length; i += 1) {
    if ((transcript[i].start_ms ?? 0) <= currentTimeMs) active = i;
    else break;
  }
  return active;
}

// Controla o elemento <audio>: busca a URL assinada, play/pause, seek,
// índice da mensagem ativa (para o auto-scroll da transcrição) e duração
// (com fallback para audio_duration_seconds quando o áudio ainda não
// reportou a própria duração).
export function useAudioPlayer(id, hasAudio, transcript, fallbackDuration, { onError } = {}) {
  const audioRef = useRef(null);
  const hasRetriedRef = useRef(false);
  const [url, setUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [activeMessageIndex, setActiveMessageIndex] = useState(null);
  const [audioError, setAudioError] = useState(null);
  const duration = mediaDuration || fallbackDuration || 0;

  const fetchUrl = useCallback(async () => {
    try {
      const data = await getAudioUrl(id);
      setUrl(data.url);
      setAudioError(null);
    } catch {
      setAudioError('Não foi possível carregar o áudio.');
    }
  }, [id]);

  useEffect(() => {
    if (!hasAudio) return;
    hasRetriedRef.current = false;
    fetchUrl();
  }, [id, hasAudio, fetchUrl]);

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || Number.isNaN(audio.currentTime)) return;
    setCurrentTime(audio.currentTime);
    setActiveMessageIndex(findActiveIndex(transcript, audio.currentTime * 1000));
  };

  const updateDuration = () => {
    const audio = audioRef.current;
    if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
      setMediaDuration(audio.duration);
    }
  };

  const handleLoadedMetadata = () => {
    // Carregou: um novo erro (ex.: link expirado depois de 1h) pode tentar de novo.
    hasRetriedRef.current = false;
    setAudioError(null);
    updateDuration();
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleError = () => {
    setIsPlaying(false);
    if (!hasRetriedRef.current) {
      hasRetriedRef.current = true;
      fetchUrl();
    } else {
      setAudioError('Não foi possível carregar o áudio.');
    }
  };

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (isPlaying) {
        audio.pause();
      } else {
        await audio.play();
      }
    } catch {
      onError?.('Não foi possível reproduzir o áudio.');
    }
  };

  // Pula para `seconds` (barra de progresso, timestamps da transcrição).
  const seek = (seconds) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds)) return;
    const target = Math.min(Math.max(seconds, 0), duration || seconds);
    audio.currentTime = target;
    setCurrentTime(target);
    setActiveMessageIndex(findActiveIndex(transcript, target * 1000));
  };

  return {
    audioRef,
    url,
    isPlaying,
    currentTime,
    duration,
    activeMessageIndex,
    audioError,
    togglePlayPause,
    seek,
    audioHandlers: {
      onTimeUpdate: handleTimeUpdate,
      onLoadedMetadata: handleLoadedMetadata,
      onDurationChange: updateDuration,
      onPlay: handlePlay,
      onPause: handlePause,
      onEnded: handleEnded,
      onError: handleError,
    },
  };
}
