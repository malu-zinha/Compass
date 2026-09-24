import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createInterview } from '../../../api/interviews';
import { listPositions } from '../../../api/positions';
import { paths } from '../../../app/paths';
import { Button, Card, Checkbox, Field, Input, Select, useToast } from '../../../components/ui';
import { MicrophoneIcon, UploadIcon } from '../../../components/icons';
import { useInterviewDraft } from './useInterviewDraft';
import styles from './flow.module.css';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FORMATS = [
  { value: 'live', title: 'Ao vivo', text: 'Grave pelo microfone, com transcrição em tempo real e perguntas sugeridas.', Icon: MicrophoneIcon },
  { value: 'upload', title: 'Enviar áudio', text: 'Envie a gravação de uma entrevista que já aconteceu.', Icon: UploadIcon },
];

/*
 * Passo 1 do fluxo: quem, para qual vaga e em que formato. Ao vivo cria a
 * entrevista e vai gravar; envio guarda um rascunho e segue para o upload
 * (a entrevista só é criada quando o áudio sobe).
 */
export default function NovaEntrevistaPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { draft, saveDraft, clearDraft } = useInterviewDraft();

  // Voltar do envio reabre o formulário preenchido; ?vaga= pré-seleciona a vaga.
  const [form, setForm] = useState(() => ({
    name: draft?.candidate_name ?? '',
    email: draft?.candidate_email ?? '',
    phone: draft?.candidate_phone ?? '',
    positionId: draft?.position_id ? String(draft.position_id) : searchParams.get('vaga') ?? '',
    consent: draft?.recording_consent ?? false,
    format: draft ? 'upload' : 'live',
  }));
  const [positions, setPositions] = useState(null);
  const [touched, setTouched] = useState({});
  const [creating, setCreating] = useState(false);

  const loadPositions = useCallback(async () => {
    try {
      setPositions((await listPositions()).items);
    } catch (error) {
      console.error('Erro ao carregar vagas:', error);
      toast.error(error.detail || 'Erro ao carregar as vagas. Verifique se o backend está rodando.');
      setPositions([]);
    }
  }, [toast]);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const emailError = touched.email && form.email && !EMAIL.test(form.email) ? 'E-mail inválido.' : undefined;
  const valid = form.name.trim() && EMAIL.test(form.email.trim()) && form.phone.trim() && form.positionId && form.consent;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!valid) return;
    const data = {
      candidate_name: form.name.trim(),
      candidate_email: form.email.trim(),
      candidate_phone: form.phone.trim(),
      position_id: Number(form.positionId),
      recording_consent: form.consent,
    };

    if (form.format === 'upload') {
      const position = positions?.find((p) => p.id === data.position_id);
      saveDraft({ ...data, position_name: position?.name ?? '' });
      navigate(paths.enviar);
      return;
    }

    setCreating(true);
    try {
      const created = await createInterview({ ...data, mode: 'live' });
      clearDraft();
      navigate(paths.gravar(created.id));
    } catch (error) {
      console.error('Erro ao criar entrevista:', error);
      toast.error(error.detail || 'Erro ao criar entrevista. Verifique se o backend está rodando.');
      setCreating(false);
    }
  };

  return (
    <div className={styles.page}>
      <form className={`${styles.wrap} ${styles.wide}`} onSubmit={handleSubmit} noValidate>
        <div className={styles.intro}>
          <h1 className={styles.title}>Nova entrevista</h1>
          <p className={styles.subtitle}>Quem você vai entrevistar, para qual vaga, e como.</p>
        </div>

        <Card as="section" aria-labelledby="candidato-titulo">
          <h2 id="candidato-titulo" className={styles.blockTitle}>Candidato</h2>
          <div className={styles.form}>
            <Field label="Nome do candidato" required className={styles.full}>
              <Input value={form.name} onChange={set('name')} autoComplete="name" />
            </Field>
            <Field label="E-mail" required error={emailError}>
              <Input type="email" value={form.email} onChange={set('email')} onBlur={() => setTouched((t) => ({ ...t, email: true }))} autoComplete="email" />
            </Field>
            <Field label="Telefone" required>
              <Input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
            </Field>
            <Field label="Vaga" required className={styles.full}>
              <Select value={form.positionId} onChange={set('positionId')} disabled={positions === null}>
                <option value="">{positions === null ? 'Carregando vagas...' : 'Selecione uma vaga'}</option>
                {(positions ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            {positions?.length === 0 && (
              <p className={`${styles.hint} ${styles.full}`}>
                Nenhuma vaga cadastrada. <Link to={paths.novaVaga}>Crie uma vaga</Link> para continuar.
              </p>
            )}
          </div>
        </Card>

        <fieldset className={styles.formats}>
          <legend className={styles.blockTitle}>Formato</legend>
          {FORMATS.map(({ value, title, text, Icon }) => (
            <label key={value} className={styles.format}>
              <input
                type="radio"
                name="formato"
                value={value}
                checked={form.format === value}
                onChange={set('format')}
                className={styles.formatInput}
              />
              <span className={styles.optionIcon} aria-hidden="true"><Icon size={22} /></span>
              <span className={styles.optionTitle}>{title}</span>
              <span className={styles.optionText}>{text}</span>
            </label>
          ))}
        </fieldset>

        <div className={styles.consent}>
          <Checkbox
            label="Confirmo que o candidato autorizou a gravação e o processamento da entrevista."
            checked={form.consent}
            onChange={set('consent')}
          />
        </div>

        <div className={styles.footer}>
          <Button type="submit" variant="primary" size="lg" disabled={!valid} loading={creating}>
            {form.format === 'live' ? 'Começar gravação' : 'Continuar para envio'}
          </Button>
        </div>
      </form>
    </div>
  );
}
