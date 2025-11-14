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
    pontuacao: false,
    anotacoes: false
  });
  
  // Audio player state
  const audioRef = useRef(null);
  const transcriptionRef = useRef(null);
  const messageRefs = useRef({});
  const activeMessageIndexRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [activeMessageIndex, setActiveMessageIndex] = useState(null);
  
  const [interviewData, setInterviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioError, setAudioError] = useState(null);

  useEffect(() => {
    // Resetar estado quando o ID mudar
    setInterviewData(null);
    setLoading(true);
    setIsProcessing(false);
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
    
    // Verificar se transcrição existe E tem diarização adequada
    const hasTranscript = interviewData.transcription && interviewData.transcription.length > 0;
    
    // Verificar se a transcrição tem diarização (speakers identificados A/B)
    const hasDiarization = hasTranscript && interviewData.transcription.some(item => 
      item.speaker && (item.speaker.toUpperCase() === 'A' || item.speaker.toUpperCase() === 'B')
    );
    
    // Debug detalhado
    console.log('📊 Status de processamento:', {
      hasAnalysis,
      hasTranscript,
      hasDiarization,
      hasAudio: interviewData.hasAudio,
      transcriptionLength: interviewData.transcription?.length,
      speakers: interviewData.transcription?.map(t => t.speaker).slice(0, 5) || [],
      analysisKeys: interviewData.analysis ? Object.keys(interviewData.analysis) : []
    });
    
    // 🔑 REGRA PRINCIPAL: Se já tem diarização E análise, PARAR polling definitivamente
    if (hasDiarization && hasAnalysis) {
      console.log('✅ JÁ TEM DIARIZAÇÃO E ANÁLISE - PARANDO polling definitivamente!');
      console.log('✅ Não recarregar mais, mesmo se o áudio carregar depois');
      setIsProcessing(false);
      return; // Sair do useEffect sem criar interval
    }
    
    // Se tem áudio mas não tem diarização, precisa continuar polling
    const needsDiarization = interviewData.hasAudio && hasTranscript && !hasDiarization;
    const needsProcessing = !hasAnalysis || !hasTranscript || needsDiarization;
    
    setIsProcessing(needsProcessing);
    
    if (needsProcessing) {
      console.log('⚠️  Dados incompletos, iniciando polling...');
      console.log(`   - Tem análise: ${hasAnalysis ? '✅' : '❌'}`);
      console.log(`   - Tem transcrição: ${hasTranscript ? '✅' : '❌'}`);
      console.log(`   - Tem diarização: ${hasDiarization ? '✅' : '❌'}`);
      
      const interval = setInterval(() => {
        console.log('🔄 Recarregando dados da entrevista...');
        loadInterviewData();
      }, 3000);
      
      // Timeout máximo de 5 minutos para evitar polling infinito
      const timeout = setTimeout(() => {
        console.log('⏱️  Timeout: parando polling após 5 minutos');
        clearInterval(interval);
        setIsProcessing(false);
      }, 300000);
      
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    } else {
      console.log('✅ Dados completos! Parando polling.');
    }
  }, [interviewData?.transcription?.length, interviewData?.analysis]);

  // Audio player effects - só roda quando tem áudio e o elemento está montado
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !interviewData?.hasAudio) return;

    // Calcular duração do transcript (mesmo método da ResultsPage)
    const calculateDurationFromTranscript = () => {
      const transcript = interviewData.transcription;
      if (!transcript || transcript.length === 0) return null;
      
      try {
        // Pegar o maior timestamp 'end' de todas as utterances
        const maxEnd = Math.max(...transcript.map(u => u.end || 0));
        // AssemblyAI retorna em milissegundos, converter para segundos
        return maxEnd > 1 ? maxEnd / 1000 : maxEnd;
      } catch (e) {
        console.error('[AUDIO] Erro ao calcular duração do transcript:', e);
        return null;
      }
    };
    
    // Se temos duração do banco de dados OU do transcript, usar ela imediatamente
    const transcriptDuration = calculateDurationFromTranscript();
    const fallbackDuration = interviewData.audioDuration || transcriptDuration;
    
    if (fallbackDuration && !duration) {
      console.log('[AUDIO] 🎯 Usando duração do transcript/banco:', fallbackDuration);
      setDuration(fallbackDuration);
    }

    const updateTime = () => {
      if (audio && !isNaN(audio.currentTime)) {
        setCurrentTime(audio.currentTime);
      }
    };
    
    // Auto-scroll transcription based on current audio time
    const scrollToCurrentMessage = () => {
      if (!interviewData?.transcription || !transcriptionRef.current || !audio) return;
      
      const currentTimeMs = audio.currentTime * 1000; // Converter para milissegundos
      const transcription = interviewData.transcription;
      
      // Encontrar a mensagem que corresponde ao tempo atual
      let activeIndex = null;
      for (let i = 0; i < transcription.length; i++) {
        const message = transcription[i];
        // Converter timestamps para milissegundos se necessário
        let start = message.start || 0;
        let end = message.end || 0;
        
        // Se os timestamps parecem estar em segundos (valores pequenos), converter
        if (start < 1000 && end < 1000) {
          start = start * 1000;
          end = end * 1000;
        }
        
        // Verificar se o tempo atual está dentro desta mensagem
        if (currentTimeMs >= start && currentTimeMs <= end) {
          activeIndex = i;
          break;
        }
        // Se passou da última mensagem, usar a última
        if (i === transcription.length - 1 && currentTimeMs > end) {
          activeIndex = i;
        }
      }
      
      // Se encontrou uma mensagem ativa
      if (activeIndex !== null) {
        // Atualizar estado apenas se mudou
        if (activeIndex !== activeMessageIndexRef.current) {
          activeMessageIndexRef.current = activeIndex;
          setActiveMessageIndex(activeIndex);
        }
        
        // Fazer scroll até a mensagem
        const messageElement = messageRefs.current[activeIndex];
        if (messageElement && transcriptionRef.current) {
          const container = transcriptionRef.current;
          const messageTop = messageElement.offsetTop;
          const messageHeight = messageElement.offsetHeight;
          const containerHeight = container.clientHeight;
          const scrollTop = container.scrollTop;
          
          // Verificar se a mensagem está visível
          const messageBottom = messageTop + messageHeight;
          const containerBottom = scrollTop + containerHeight;
          
          // Se a mensagem está acima da área visível ou abaixo
          if (messageTop < scrollTop || messageBottom > containerBottom) {
            // Scroll suave até a mensagem, centralizando-a na área visível
            const targetScroll = messageTop - (containerHeight / 2) + (messageHeight / 2);
            container.scrollTo({
              top: Math.max(0, targetScroll),
              behavior: 'smooth'
            });
          }
        }
      }
    };
    
    const updateDuration = () => {
      console.log('[AUDIO] Tentando atualizar duração:', audio.duration);
      if (audio && audio.duration && isFinite(audio.duration) && !isNaN(audio.duration) && audio.duration > 0) {
        console.log('[AUDIO] ✅ Duração do arquivo de áudio:', audio.duration);
        setDuration(audio.duration);
      } else {
        // Calcular do transcript se áudio não tem duração
        const transcriptDurationFallback = calculateDurationFromTranscript();
        const fallbackDurationUpdate = interviewData.audioDuration || transcriptDurationFallback;
        
        if (!duration && fallbackDurationUpdate) {
          console.log('[AUDIO] 📊 Usando duração calculada (fallback):', fallbackDurationUpdate);
          setDuration(fallbackDurationUpdate);
        } else {
          console.log('[AUDIO] ⚠️ Duração não disponível em nenhuma fonte');
        }
      }
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = (e) => {
      console.error('[AUDIO] ❌ Erro no áudio:', e);
      console.error('[AUDIO] Detalhes:', audio.error);
      setIsPlaying(false);
    };
    
    const handleDurationChange = () => {
      console.log('[AUDIO] Evento durationchange disparado');
      updateDuration();
    };

    const handleTimeUpdate = () => {
      updateTime();
      scrollToCurrentMessage();
    };
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('loadeddata', updateDuration);
    audio.addEventListener('canplay', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    console.log('[AUDIO] 🎵 Iniciando carregamento do áudio...');
    console.log('[AUDIO] URL:', audio.src);
    
    // Forçar carregamento
    audio.load();
    
    // Tentar buscar duração após um delay (fallback)
    const durationCheckInterval = setInterval(() => {
      if (audio.duration && isFinite(audio.duration) && !duration) {
        console.log('[AUDIO] ✅ Duração detectada no polling:', audio.duration);
        setDuration(audio.duration);
        clearInterval(durationCheckInterval);
      }
    }, 500);
    
    // Limpar interval após 10 segundos
    const timeoutId = setTimeout(() => {
      clearInterval(durationCheckInterval);
    }, 10000);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('loadeddata', updateDuration);
      audio.removeEventListener('canplay', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      clearInterval(durationCheckInterval);
      clearTimeout(timeoutId);
    };
  }, [interviewData?.hasAudio, interviewData?.transcription, duration]);

  const loadInterviewData = async () => {
    try {
      setLoading(true);
      console.log(`[DEBUG] 🔍 Carregando entrevista ID: ${id}`);
      
      // Buscar TODAS as entrevistas (positionId = 0 retorna todas)
      console.log(`[DEBUG] 🔄 Chamando getInterviews(0)...`);
      let interviews = [];
      try {
        interviews = await getInterviews(0);
        console.log(`[DEBUG] 📋 Total de entrevistas encontradas: ${interviews.length}`);
        if (!Array.isArray(interviews)) {
          console.error(`[ERROR] ❌ getInterviews não retornou um array! Tipo:`, typeof interviews);
          throw new Error('Resposta inválida do servidor');
        }
      } catch (err) {
        console.error(`[ERROR] ❌ Erro ao buscar entrevistas:`, err);
        // Tentar buscar sem positionId (pode ser que o endpoint seja diferente)
        try {
          console.log(`[DEBUG] 🔄 Tentando buscar sem positionId...`);
          interviews = await getInterviews();
          console.log(`[DEBUG] 📋 Total de entrevistas encontradas (fallback): ${interviews.length}`);
          if (!Array.isArray(interviews)) {
            console.error(`[ERROR] ❌ getInterviews (fallback) não retornou um array!`);
            throw new Error('Resposta inválida do servidor');
          }
        } catch (err2) {
          console.error(`[ERROR] ❌ Erro no fallback também:`, err2);
          throw new Error(`Não foi possível carregar as entrevistas: ${err.message || err2.message}`);
        }
      }
      
      if (!interviews || interviews.length === 0) {
        console.warn(`[WARNING] ⚠️ Nenhuma entrevista encontrada no servidor`);
        alert('Nenhuma entrevista encontrada. Verifique se o backend está rodando.');
        setLoading(false);
        return;
      }
      
      const interview = interviews.find(i => i.id === parseInt(id));
      
      if (!interview) {
        console.error(`[ERROR] ❌ Entrevista ${id} não encontrada!`);
        console.log(`[DEBUG] IDs disponíveis:`, interviews.map(i => i.id));
        alert(`Entrevista ${id} não encontrada. IDs disponíveis: ${interviews.map(i => i.id).join(', ')}`);
        setLoading(false);
        return;
      }
      
      console.log(`[DEBUG] ✅ Entrevista encontrada:`, {
        id: interview.id,
        name: interview.name,
        hasAudio: !!interview.audio_file,
        hasTranscript: !!interview.transcript,
        hasAnalysis: !!interview.analysis
      });

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
            console.error('Erro ao parsear análise:', e);
            // Tentar fazer substring apenas se for string
            const analysisPreview = typeof interview.analysis === 'string' 
              ? interview.analysis.substring(0, 100) 
              : typeof interview.analysis;
            console.error('Raw analysis preview:', analysisPreview);
            analysis = {};
          }
        } else if (typeof interview.analysis === 'object' && interview.analysis !== null) {
          analysis = interview.analysis;
        }
      }

      // Parse transcript (é string JSON no backend)
      let transcript = [];
      console.log('🔬 RAW TRANSCRIPT DO BACKEND (antes de parsear):', interview.transcript);
      console.log('🔬 Tipo:', typeof interview.transcript);
      
      if (interview.transcript && typeof interview.transcript === 'string') {
        try {
          const parsed = JSON.parse(interview.transcript);
          console.log('🔬 PARSED:', parsed);
          // Backend salva como {"utterances": [...]}
          transcript = parsed.utterances || parsed || [];
          console.log('🔬 TRANSCRIPT EXTRAÍDO:', transcript);
          console.log('🔬 Primeiros 3 utterances:', transcript.slice(0, 3));
        } catch (e) {
          console.error('Erro ao parsear transcrição:', e);
        }
      } else if (Array.isArray(interview.transcript)) {
        transcript = interview.transcript;
        console.log('🔬 TRANSCRIPT já é array:', transcript);
      } else if (interview.transcript?.utterances) {
        // Se já é objeto com utterances
        transcript = interview.transcript.utterances;
        console.log('🔬 TRANSCRIPT extraído de objeto:', transcript);
      }

      console.log('=== DEBUG: Dados recebidos do backend ===');
      console.log('Interview completo:', interview);
      console.log('Audio file:', interview.audio_file);
      console.log('Analysis (raw):', interview.analysis);
      // Verificar tipo do transcript antes de fazer substring
      const transcriptPreview = interview.transcript 
        ? (typeof interview.transcript === 'string' 
          ? interview.transcript.substring(0, 100) + '...' 
          : typeof interview.transcript)
        : 'null';
      console.log('Transcript (raw):', transcriptPreview);
      console.log('Transcript type:', typeof interview.transcript);
      console.log('Notes (raw):', interview.notes);
      console.log('Parsed analysis:', analysis);
      console.log('Analysis keys:', Object.keys(analysis));
      console.log('Analysis.positives:', analysis.positives);
      console.log('Analysis.negatives:', analysis.negatives);
      console.log('Analysis.summary:', analysis.summary);
      console.log('Parsed transcript:', transcript);
      console.log('Transcript length:', transcript.length);
      
      // Verificar se a transcrição do backend tem diarização
      const backendHasDiarization = transcript.some(item => 
        item.speaker && (item.speaker.toUpperCase() === 'A' || item.speaker.toUpperCase() === 'B')
      );
      
      console.log('🔍 Verificação de diarização:', {
        transcriptLength: transcript.length,
        backendHasDiarization,
        hasAudio: !!interview.audio_file,
        speakers: transcript.map(t => t.speaker).slice(0, 5), // Primeiros 5 para debug
        allSpeakers: [...new Set(transcript.map(t => t.speaker))] // Todos os speakers únicos
      });

      // 🔑 REGRA CRÍTICA: Verificar se já temos uma transcrição com diarização no state atual
      const currentHasDiarization = interviewData?.transcription?.some(item => 
        item.speaker && (item.speaker.toUpperCase() === 'A' || item.speaker.toUpperCase() === 'B')
      );
      
      // 🛡️ PROTEÇÃO: Se já temos diarização no state, NUNCA substituir por transcrição sem diarização
      if (currentHasDiarization && !backendHasDiarization && transcript.length > 0) {
        console.log('🛡️  PROTEÇÃO ATIVADA: Backend retornou transcrição SEM diarização');
        console.log('✅ Mantendo transcrição com diarização existente no state');
        console.log('📊 State atual:', interviewData.transcription.length, 'utterances COM diarização');
        console.log('📊 Backend:', transcript.length, 'utterances SEM diarização (ignorando)');
        // USAR a transcrição do state atual que já tem diarização
        transcript = interviewData.transcription.map(item => ({
          speaker: item.speaker,
          text: item.text,
          start: item.start,
          end: item.end
        }));
      } else if (backendHasDiarization) {
        console.log('✅ Backend retornou transcrição COM diarização - ATUALIZANDO state!');
        console.log('📊 Speakers encontrados:', [...new Set(transcript.map(t => t.speaker))]);
      } else if (!backendHasDiarization && interview.audio_file && transcript.length > 0) {
        console.log('⏳ Backend retornou transcrição sem diarização, mas tem áudio');
        console.log('📊 Transcrição em background ainda está processando - aguardando...');
      }
      
      // Map speakers usando identity da análise
      const identity = analysis.identity || {};
      const transcriptionWithLabels = (transcript || []).map(item => {
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
        specific: analysis.summary || 'Sem informações específicas', // Texto completo sem cortar
        notes: interview.notes || '',
        transcription: transcriptionWithLabels,
        score: interview.score || 0,
        summary: analysis.summary || '',
        analysis: analysis,
        audioFile: interview.audio_file,
        hasAudio: !!interview.audio_file,
        audioDuration: interview.duration || null  // Duração do banco de dados
      });
      
      console.log('=== DEBUG: Dados setados no state ===');
      console.log('✅ hasAudio:', !!interview.audio_file);
      console.log('✅ audioFile:', interview.audio_file);
      console.log('✅ transcription length:', transcriptionWithLabels.length);
      console.log('✅ transcription has diarization:', transcriptionWithLabels.some(t => 
        t.speaker && (t.speaker.toUpperCase() === 'A' || t.speaker.toUpperCase() === 'B')
      ));
      console.log('✅ hasAnalysis:', Object.keys(analysis).length > 0);
      console.log('Positives:', analysis.positives || []);
      console.log('Negatives:', analysis.negatives || []);
      console.log('Notes:', interview.notes || '');
      
      // Log importante: se tem áudio mas não tem diarização, o polling deve continuar
      const finalHasDiarization = transcriptionWithLabels.some(t => 
        t.speaker && (t.speaker.toUpperCase() === 'A' || t.speaker.toUpperCase() === 'B')
      );
      if (!!interview.audio_file && !finalHasDiarization && transcriptionWithLabels.length > 0) {
        console.log('⚠️  ATENÇÃO: Tem áudio mas transcrição SEM diarização - polling deve continuar!');
      }
    } catch (error) {
      console.error('❌ ERRO ao carregar entrevista:', error);
      console.error('❌ Stack trace:', error.stack);
      console.error('❌ Interview ID:', id);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      alert(`Erro ao carregar dados da entrevista: ${error.message}\n\nVerifique o console para mais detalhes.`);
    } finally {
      // SEMPRE desligar o loading, mesmo se houver erro
      console.log('[DEBUG] ✅ Finalizando loadInterviewData - desligando loading');
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
        // Verificar se há erro antes de tentar tocar
        if (audio.error) {
          const errorMessages = {
            1: 'Download do áudio foi cancelado',
            2: 'Erro de rede ao carregar áudio. Verifique se o backend está rodando.',
            3: 'Erro ao decodificar o arquivo de áudio. O arquivo pode estar corrompido.',
            4: 'Formato de áudio não suportado pelo navegador'
          };
          const message = errorMessages[audio.error.code] || 'Erro desconhecido ao carregar áudio';
          alert(`${message}\n\nURL: ${getAudioUrl(id)}\nVerifique o console para mais detalhes.`);
          return;
        }
        await audio.play();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      console.error('Audio URL:', getAudioUrl(id));
      console.error('Interview ID:', id);
      console.error('Has audio file:', interviewData?.hasAudio);
      console.error('Audio file path:', interviewData?.audioFile);
      alert(`Erro ao reproduzir áudio: ${error.message}\n\nVerifique se:\n1. O backend está rodando em http://localhost:8000\n2. O arquivo de áudio existe no servidor\n3. O console para mais detalhes`);
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
      // Trigger scroll after time update
      setTimeout(() => {
        if (interviewData?.transcription && transcriptionRef.current) {
          const currentTimeMs = audio.currentTime * 1000;
          const transcription = interviewData.transcription;
          
          let activeIndex = null;
          for (let i = 0; i < transcription.length; i++) {
            const message = transcription[i];
            let start = message.start || 0;
            let end = message.end || 0;
            
            if (start < 1000 && end < 1000) {
              start = start * 1000;
              end = end * 1000;
            }
            
            if (currentTimeMs >= start && currentTimeMs <= end) {
              activeIndex = i;
              break;
            }
            if (i === transcription.length - 1 && currentTimeMs > end) {
              activeIndex = i;
            }
          }
          
          if (activeIndex !== null) {
            activeMessageIndexRef.current = activeIndex;
            setActiveMessageIndex(activeIndex);
            const messageElement = messageRefs.current[activeIndex];
            if (messageElement && transcriptionRef.current) {
              const container = transcriptionRef.current;
              const messageTop = messageElement.offsetTop;
              const messageHeight = messageElement.offsetHeight;
              const containerHeight = container.clientHeight;
              const targetScroll = messageTop - (containerHeight / 2) + (messageHeight / 2);
              container.scrollTo({
                top: Math.max(0, targetScroll),
                behavior: 'smooth'
              });
            }
          }
        }
      }, 100);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '00:00';
    
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
                  {!isProcessing && interviewData.skills && interviewData.skills.length > 0 ? (
                    <ol className="skills-list">
                      {interviewData.skills.map((skill, idx) => (
                        <li key={idx}>{skill}</li>
                      ))}
                    </ol>
                  ) : (
                    <p>Nenhuma informação coletada</p>
                  )}
                </div>
              )}
            </div>

            {/* Histórico - só exibe se houver dados válidos */}
            {!isProcessing && interviewData.history && interviewData.history.length > 0 && 
             interviewData.history.filter(item => item.company && item.role).length > 0 && (
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
                    {interviewData.history.filter(item => item.company && item.role).map((item, idx) => (
                          <div key={idx} className="history-item">
                            <div className="history-title">{item.role} - {item.company}</div>
                            {item.description && (
                              <div className="history-description">{item.description}</div>
                            )}
                          </div>
                    ))}
                </div>
              )}
            </div>
            )}

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
                  {!isProcessing && interviewData.positives && interviewData.positives.length > 0 ? (
                    <ol className="skills-list">
                      {interviewData.positives.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ol>
                  ) : (
                    <p>Nenhuma informação coletada</p>
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
                  {!isProcessing && interviewData.negatives && interviewData.negatives.length > 0 ? (
                    <ol className="skills-list">
                      {interviewData.negatives.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ol>
                  ) : (
                    <p>Nenhuma informação coletada</p>
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
                <span>Análise</span>
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

            {/* Pontuação */}
            <div className="accordion-section">
              <button 
                className="accordion-header"
                onClick={() => toggleSection('pontuacao')}
              >
                <span>Pontuação</span>
                <span className="accordion-icon">
                  {expandedSections.pontuacao ? (
                    <ChevronDownIcon size={16} color="#1a1a1a" />
                  ) : (
                    <ChevronRightIcon size={16} color="#1a1a1a" />
                  )}
                </span>
              </button>
              {expandedSections.pontuacao && (
                <div className="accordion-content">
                  {!isProcessing && interviewData.analysis?.score ? (
                    <div className="scores-container">
                      <div className="score-item overall-score">
                        <span className="score-label">Pontuação Geral</span>
                        <span className="score-value">
                          {Math.round((interviewData.analysis.score.overall / 1000) * 100)}%
                        </span>
                      </div>
                      <div className="subscores">
                        <div className="score-item">
                          <span className="score-label">Técnico</span>
                          <span className="score-value">
                            {Math.round((interviewData.analysis.score.subscores.technical / 1000) * 100)}%
                          </span>
                        </div>
                        <div className="score-item">
                          <span className="score-label">Comunicação</span>
                          <span className="score-value">
                            {Math.round((interviewData.analysis.score.subscores.communication / 1000) * 100)}%
                          </span>
                        </div>
                        <div className="score-item">
                          <span className="score-label">Cultura de Trabalho</span>
                          <span className="score-value">
                            {Math.round((interviewData.analysis.score.subscores.work_culture / 1000) * 100)}%
                          </span>
                        </div>
                        <div className="score-item">
                          <span className="score-label">Experiência</span>
                          <span className="score-value">
                            {Math.round((interviewData.analysis.score.subscores.experience / 1000) * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p>Nenhuma informação coletada</p>
                  )}
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
                  <p>"{interviewData.notes || 'Sem anotações'}"</p>
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
          
          <div className="transcription-content" ref={transcriptionRef}>
            {!interviewData.transcription || interviewData.transcription.length === 0 ? (
              <div className="loading-overlay">
                <div className="spinner"></div>
                {isProcessing && (
                  <p style={{ 
                    marginTop: '1rem', 
                    color: '#666', 
                    fontSize: '0.9rem',
                    textAlign: 'center'
                  }}>
                    Carregando transcrição e gerando resumo
                  </p>
                )}
              </div>
            ) : (
              interviewData.transcription.map((message, idx) => {
                const isInterviewer = message.speakerLabel === 'Entrevistador';
                const isActive = activeMessageIndex === idx;
                return (
                  <div 
                    key={idx} 
                    ref={el => messageRefs.current[idx] = el}
                    className={`transcription-message ${isInterviewer ? 'message-right' : 'message-left'} ${isActive ? 'active-message' : ''}`}
                  >
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
                  console.error('[AUDIO] ❌ Load error:', e);
                  console.error('[AUDIO] URL:', getAudioUrl(id));
                  console.error('[AUDIO] Error details:', audioRef.current?.error);
                  if (audioRef.current?.error) {
                    console.error('[AUDIO] Error code:', audioRef.current.error.code);
                    console.error('[AUDIO] Error message:', audioRef.current.error.message);
                    
                    const errorMessages = {
                      1: 'Download do áudio foi cancelado',
                      2: 'Erro de rede. Verifique se o backend está rodando em http://localhost:8000',
                      3: 'Erro ao decodificar o áudio. O arquivo pode estar corrompido.',
                      4: 'Formato de áudio não suportado'
                    };
                    setAudioError(errorMessages[audioRef.current.error.code] || 'Erro desconhecido');
                  }
                }}
                onLoadedMetadata={() => {
                  console.log('[AUDIO] 📊 Metadata loaded');
                  setAudioError(null);
                  const audio = audioRef.current;
                  if (audio && audio.duration && isFinite(audio.duration) && audio.duration > 0) {
                    console.log('[AUDIO] ✅ Duration from metadata:', audio.duration);
                    setDuration(audio.duration);
                  } else {
                    console.log('[AUDIO] ⚠️ Duration not available in metadata:', audio.duration);
                  }
                }}
                onCanPlay={() => {
                  console.log('[AUDIO] 🎵 Can play');
                  const audio = audioRef.current;
                  if (audio && audio.duration && isFinite(audio.duration) && audio.duration > 0 && !duration) {
                    console.log('[AUDIO] ✅ Duration from canplay:', audio.duration);
                    setDuration(audio.duration);
                  }
                }}
                onLoadStart={() => {
                  console.log('[AUDIO] 🔄 Load started');
                }}
                onProgress={() => {
                  // Tentar pegar duração durante o progresso do download
                  const audio = audioRef.current;
                  if (audio && audio.duration && isFinite(audio.duration) && audio.duration > 0 && !duration) {
                    console.log('[AUDIO] ✅ Duration from progress:', audio.duration);
                    setDuration(audio.duration);
                  }
                }}
              />
              
              <div className="audio-player">
                {audioError && (
                  <div className="audio-error-message">
                    ⚠️ {audioError}
                  </div>
                )}
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
                    {formatTime(currentTime)} / {duration && isFinite(duration) && duration > 0 ? formatTime(duration) : '∞'}
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
