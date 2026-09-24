import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createInterview, deleteInterview, uploadInterviewAudio } from '../../../api/interviews';
import { Button, Card, Field, Textarea, useToast } from '../../../components/ui';
import { CheckIcon, UploadIcon } from '../../../components/icons';
import { useInterviewDraft } from './useInterviewDraft';
import flow from './flow.module.css';
import styles from './UploadAudioPage.module.css';
import { paths } from '../../../app/paths';

const VALID_TYPES = ['audio/mp3', 'audio/wav', 'audio/mpeg', 'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/x-m4a'];
const VALID_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.webm', '.ogg'];
// Espelha MAX_UPLOAD_MB do backend (padrão 200): recusar aqui poupa um upload inteiro.
export const MAX_UPLOAD_MB = Number(import.meta.env.VITE_MAX_UPLOAD_MB) || 200;

export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${Math.round((bytes / 1024 ** i) * 10) / 10} ${units[i]}`;
}

export function validateAudio(file) {
  const extension = `.${file.name.split('.').pop().toLowerCase()}`;
  if (!VALID_TYPES.includes(file.type) && !VALID_EXTENSIONS.includes(extension)) {
    return 'Formato não aceito. Envie MP3, WAV, M4A, WebM ou OGG.';
  }
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return `O arquivo tem ${formatFileSize(file.size)}; o limite é ${MAX_UPLOAD_MB} MB.`;
  }
  return null;
}

export default function UploadAudioPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const { draft, clearDraft } = useInterviewDraft();
  // Evita que o redirecionamento por "sem rascunho" dispare de novo quando o
  // próprio clearDraft() do fluxo de sucesso zera o draft.
  const leavingRef = useRef(false);

  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [notes, setNotes] = useState('');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');

  useEffect(() => {
    if (!draft && !leavingRef.current) navigate(paths.novaEntrevista());
  }, [draft, navigate]);

  const selectFile = (candidate) => {
    if (!candidate) return;
    const error = validateAudio(candidate);
    setFileError(error);
    setFile(error ? null : candidate);
  };

  const handleUpload = async () => {
    if (!file || !draft) return;
    setUploading(true);
    let createdId = null;
    try {
      setProgress('Criando entrevista...');
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

      setProgress('Enviando o áudio...');
      await uploadInterviewAudio(createdId, file);

      leavingRef.current = true;
      clearDraft();
      navigate(paths.entrevista(createdId));
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      if (createdId != null) {
        try {
          await deleteInterview(createdId);
        } catch {
          // A entrevista órfã não pôde ser removida; nada mais a fazer aqui.
        }
      }
      toast.error(error.detail || 'Erro ao processar o áudio. Verifique se o backend está rodando.');
      setUploading(false);
      setProgress('');
    }
  };

  if (!draft) return null;

  const zoneClass = [
    styles.dropzone,
    dragging && styles.dragging,
    file && styles.hasFile,
    fileError && styles.invalid,
    uploading && styles.busy,
  ].filter(Boolean).join(' ');

  return (
    <div className={flow.page}>
      <div className={flow.wrap}>
        <div className={flow.intro}>
          <h1 className={flow.title}>Enviar áudio</h1>
          <p className={flow.subtitle}>A gravação da entrevista com {draft.candidate_name}.</p>
        </div>

        {/* O <label> inteiro abre o seletor; o input é focável por teclado e anuncia o nome. */}
        <label
          className={zoneClass}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!uploading) selectFile(e.dataTransfer.files[0]);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".mp3,.wav,.m4a,.webm,.ogg,audio/*"
            className="sr-only"
            aria-label="Arquivo de áudio"
            aria-describedby="upload-regras"
            onChange={(e) => { selectFile(e.target.files[0]); e.target.value = ''; }}
            disabled={uploading}
          />
          <span className={styles.icon} aria-hidden="true">
            {file ? <CheckIcon size={28} /> : <UploadIcon size={28} />}
          </span>
          {file ? (
            <>
              <span className={styles.filename}>{file.name}</span>
              <span className={styles.meta}>{formatFileSize(file.size)} · clique para trocar</span>
            </>
          ) : (
            <>
              <span className={styles.lead}>{dragging ? 'Solte para enviar' : 'Arraste o áudio aqui ou clique para escolher'}</span>
              <span id="upload-regras" className={styles.meta}>MP3, WAV, M4A, WebM ou OGG, até {MAX_UPLOAD_MB} MB</span>
            </>
          )}
          {fileError && <span className={styles.error} role="alert">{fileError}</span>}
        </label>

        <Card>
          <Field label="Anotações (opcional)" hint="Contexto que ajuda a análise: impressões, pontos a investigar.">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} disabled={uploading} />
          </Field>
        </Card>

        <div className={flow.footer}>
          <Button variant="ghost" onClick={() => navigate(paths.tipoEntrevista)} disabled={uploading}>Voltar</Button>
          <Button variant="primary" size="lg" onClick={handleUpload} disabled={!file} loading={uploading}>
            {uploading ? progress || 'Processando...' : 'Enviar e Processar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
