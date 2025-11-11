import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadInterview, saveCandidateInfo, transcribeInterview, labelTranscript, generateAnalysis } from '../services/api';
import './UploadAudioPage.css';

function UploadAudioPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [candidateData, setCandidateData] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const savedData = localStorage.getItem('interviewData');
    if (!savedData) {
      navigate('/nova-entrevista');
      return;
    }
    
    setCandidateData(JSON.parse(savedData));
  }, [navigate]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    
    const validTypes = ['audio/mp3', 'audio/wav', 'audio/mpeg', 'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/x-m4a'];
    const validExtensions = ['.mp3', '.wav', '.m4a', '.webm', '.ogg'];
    
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    const isValidType = validTypes.includes(file.type) || validExtensions.includes(fileExtension);
    
    if (!isValidType) {
      alert('Por favor, selecione um arquivo de áudio válido (.mp3, .wav, .m4a, .webm, .ogg)');
      return;
    }
    
    setAudioFile(file);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const processInBackground = async (interviewId) => {
    try {
      console.log('Iniciando processamento em background...');
      
      // Aguardar um pouco antes de começar (dar tempo do upload terminar)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('1/3: Transcrevendo...');
      await transcribeInterview(interviewId);
      console.log('✅ Transcrição concluída');
      
      console.log('2/3: Diarizando...');
      await labelTranscript(interviewId);
      console.log('✅ Diarização concluída');
      
      console.log('3/3: Gerando análise...');
      await generateAnalysis(interviewId);
      console.log('✅ Análise concluída - Processamento completo!');
    } catch (error) {
      console.error('❌ Erro no processamento em background:', error);
      // Não mostrar alerta aqui, pois o usuário já foi redirecionado
    }
  };

  const handleUpload = async () => {
    if (!audioFile) {
      alert('Por favor, selecione um arquivo de áudio');
      return;
    }

    if (!candidateData || !candidateData.candidatePositionId) {
      alert('Dados do candidato incompletos!');
      return;
    }

    setIsUploading(true);

    try {
      // 1. Upload do áudio
      console.log('Fazendo upload do áudio...');
      const result = await uploadInterview(audioFile, candidateData.candidatePositionId);
      const interviewId = result.id;
      console.log('Upload concluído! Interview ID:', interviewId);
      
      // 2. Salvar dados do candidato
      console.log('Salvando dados do candidato...');
      await saveCandidateInfo(interviewId, {
        name: candidateData.candidateName,
        email: candidateData.candidateEmail,
        phone: candidateData.candidatePhone,
        notes: notes
      });
      console.log('Dados salvos!');
      
      // 3. Iniciar processamento em background (não espera terminar)
      processInBackground(interviewId);
      
      // 4. Navegar imediatamente para a página da entrevista
      localStorage.removeItem('interviewData');
      navigate(`/entrevista/${interviewId}`);
      
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert(`Erro ao fazer upload: ${error.message}\n\nVerifique se o backend está rodando.`);
      setIsUploading(false);
    }
  };

  const handleBack = () => {
    navigate('/tipo-entrevista');
  };

  if (!candidateData) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="upload-audio-container">
      <div className="upload-audio-content">
        <button className="back-button" onClick={handleBack}>
          ← Voltar
        </button>
        
        <h1 className="upload-title">Upload de Áudio</h1>
        <p className="upload-subtitle">
          Envie o arquivo de áudio da entrevista com {candidateData.candidateName}
        </p>

        <div 
          className={`upload-dropzone ${isDragging ? 'dragging' : ''} ${audioFile ? 'has-file' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClickUpload}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.m4a,.webm,.ogg,audio/*"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
          
          {!audioFile ? (
            <>
              <div className="upload-icon">📁</div>
              <p className="upload-text">Arraste o arquivo de áudio aqui</p>
              <p className="upload-subtext">ou clique para selecionar</p>
              <p className="upload-formats">Formatos aceitos: MP3, WAV, M4A, WebM, OGG</p>
            </>
          ) : (
            <>
              <div className="upload-icon success">✓</div>
              <p className="upload-filename">{audioFile.name}</p>
              <p className="upload-filesize">{formatFileSize(audioFile.size)}</p>
              <button 
                className="change-file-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClickUpload();
                }}
              >
                Alterar arquivo
              </button>
            </>
          )}
        </div>

        <div className="notes-section">
          <label htmlFor="notes">Anotações (opcional)</label>
          <textarea
            id="notes"
            className="notes-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Adicione observações sobre a entrevista..."
            rows={4}
          />
        </div>

        <button
          className="submit-btn"
          onClick={handleUpload}
          disabled={!audioFile || isUploading}
        >
          {isUploading ? 'Enviando...' : 'Enviar e Processar'}
        </button>

        {isUploading && (
          <p className="upload-info">
            O áudio está sendo enviado. Você será redirecionado para ver o processamento em tempo real.
          </p>
        )}
      </div>
    </div>
  );
}

export default UploadAudioPage;

