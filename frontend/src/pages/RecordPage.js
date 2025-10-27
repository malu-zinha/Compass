import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function RecordPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [status, setStatus] = useState('');
  const [processing, setProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const navigate = useNavigate();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        setStatus('Gravação concluída! Clique em "Enviar" para processar.');
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus('Gravando... Clique novamente para parar.');
    } catch (error) {
      setStatus(`Erro ao acessar microfone: ${error.message}`);
      console.error('Erro:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const sendToBackend = async () => {
    if (!audioBlob) {
      setStatus('Nenhum áudio para enviar!');
      return;
    }

    setProcessing(true);
    setStatus('Enviando áudio...');

    const formData = new FormData();
    formData.append('audio_file', audioBlob, 'recording.webm');

    try {
      // 1. Upload do áudio
      const uploadRes = await fetch('http://localhost:8000/api/interviews', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Erro no upload do áudio');
      }

      const { id } = await uploadRes.json();
      setStatus(`Áudio enviado! ID: ${id}. Transcrevendo...`);

      // 2. Transcrever
      const transcribeRes = await fetch('http://localhost:8000/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!transcribeRes.ok) {
        throw new Error('Erro na transcrição');
      }

      setStatus('Transcrição concluída! Gerando resumo...');

      // 3. Gerar resumo
      const summaryRes = await fetch('http://localhost:8000/gerar-resumo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, tipo_resumo: 'padrao' }),
      });

      if (!summaryRes.ok) {
        throw new Error('Erro ao gerar resumo');
      }

      setStatus('✅ Processamento completo! Redirecionando...');
      
      // Redirecionar para resultados após 1.5 segundos
      setTimeout(() => {
        navigate('/results');
      }, 1500);

    } catch (error) {
      setStatus(`❌ Erro: ${error.message}`);
      console.error('Erro:', error);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusClass = () => {
    if (isRecording) return 'recording';
    if (processing) return 'processing';
    if (status.includes('✅')) return 'success';
    if (status.includes('❌')) return 'error';
    return '';
  };

  return (
    <div className="record-page">
      <h2>Gravação de Áudio</h2>
      <p>Clique no botão abaixo para iniciar a gravação</p>

      <button 
        className={`record-button ${isRecording ? 'recording' : ''}`}
        onClick={toggleRecording}
        disabled={processing}
      >
        {isRecording ? '⏸' : '🎙️'}
      </button>

      {status && (
        <div className={`status ${getStatusClass()}`}>
          {status}
        </div>
      )}

      {audioBlob && !processing && (
        <div>
          <button 
            className="send-button"
            onClick={sendToBackend}
          >
            📤 Enviar para Análise
          </button>
        </div>
      )}
    </div>
  );
}

export default RecordPage;

