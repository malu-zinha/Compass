import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listPositions } from '../../../api/positions';
import { Button, Card, Checkbox, Field, Input, Select, useToast } from '../../../components/ui';
import { useInterviewDraft } from './useInterviewDraft';
import styles from './flow.module.css';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function NewInterviewPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { draft, saveDraft } = useInterviewDraft();

  // Voltar do passo seguinte reabre o formulário preenchido.
  const [form, setForm] = useState(() => ({
    name: draft?.candidate_name ?? '',
    email: draft?.candidate_email ?? '',
    phone: draft?.candidate_phone ?? '',
    positionId: draft?.position_id ? String(draft.position_id) : '',
    consent: draft?.recording_consent ?? false,
  }));
  const [positions, setPositions] = useState(null);
  const [touched, setTouched] = useState({});

  const loadPositions = useCallback(async () => {
    try {
      const data = await listPositions();
      setPositions(data.items);
    } catch (error) {
      console.error('Erro ao carregar cargos:', error);
      toast.error(error.detail || 'Erro ao carregar cargos. Verifique se o backend está rodando.');
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
  const touch = (key) => () => setTouched((t) => ({ ...t, [key]: true }));

  const emailError = touched.email && form.email && !EMAIL.test(form.email) ? 'E-mail inválido.' : undefined;
  const valid = form.name.trim() && EMAIL.test(form.email.trim()) && form.phone.trim() && form.positionId && form.consent;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!valid) return;
    const position = positions?.find((p) => p.id === Number(form.positionId));
    saveDraft({
      candidate_name: form.name.trim(),
      candidate_email: form.email.trim(),
      candidate_phone: form.phone.trim(),
      position_id: Number(form.positionId),
      position_name: position?.name ?? '',
      recording_consent: form.consent,
    });
    navigate('/tipo-entrevista');
  };

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <div className={styles.intro}>
          <h1 className={styles.title}>Nova entrevista</h1>
          <p className={styles.subtitle}>Quem você vai entrevistar e para qual cargo?</p>
        </div>

        <Card as="form" id="nova-entrevista" onSubmit={handleSubmit} noValidate>
          <div className={styles.form}>
            <Field label="Nome do candidato" required className={styles.full}>
              <Input value={form.name} onChange={set('name')} autoComplete="name" />
            </Field>
            <Field label="E-mail" required error={emailError}>
              <Input type="email" value={form.email} onChange={set('email')} onBlur={touch('email')} autoComplete="email" />
            </Field>
            <Field label="Telefone" required>
              <Input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
            </Field>
            <Field label="Cargo" required className={styles.full}>
              <Select value={form.positionId} onChange={set('positionId')} disabled={positions === null}>
                <option value="">{positions === null ? 'Carregando cargos...' : 'Selecione um cargo'}</option>
                {(positions ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            {positions?.length === 0 && (
              <p className={`${styles.hint} ${styles.full}`}>
                Nenhum cargo cadastrado. <Link to="/cargos/novo">Crie um cargo</Link> para continuar.
              </p>
            )}
            <div className={`${styles.consent} ${styles.full}`}>
              <Checkbox
                label="Confirmo que o candidato autorizou a gravação e o processamento da entrevista."
                checked={form.consent}
                onChange={set('consent')}
              />
            </div>
          </div>
        </Card>

        <div className={styles.footer}>
          <Button type="submit" form="nova-entrevista" variant="primary" size="lg" disabled={!valid}>
            Continuar
          </Button>
        </div>
      </div>
    </div>
  );
}
