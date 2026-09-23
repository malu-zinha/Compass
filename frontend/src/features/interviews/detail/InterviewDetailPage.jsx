import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '../../../components/layout';
import { useLayout } from '../../../app/AppLayout';
import { InfoModal } from '../../../components/common';
import { deleteInterview, reprocessInterview, updateInterview } from '../../../api/interviews';
import { useUserSettings } from '../../../auth/SettingsContext';
import { formatDate } from '../../../lib/format';
import { PROCESSING_STATUSES, STATUS_MESSAGES } from '../../../lib/transcript';
import { useInterview } from './useInterview';
import { useAudioPlayer } from './useAudioPlayer';
import AnalysisSections from './AnalysisSections';
import TranscriptView from './TranscriptView';
import AudioPlayer from './AudioPlayer';
import './InterviewDetailPage.css';

const INITIAL_SECTIONS = {
  habilidades: true,
  historico: false,
  positivos: false,
  negativos: false,
  especificas: false,
  pontuacao: false,
  anotacoes: false,
  qa: false,
  idealFit: false,
  askedQuestions: false,
};

const STATUS_TEXT_STYLE = {
  marginTop: '1rem',
  color: '#666',
  fontSize: '0.9rem',
  textAlign: 'center',
};

const DELETE_CONFIRMATION = 'Excluir esta entrevista e a gravação? Esta ação não pode ser desfeita.';

function InterviewDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openSidebar } = useLayout();
  const { settings } = useUserSettings();
  const { interview, questions, error, reload } = useInterview(id);
  const [showModal, setShowModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState(INITIAL_SECTIONS);
  const [isRetrying, setIsRetrying] = useState(false);
  const player = useAudioPlayer(
    id,
    Boolean(interview?.has_audio),
    interview?.transcript,
    interview?.audio_duration_seconds,
  );

  const hasTranscript = interview?.transcript?.length > 0;

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Dispara o reprocessamento e volta a acompanhar o status via polling.
  const reprocess = async (step) => {
    try {
      await reprocessInterview(id, step);
      reload();
      return true;
    } catch (err) {
      alert(err?.detail || 'Não foi possível reprocessar a entrevista.');
      return false;
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    await reprocess(hasTranscript ? 'analysis' : 'full');
    setIsRetrying(false);
  };

  const handleReanalyze = async () => {
    if (await reprocess('analysis')) setShowModal(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(DELETE_CONFIRMATION)) return;
    try {
      await deleteInterview(id);
      navigate('/entrevistas');
    } catch (err) {
      alert(err?.detail || 'Não foi possível excluir a entrevista.');
    }
  };

  // Rejeita em caso de erro para o InfoModal continuar em modo edição.
  const handleSave = async (data) => {
    try {
      await updateInterview(id, data);
      reload();
    } catch (err) {
      alert(err?.detail || 'Não foi possível salvar os dados do candidato.');
      throw err;
    }
  };

  if (!interview) {
    return (
      <div className="interview-detail-page">
        <Header 
          title={error ? 'Entrevista não encontrada' : 'Carregando entrevista...'}
          showInfo={false}
          onMenuClick={openSidebar}
        />
        <div style={{padding: '2rem', textAlign: 'center'}}>
          {!error && <div className="spinner" style={{margin: '0 auto'}}></div>}
          <p style={{marginTop: '1rem', color: '#666'}}>
            {error
              ? (error.detail || 'Não foi possível carregar a entrevista.')
              : 'Carregando dados da entrevista...'}
          </p>
        </div>
      </div>
    );
  }

  const { status } = interview;
  const isProcessing = PROCESSING_STATUSES.includes(status);
  const statusMessage = isProcessing ? STATUS_MESSAGES[status] : null;
  const date = formatDate(interview.created_at, settings);
  const candidateData = {
    candidateName: interview.candidate_name,
    candidateEmail: interview.candidate_email,
    candidatePhone: interview.candidate_phone,
  };
  const modalActions = [
    { label: 'Reanalisar', onClick: handleReanalyze, disabled: isProcessing || !hasTranscript },
    { label: 'Excluir entrevista', onClick: handleDelete, disabled: false },
  ];

  const renderResume = () => {
    if (isProcessing) {
      return (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p style={STATUS_TEXT_STYLE}>{statusMessage}</p>
        </div>
      );
    }
    if (status === 'error') {
      return (
        <div className="loading-overlay">
          <p style={STATUS_TEXT_STYLE}>
            {interview.error_message || 'Não foi possível processar a entrevista.'}
          </p>
          <button className="modal-btn-voltar" onClick={handleRetry} disabled={isRetrying}>
            Tentar novamente
          </button>
        </div>
      );
    }
    return (
      <AnalysisSections
        analysis={interview.analysis}
        notes={interview.notes}
        questions={questions}
        expandedSections={expandedSections}
        onToggleSection={toggleSection}
      />
    );
  };

  return (
    <div className="interview-detail-page">
      <Header 
        title={`${interview.candidate_name || 'Candidato sem nome'} - ${date}`}
        showInfo={true}
        onInfoClick={() => setShowModal(true)}
        onMenuClick={openSidebar}
      />
      
      <div className="detail-container">
        {/* Coluna Esquerda - Resumo */}
        <div className="resume-column">
          <h2 className="section-main-title">Resumo</h2>
          
          <div className="resume-content">
            {renderResume()}
          </div>
        </div>

        {/* Coluna Direita - Transcrição */}
        <div className="transcription-column">
          <h2 className="section-main-title">Transcrição</h2>

          <TranscriptView
            transcript={interview.transcript}
            speakerRoles={interview.analysis?.speaker_roles}
            activeMessageIndex={player.activeMessageIndex}
            statusMessage={statusMessage}
          />

          {interview.has_audio && <AudioPlayer player={player} />}
        </div>
      </div>

      <InfoModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        candidateData={candidateData}
        onSave={handleSave}
        actions={modalActions}
      />
    </div>
  );
}

export default InterviewDetailPage;
