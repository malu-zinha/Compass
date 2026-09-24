import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createPosition, getPosition, updatePosition } from '../../api/positions';
import { PageHeader } from '../../components/layout';
import { Button, Card, Field, Input, Skeleton, Textarea, useToast } from '../../components/ui';
import SkillsInput from './SkillsInput';
import styles from './JobEditorPage.module.css';
import { paths } from '../../app/paths';

const EMPTY = { name: '', description: '', vacancies: '', skills: [], idealProfile: '' };

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Dê um nome ao cargo.';
  if (!form.description.trim()) errors.description = 'Descreva a vaga.';
  if (form.skills.length === 0) errors.skills = 'Adicione pelo menos uma competência.';
  return errors;
}

export default function JobEditorPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEditing) return undefined;
    let active = true;
    getPosition(id)
      .then((position) => {
        if (!active) return;
        setForm({
          name: position.name,
          description: position.description,
          vacancies: String(position.vacancies ?? ''),
          skills: position.skills || [],
          idealProfile: position.ideal_profile || '',
        });
        setLoading(false);
      })
      .catch((error) => {
        console.error('Erro ao carregar cargo:', error);
        toast.error(error.detail || 'Erro ao carregar cargo. Verifique se o backend está rodando.');
        navigate(paths.vagas);
      });
    return () => { active = false; };
  }, [id, isEditing, navigate, toast]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const onText = (key) => (event) => set(key)(event.target.value);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    const payload = {
      name: form.name.trim(),
      skills: form.skills,
      description: form.description.trim(),
      ideal_profile: form.idealProfile,
      vacancies: Math.max(0, parseInt(form.vacancies, 10) || 0),
    };

    setSaving(true);
    try {
      if (isEditing) {
        await updatePosition(id, payload);
        toast.success('Cargo atualizado com sucesso!');
      } else {
        await createPosition(payload);
        toast.success('Cargo salvo com sucesso!');
      }
      navigate(paths.vagas);
    } catch (error) {
      console.error('Erro ao salvar cargo:', error);
      toast.error(error.detail || 'Erro ao salvar cargo. Verifique se o backend está rodando.');
      setSaving(false);
    }
  };

  const title = isEditing ? 'Editar cargo' : 'Novo cargo';

  if (loading) {
    return (
      <div className={styles.page} aria-busy="true">
        <PageHeader title={title} />
        <Skeleton variant="block" className={styles.skeleton} />
      </div>
    );
  }

  return (
    <form className={styles.page} onSubmit={handleSubmit} noValidate>
      <PageHeader title={title} />

      <div className={styles.grid}>
        <Card className={styles.section}>
          <h2 className={styles.sectionTitle}>A vaga</h2>
          <Field label="Nome" required error={errors.name}>
            <Input value={form.name} onChange={onText('name')} placeholder="Ex.: Desenvolvedora Frontend" />
          </Field>
          <Field label="Descrição da vaga" required error={errors.description}>
            <Textarea value={form.description} onChange={onText('description')} rows={5} />
          </Field>
          <Field
            label="Competências necessárias"
            required
            error={errors.skills}
            hint="Usadas pela análise para pontuar cada entrevista."
          >
            <SkillsInput value={form.skills} onChange={set('skills')} />
          </Field>
          <Field label="Vagas disponíveis" className={styles.narrow}>
            <Input
              type="number"
              inputMode="numeric"
              min="0"
              value={form.vacancies}
              onChange={onText('vacancies')}
              placeholder="0"
            />
          </Field>
        </Card>

        <Card className={styles.section}>
          <h2 className={styles.sectionTitle}>Para a análise</h2>
          <Field
            label="Perfil ideal"
            hint="Descreva com suas palavras quem se sairia bem nesta vaga. A análise compara cada candidato com este texto."
          >
            <Textarea value={form.idealProfile} onChange={onText('idealProfile')} rows={12} className={styles.tall} />
          </Field>
        </Card>
      </div>

      <div className={styles.footer}>
        <Button as={Link} to={paths.vagas} variant="ghost">Cancelar</Button>
        <Button type="submit" variant="primary" loading={saving}>Salvar cargo</Button>
      </div>
    </form>
  );
}
