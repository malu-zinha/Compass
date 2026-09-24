import { useState } from 'react';
import { Button, Field, Input, Modal } from '../../../components/ui';
import styles from './CandidateModal.module.css';

const FIELDS = [
  { name: 'candidate_name', label: 'Nome', type: 'text', autoComplete: 'name' },
  { name: 'candidate_email', label: 'E-mail', type: 'email', autoComplete: 'email' },
  { name: 'candidate_phone', label: 'Telefone', type: 'tel', autoComplete: 'tel' },
];

const toForm = (interview) => Object.fromEntries(FIELDS.map(({ name }) => [name, interview?.[name] || '']));

/*
 * Edição dos dados do candidato. `onSave(data)` recebe { candidate_name,
 * candidate_email, candidate_phone }; se rejeitar, o diálogo continua aberto
 * com o que foi digitado (quem chamou já avisou o erro).
 */
export default function CandidateModal({ open, onClose, interview, onSave }) {
  const [form, setForm] = useState(() => toForm(interview));
  const [saving, setSaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);

  // Ao reabrir, parte sempre dos dados atuais da entrevista.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setForm(toForm(interview));
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch {
      // Mantém aberto para corrigir e tentar de novo.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Dados do candidato"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" form="candidate-form" variant="primary" loading={saving}>Salvar</Button>
        </>
      }
    >
      <form id="candidate-form" onSubmit={handleSubmit} className={styles.form}>
        {FIELDS.map(({ name, label, type, autoComplete }) => (
          <Field key={name} label={label}>
            <Input
              type={type}
              autoComplete={autoComplete}
              value={form[name]}
              onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
            />
          </Field>
        ))}
      </form>
    </Modal>
  );
}
