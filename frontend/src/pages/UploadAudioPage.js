import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { uploadAudioFile, transcribeAudioFile, generateAnalysis, updateInterviewNotes } from '../services/api';
import './UploadAudioPage.css';

function UploadAudioPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  
  const [interviewId, setInterviewId] = useState(null);
  const [candidateData, setCandidateData] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  useEffect(() => {
    // Pegar dados do state da navegação
    if (location.state?.interviewId && location.state?.candidateData) {
      setInterviewId(location.state.interviewId);
      setCandidateData(location.state.candidateData);
      console.log('Interview ID recebido:', location.state.interviewId);
    } else {
      // Fallback: tentar localStorage
      const savedData = localStorage.getItem('interviewData');
      if (!savedData) {
        alert('Dados da entrevista não encontrados');
        navigate('/nova-entrevista');
        return;
      }
      setCandidateData(JSON.parse(savedData));
    }
  }, [location, navigate]);

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

  const handleUpload = async () => {
    if (!audioFile) {
      alert('Por favor, selecione um arquivo de áudio');
      return;
    }

    if (!interviewId) {
      alert('ID da entrevista não encontrado!');
      return;
    }

    setIsUploading(true);

    try {
      // 0. Salvar anotações primeiro
      if (notes.trim()) {
        setUploadProgress('Salvando anotações...');
        console.log('Salvando anotações...');
        await updateInterviewNotes(interviewId, notes);
        console.log('Anotações salvas!');
      }
      
      // 1. Upload do áudio
      setUploadProgress('Fazendo upload do áudio...');
      console.log('Fazendo upload do áudio...');
      await uploadAudioFile(interviewId, audioFile);
      console.log('Upload concluído!');
      
      // 2. Transcrever áudio
      setUploadProgress('Transcrevendo áudio (isso pode demorar)...');
      console.log('Transcrevendo áudio...');
      await transcribeAudioFile(interviewId);
      console.log('Transcrição concluída!');
      
      // 3. Gerar análise
      setUploadProgress('Gerando análise completa...');
      console.log('Gerando análise...');
      await generateAnalysis(interviewId);
      console.log('Análise concluída!');
      
      // 4. Navegar para a página da entrevista
      setUploadProgress('Processamento concluído!');
      localStorage.removeItem('interviewData');
      
      setTimeout(() => {
        navigate(`/entrevista/${interviewId}`);
      }, 500);
      
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert(`Erro ao processar: ${error.message}\n\nVerifique se o backend está rodando.`);
      setIsUploading(false);
      setUploadProgress('');
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
        <button className="back-button" onClick={handleBack} disabled={isUploading}>
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
          onClick={!isUploading ? handleClickUpload : undefined}
          style={{ cursor: isUploading ? 'not-allowed' : 'pointer' }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.m4a,.webm,.ogg,audio/*"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
            disabled={isUploading}
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
              {!isUploading && (
                <button 
                  className="change-file-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClickUpload();
                  }}
                >
                  Alterar arquivo
                </button>
              )}
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
            disabled={isUploading}
          />
        </div>

        <button
          className="submit-btn"
          onClick={handleUpload}
          disabled={!audioFile || isUploading || !interviewId}
        >
          {isUploading ? uploadProgress || 'Processando...' : 'Enviar e Processar'}
        </button>

        {isUploading && (
          <p className="upload-info" style={{ marginTop: '1rem', textAlign: 'center', color: '#6b7280' }}>
            {uploadProgress}
          </p>
        )}
      </div>
    </div>
  );
}

export default UploadAudioPage;
