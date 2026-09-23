import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createInterview, deleteInterview, uploadInterviewAudio } from '../../../api/interviews';
import { FolderIcon, CheckIcon } from '../../../components/icons';
import { useInterviewDraft } from './useInterviewDraft';
import './UploadAudioPage.css';

function UploadAudioPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { draft, clearDraft } = useInterviewDraft();
  // Evita que o redirecionamento por "sem rascunho" dispare de novo quando o
  // próprio clearDraft() do fluxo de sucesso zera o draft.
  const isNavigatingAwayRef = useRef(false);

  const [audioFile, setAudioFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  useEffect(() => {
    if (!draft && !isNavigatingAwayRef.current) {
      navigate('/nova-entrevista');
    }
  }, [draft, navigate]);

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

    if (!draft) {
      alert('Dados da entrevista não encontrados!');
      return;
    }

    setIsUploading(true);
    let createdId = null;

    try {
      setUploadProgress('Criando entrevista...');
      const created = await createInterview({
        position_id: draft.position_id,
        candidate_name: draft.candidate_name,
        candidate_email: draft.candidate_email,
        candidate_phone: draft.candidate_phone,
        recording_consent: draft.recording_consent,
        mode: 'upload',
        notes: notes.trim(),
      });
      createdId = created.id;

      setUploadProgress('Fazendo upload do áudio...');
      await uploadInterviewAudio(createdId, audioFile);

      isNavigatingAwayRef.current = true;
      clearDraft();
      navigate(`/entrevista/${createdId}`);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      if (createdId != null) {
        try {
          await deleteInterview(createdId);
        } catch {
          // A entrevista órfã não pôde ser removida; nada mais a fazer aqui.
        }
      }
      alert(error.detail || 'Erro ao processar o áudio. Verifique se o backend está rodando.');
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const handleBack = () => {
    navigate('/tipo-entrevista');
  };

  if (!draft) {
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
          Envie o arquivo de áudio da entrevista com {draft.candidate_name}
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
              <div className="upload-icon">
                <FolderIcon size={64} />
              </div>
              <p className="upload-text">Arraste o arquivo de áudio aqui</p>
              <p className="upload-subtext">ou clique para selecionar</p>
              <p className="upload-formats">Formatos aceitos: MP3, WAV, M4A, WebM, OGG</p>
            </>
          ) : (
            <>
              <div className="upload-icon success">
                <CheckIcon size={48} />
              </div>
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
          disabled={!audioFile || isUploading}
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
