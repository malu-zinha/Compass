import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Sidebar, Header } from '../components/layout';
import { InfoModal } from '../components/common';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import ChevronRightIcon from '../components/icons/ChevronRightIcon';
import PlayIcon from '../components/icons/PlayIcon';
import PauseIcon from '../components/icons/PauseIcon';
import VolumeIcon from '../components/icons/VolumeIcon';
import { getInterviews, getAudioUrl } from '../services/api';
import './InterviewDetailPage.css';

function InterviewDetailPage() {
  const { id } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    habilidades: true,
    historico: false,
    positivos: false,
    negativos: false,
    especificas: false,
    anotacoes: false
  });
  
  // Audio player state
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  
  const [interviewData, setInterviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadInterviewData();
  }, [id]);

  // Polling effect - verifica se precisa recarregar dados
  useEffect(() => {
    if (!interviewData) return;
    
    // Verificar se análise foi gerada - verificar campos específicos que indicam análise completa
    const rawAnalysis = interviewData.rawInterview?.analysis;
    const parsedAnalysis = interviewData.analysis;
    
    // Verificar se existe análise raw (string JSON) ou parseada (objeto)
    const hasRawAnalysis = rawAnalysis && (
      (typeof rawAnalysis === 'string' && rawAnalysis.trim().length > 0 && rawAnalysis.trim() !== '{}') ||
      (typeof rawAnalysis === 'object' && rawAnalysis !== null && Object.keys(rawAnalysis).length > 0)
    );
    
    // Verificar se análise parseada tem conteúdo válido (não é objeto vazio)
    const hasParsedAnalysis = parsedAnalysis && 
                              typeof parsedAnalysis === 'object' && 
                              parsedAnalysis !== null &&
                              (parsedAnalysis.summary || 
                               parsedAnalysis.positives || 
                               parsedAnalysis.negatives ||
                               parsedAnalysis.score ||
                               Object.keys(parsedAnalysis).length > 0);
    
    const hasAnalysis = hasRawAnalysis || hasParsedAnalysis;
    
    // Debug log
    if (!hasAnalysis) {
      console.log('DEBUG: Análise não encontrada', {
        hasRawAnalysis,
        hasParsedAnalysis,
        rawAnalysis: rawAnalysis ? (typeof rawAnalysis === 'string' ? rawAnalysis.substring(0, 50) : 'object') : null,
        parsedAnalysisKeys: parsedAnalysis ? Object.keys(parsedAnalysis) : null
      });
    }
    
    // Verificar se transcrição existe
    const hasTranscript = interviewData.transcription && interviewData.transcription.length > 0;
    
    const needsProcessing = !hasAnalysis || !hasTranscript;
    
    setIsProcessing(needsProcessing);
    
    if (needsProcessing) {
      const interval = setInterval(() => {
        console.log('Recarregando dados da entrevista...');
        loadInterviewData();
      }, 3000);
      
      // Timeout máximo de 5 minutos para evitar polling infinito
      const timeout = setTimeout(() => {
        console.log('Timeout: parando polling após 5 minutos');
        clearInterval(interval);
        setIsProcessing(false);
      }, 300000);
      
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [interviewData]);

  // Audio player effects - só roda quando tem áudio e o elemento está montado
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !interviewData?.hasAudio) return;

    const updateTime = () => {
      if (audio && !isNaN(audio.currentTime)) {
        setCurrentTime(audio.currentTime);
      }
    };
    
    const updateDuration = () => {
      if (audio && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = (e) => {
      console.error('Audio error:', e);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    // Tentar carregar metadata
    audio.load();

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  }, [interviewData?.hasAudio]);

  const loadInterviewData = async () => {
    try {
      setLoading(true);
      const interviews = await getInterviews();
      const interview = interviews.find(i => i.id === parseInt(id));
      
      if (!interview) {
        alert('Entrevista não encontrada');
        return;
      }

      console.log('Interview raw data:', interview);

      // Parse analysis (é string JSON no backend)
      let analysis = {};
      if (interview.analysis) {
        if (typeof interview.analysis === 'string' && interview.analysis.trim().length > 0) {
          try {
            analysis = JSON.parse(interview.analysis);
            if (!analysis || typeof analysis !== 'object') {
              console.warn('Análise parseada não é um objeto válido:', analysis);
              analysis = {};
            }
          } catch (e) {
            console.error('Erro ao parsear análise:', e, 'Raw analysis:', interview.analysis.substring(0, 100));
            analysis = {};
          }
        } else if (typeof interview.analysis === 'object' && interview.analysis !== null) {
          analysis = interview.analysis;
        }
      }

      // Parse transcript (é string JSON no backend)
      let transcript = [];
      if (interview.transcript && typeof interview.transcript === 'string') {
        try {
          transcript = JSON.parse(interview.transcript);
        } catch (e) {
          console.error('Erro ao parsear transcrição:', e);
        }
      } else if (Array.isArray(interview.transcript)) {
        transcript = interview.transcript;
      }

      console.log('=== DEBUG: Dados recebidos do backend ===');
      console.log('Interview completo:', interview);
      console.log('Analysis (raw):', interview.analysis);
      console.log('Notes (raw):', interview.notes);
      console.log('Parsed analysis:', analysis);
      console.log('Analysis keys:', Object.keys(analysis));
      console.log('Analysis.positives:', analysis.positives);
      console.log('Analysis.negatives:', analysis.negatives);
      console.log('Analysis.summary:', analysis.summary);
      console.log('Parsed transcript:', transcript);

      // Map speakers usando identity da análise
      const identity = analysis.identity || {};
      const transcriptionWithLabels = transcript.map(item => {
        const speaker = item.speaker?.toUpperCase();
        let label = 'Pessoa 1';
        
        if (identity.A && identity.B) {
          if (speaker === 'A') {
            label = identity.A === 'interviewer' ? 'Entrevistador' : 'Candidato';
          } else if (speaker === 'B') {
            label = identity.B === 'interviewer' ? 'Entrevistador' : 'Candidato';
          }
        } else {
          // Fallback se não tem identity
          label = speaker === 'A' ? 'Pessoa 1' : 'Pessoa 2';
        }

        return {
          ...item,
          speakerLabel: label
        };
      });
      
      // CORRIGIDO: Backend retorna "positives" e "negatives", não "strengths" e "weaknesses"
      // CORRIGIDO: Não existe "cultural_fit" no prompt, usar summary ou criar campo específico
      setInterviewData({
        rawInterview: interview,
        candidate: {
          candidateName: interview.name || 'Candidato sem nome',
          candidateEmail: interview.email || '',
          candidatePhone: interview.number || ''
        },
        date: interview.date ? new Date(interview.date).toLocaleDateString('pt-BR') : 'Data não disponível',
        position: interview.position || 'Cargo não especificado',
        skills: analysis.skills || [],
        history: analysis.experiences || [],
        positives: analysis.positives || [], // CORRIGIDO: era analysis.strengths
        negatives: analysis.negatives || [], // CORRIGIDO: era analysis.weaknesses
        specific: analysis.summary ? analysis.summary.substring(0, 200) + '...' : 'Sem informações específicas', // Usar summary já que não tem cultural_fit
        notes: interview.notes || '',
        transcription: transcriptionWithLabels,
        score: interview.score || 0,
        summary: analysis.summary || '',
        analysis: analysis,
        audioFile: interview.audio_file,
        hasAudio: !!interview.audio_file
      });
      
      console.log('=== DEBUG: Dados setados no state ===');
      console.log('Positives:', analysis.positives || []);
      console.log('Negatives:', analysis.negatives || []);
      console.log('Notes:', interview.notes || '');
    } catch (error) {
      console.error('Erro ao carregar entrevista:', error);
      alert('Erro ao carregar dados da entrevista');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) {
      console.error('Audio element not found');
      return;
    }

    try {
      if (isPlaying) {
        audio.pause();
      } else {
        await audio.play();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      alert('Erro ao reproduzir áudio. Verifique se o arquivo existe.');
    }
  };

  const handleProgressClick = (e) => {
    const progressBar = e.currentTarget;
    const clickX = e.clientX - progressBar.getBoundingClientRect().left;
    const width = progressBar.offsetWidth;
    const percentage = (clickX / width);
    
    const audio = audioRef.current;
    if (audio && duration) {
      audio.currentTime = percentage * duration;
      setCurrentTime(audio.currentTime);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } else {
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
  };

  if (loading) {
    return <div style={{padding: '2rem', textAlign: 'center'}}>Carregando entrevista...</div>;
  }

  if (!interviewData) {
    return <div style={{padding: '2rem', textAlign: 'center'}}>Entrevista não encontrada</div>;
  }

  const audioProgress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="interview-detail-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header 
        title={`${interviewData.candidate.candidateName} - ${interviewData.date}`}
        showInfo={true}
        onInfoClick={() => setShowModal(true)}
        onMenuClick={() => setSidebarOpen(true)}
      />
      
      <div className="detail-container">
        {/* Coluna Esquerda - Resumo */}
        <div className="resume-column">
          <h2 className="section-main-title">Resumo</h2>
          
          <div className="resume-content">
            {isProcessing ? (
              <div className="loading-overlay">
                <div className="spinner"></div>
              </div>
            ) : (
              <>
            {/* Habilidades */}
            <div className="accordion-section">
              <button 
                className="accordion-header"
                onClick={() => toggleSection('habilidades')}
              >
                <span>Habilidades</span>
                <span className="accordion-icon">
                  {expandedSections.habilidades ? (
                    <ChevronDownIcon size={16} color="#1a1a1a" />
                  ) : (
                    <ChevronRightIcon size={16} color="#1a1a1a" />
                  )}
                </span>
              </button>
              {expandedSections.habilidades && (
                <div className="accordion-content">
                  {!isProcessing && interviewData.skills && interviewData.skills.length > 0 && (
                    <ol className="skills-list">
                      {interviewData.skills.map((skill, idx) => (
                        <li key={idx}>{skill}</li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </div>

            {/* Histórico */}
            <div className="accordion-section">
              <button 
                className="accordion-header"
                onClick={() => toggleSection('historico')}
              >
                <span>Histórico</span>
                <span className="accordion-icon">
                  {expandedSections.historico ? (
                    <ChevronDownIcon size={16} color="#1a1a1a" />
                  ) : (
                    <ChevronRightIcon size={16} color="#1a1a1a" />
                  )}
                </span>
              </button>
              {expandedSections.historico && (
                <div className="accordion-content">
                  {!isProcessing && interviewData.history && interviewData.history.length > 0 && (
                    interviewData.history.map((item, idx) => (
                      <div key={idx} className="history-item">
                        <div className="history-title">{item.company} - {item.role}</div>
                        <div className="history-description">{item.description}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Pontos Positivos */}
            <div className="accordion-section">
              <button 
                className="accordion-header"
                onClick={() => toggleSection('positivos')}
              >
                <span>Pontos positivos</span>
                <span className="accordion-icon">
                  {expandedSections.positivos ? (
                    <ChevronDownIcon size={16} color="#1a1a1a" />
                  ) : (
                    <ChevronRightIcon size={16} color="#1a1a1a" />
                  )}
                </span>
              </button>
              {expandedSections.positivos && (
                <div className="accordion-content">
                  {!isProcessing && interviewData.positives && interviewData.positives.length > 0 && (
                    interviewData.positives.map((point, idx) => (
                      <div key={idx} className="point-item">{point}</div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Pontos Negativos */}
            <div className="accordion-section">
              <button 
                className="accordion-header"
                onClick={() => toggleSection('negativos')}
              >
                <span>Pontos negativos</span>
                <span className="accordion-icon">
                  {expandedSections.negativos ? (
                    <ChevronDownIcon size={16} color="#1a1a1a" />
                  ) : (
                    <ChevronRightIcon size={16} color="#1a1a1a" />
                  )}
                </span>
              </button>
              {expandedSections.negativos && (
                <div className="accordion-content">
                  {!isProcessing && interviewData.negatives && interviewData.negatives.length > 0 && (
                    interviewData.negatives.map((point, idx) => (
                      <div key={idx} className="point-item">{point}</div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Informações Específicas */}
            <div className="accordion-section">
              <button 
                className="accordion-header"
                onClick={() => toggleSection('especificas')}
              >
                <span>Informações específicas</span>
                <span className="accordion-icon">
                  {expandedSections.especificas ? (
                    <ChevronDownIcon size={16} color="#1a1a1a" />
                  ) : (
                    <ChevronRightIcon size={16} color="#1a1a1a" />
                  )}
                </span>
              </button>
              {expandedSections.especificas && (
                <div className="accordion-content">
                  <p>{interviewData.specific}</p>
                </div>
              )}
            </div>

            {/* Anotações */}
            <div className="accordion-section">
              <button 
                className="accordion-header"
                onClick={() => toggleSection('anotacoes')}
              >
                <span>Anotações</span>
                <span className="accordion-icon">
                  {expandedSections.anotacoes ? (
                    <ChevronDownIcon size={16} color="#1a1a1a" />
                  ) : (
                    <ChevronRightIcon size={16} color="#1a1a1a" />
                  )}
                </span>
              </button>
              {expandedSections.anotacoes && (
                <div className="accordion-content">
                  <p>{interviewData.notes || 'Sem anotações'}</p>
                </div>
              )}
            </div>
              </>
            )}
          </div>
        </div>

        {/* Coluna Direita - Transcrição */}
        <div className="transcription-column">
          <h2 className="section-main-title">Transcrição</h2>
          
          <div className="transcription-content">
            {!interviewData.transcription || interviewData.transcription.length === 0 ? (
              <div className="loading-overlay">
                <div className="spinner"></div>
              </div>
            ) : (
              interviewData.transcription.map((message, idx) => {
                const isInterviewer = message.speakerLabel === 'Entrevistador';
                return (
                  <div key={idx} className={`transcription-message ${isInterviewer ? 'message-right' : 'message-left'}`}>
                    <div className="message-speaker">{message.speakerLabel}</div>
                    <div className={`message-bubble ${isInterviewer ? 'interviewer' : 'interviewee'}`}>
                      {message.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Audio Player */}
          {interviewData.hasAudio && (
            <>
              <audio 
                ref={audioRef} 
                src={getAudioUrl(id)}
                preload="metadata"
                crossOrigin="anonymous"
                onError={(e) => {
                  console.error('Audio load error:', e);
                  console.error('Audio element:', audioRef.current);
                  console.error('Audio URL:', getAudioUrl(id));
                  console.error('Audio error details:', audioRef.current?.error);
                  if (audioRef.current?.error) {
                    console.error('Error code:', audioRef.current.error.code);
                    console.error('Error message:', audioRef.current.error.message);
                  }
                }}
                onLoadedMetadata={() => {
                  console.log('Audio metadata loaded');
                  const audio = audioRef.current;
                  if (audio) {
                    console.log('Audio duration:', audio.duration);
                    setDuration(audio.duration);
                  }
                }}
                onCanPlay={() => {
                  console.log('Audio can play');
                }}
                onLoadStart={() => {
                  console.log('Audio load started');
                }}
              />
              
              <div className="audio-player">
                <div 
                  className="audio-progress-bar"
                  onClick={handleProgressClick}
                >
                  <div 
                    className="audio-progress-fill"
                    style={{ width: `${audioProgress}%` }}
                  />
                </div>
                <div className="player-controls">
                  <span className="player-time">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                  <div className="player-buttons">
                    <button 
                      className="player-btn play-btn"
                      onClick={togglePlayPause}
                    >
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
          )}
        </div>
      </div>

      <InfoModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        candidateData={interviewData.candidate}
      />
    </div>
  );
}

export default InterviewDetailPage;
