import { useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../../api/client';
import { updateMe, uploadAvatar } from '../../api/users';
import { useAuth } from '../../auth/AuthContext';
import { Avatar, Button, Card, Field, Input, useToast } from '../../components/ui';
import { LogoutIcon } from '../../components/icons';
import styles from './PerfilSection.module.css';
import { paths } from '../../app/paths';

const AVATAR_ACCEPT = 'image/png,image/jpeg,image/webp';

const FIELDS = [
  { key: 'name', label: 'Nome completo', type: 'text', autoComplete: 'name' },
  { key: 'email', label: 'E-mail', type: 'email', autoComplete: 'email' },
  { key: 'job_title', label: 'Cargo', type: 'text', autoComplete: 'organization-title' },
  { key: 'phone', label: 'Telefone', type: 'tel', autoComplete: 'tel' },
  { key: 'company', label: 'Empresa', type: 'text', autoComplete: 'organization' },
  { key: 'department', label: 'Departamento', type: 'text' },
];

const toForm = (user) => Object.fromEntries(FIELDS.map(({ key }) => [key, user?.[key] || '']));

export default function PerfilSection() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuth();
  const fileInputRef = useRef(null);
  const fileId = useId();

  const [form, setForm] = useState(() => toForm(user));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const startEditing = () => {
    setForm(toForm(user));
    setEditing(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await updateMe(form);
      setUser(updated);
      setEditing(false);
      toast.success('Perfil atualizado.');
    } catch (error) {
      toast.error(error.detail || 'Não foi possível salvar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      setUser(await uploadAvatar(file));
    } catch (error) {
      toast.error(error.detail || 'Não foi possível atualizar a foto.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.section}>

      <Card className={styles.banner}>
        <Avatar
          src={user?.avatar_url ? apiUrl(user.avatar_url) : undefined}
          name={user?.name}
          alt="Foto de perfil"
          size="xl"
        />
        <div className={styles.identity}>
          <h2 className={styles.name}>{user?.name}</h2>
          <p className={styles.role}>{user?.job_title}</p>
          <p className={styles.email}>{user?.email}</p>
        </div>
        <div className={styles.photo}>
          <input
            ref={fileInputRef}
            id={fileId}
            type="file"
            accept={AVATAR_ACCEPT}
            className="sr-only"
            aria-label="Alterar foto"
            onChange={handleFileChange}
            tabIndex={-1}
          />
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()} loading={uploading}>
            Alterar foto
          </Button>
          <span className={styles.photoHint}>PNG, JPG ou WebP, até 2 MB</span>
        </div>
      </Card>

      <Card as="form" onSubmit={handleSave} className={styles.details} aria-labelledby="info-pessoal">
        <div className={styles.detailsHead}>
          <h2 id="info-pessoal" className={styles.sectionTitle}>Informações pessoais</h2>
          {editing ? (
            <div className={styles.actions}>
              <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>
              <Button type="submit" variant="primary" loading={saving}>Salvar</Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={startEditing}>Editar</Button>
          )}
        </div>

        {editing ? (
          <div className={styles.grid}>
            {FIELDS.map(({ key, label, type, autoComplete }) => (
              <Field key={key} label={label}>
                <Input
                  type={type}
                  autoComplete={autoComplete}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </Field>
            ))}
          </div>
        ) : (
          <dl className={styles.grid}>
            {FIELDS.map(({ key, label }) => (
              <div key={key} className={styles.item}>
                <dt>{label}</dt>
                <dd>{user?.[key] || <span className={styles.empty}>Não informado</span>}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>

      <Card className={styles.session}>
        <div>
          <h2 className={styles.sectionTitle}>Sessão</h2>
          <p className={styles.muted}>Sair encerra a sessão neste navegador.</p>
        </div>
        <Button
          variant="ghost"
          icon={<LogoutIcon size={16} />}
          className={styles.logout}
          onClick={() => {
            logout();
            navigate(paths.landing);
          }}
        >
          Sair da conta
        </Button>
      </Card>
    </div>
  );
}
