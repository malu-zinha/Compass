import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout';
import { useLayout } from '../../app/AppLayout';
import { useAuth } from '../../auth/AuthContext';
import { apiUrl } from '../../api/client';
import { updateMe, uploadAvatar } from '../../api/users';
import './ProfilePage.css';
import { useToast } from '../../components/ui';

const AVATAR_ACCEPT = 'image/png,image/jpeg,image/webp';

function toFormData(user) {
  return {
    nome: user?.name || '',
    email: user?.email || '',
    cargo: user?.job_title || '',
    telefone: user?.phone || '',
    empresa: user?.company || '',
    departamento: user?.department || '',
  };
}

function initialsOf(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfilePage() {
  const toast = useToast();
  const { openSidebar } = useLayout();
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuth();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState(() => toFormData(user));
  const [isEditing, setIsEditing] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEdit = () => {
    setFormData(toFormData(user));
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      const updated = await updateMe({
        name: formData.nome,
        email: formData.email,
        job_title: formData.cargo,
        phone: formData.telefone,
        company: formData.empresa,
        department: formData.departamento,
      });
      setUser(updated);
      setIsEditing(false);
    } catch (error) {
      toast.error(error.detail || 'Não foi possível salvar o perfil.');
    }
  };

  const handleChangePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const updated = await uploadAvatar(file);
      setUser(updated);
    } catch (error) {
      toast.error(error.detail || 'Não foi possível atualizar a foto.');
    }
  };

  return (
    <div className="profile-page">
      <Header title="Perfil" onMenuClick={openSidebar} />

      <main className="profile-content">
        <div className="profile-container">
          <div className="profile-header">
            <div className="profile-avatar-section">
              <div className="profile-avatar">
                {user?.avatar_url ? (
                  <img
                    alt="Foto de perfil"
                    src={apiUrl(user.avatar_url)}
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <span className="avatar-initials">{initialsOf(user?.name)}</span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={AVATAR_ACCEPT}
                hidden
                onChange={handleFileChange}
              />
              <button className="change-avatar-btn" onClick={handleChangePhotoClick}>
                Alterar foto
              </button>
            </div>
            <div className="profile-header-info">
              <h1 className="profile-name">{user?.name}</h1>
              <p className="profile-role">{user?.job_title}</p>
              <p className="profile-email">{user?.email}</p>
            </div>
          </div>

          <div className="profile-details">
            <div className="details-header">
              <h2 className="details-title">Informações Pessoais</h2>
              {!isEditing ? (
                <button className="edit-btn" onClick={handleEdit}>
                  Editar
                </button>
              ) : (
                <div className="edit-actions">
                  <button className="cancel-btn" onClick={handleCancel}>
                    Cancelar
                  </button>
                  <button className="save-btn" onClick={handleSave}>
                    Salvar
                  </button>
                </div>
              )}
            </div>

            <div className="details-grid">
              <div className="detail-field">
                <label className="field-label">Nome Completo</label>
                {isEditing ? (
                  <input type="text" name="nome" value={formData.nome} onChange={handleInputChange} className="field-input" />
                ) : (
                  <div className="field-value">{user?.name}</div>
                )}
              </div>

              <div className="detail-field">
                <label className="field-label">Email</label>
                {isEditing ? (
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="field-input" />
                ) : (
                  <div className="field-value">{user?.email}</div>
                )}
              </div>

              <div className="detail-field">
                <label className="field-label">Cargo</label>
                {isEditing ? (
                  <input type="text" name="cargo" value={formData.cargo} onChange={handleInputChange} className="field-input" />
                ) : (
                  <div className="field-value">{user?.job_title}</div>
                )}
              </div>

              <div className="detail-field">
                <label className="field-label">Telefone</label>
                {isEditing ? (
                  <input type="tel" name="telefone" value={formData.telefone} onChange={handleInputChange} className="field-input" />
                ) : (
                  <div className="field-value">{user?.phone}</div>
                )}
              </div>

              <div className="detail-field">
                <label className="field-label">Empresa</label>
                {isEditing ? (
                  <input type="text" name="empresa" value={formData.empresa} onChange={handleInputChange} className="field-input" />
                ) : (
                  <div className="field-value">{user?.company}</div>
                )}
              </div>

              <div className="detail-field">
                <label className="field-label">Departamento</label>
                {isEditing ? (
                  <input type="text" name="departamento" value={formData.departamento} onChange={handleInputChange} className="field-input" />
                ) : (
                  <div className="field-value">{user?.department}</div>
                )}
              </div>
            </div>

            <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(0, 0, 0, 0.08)', display: 'flex', justifyContent: 'center' }}>
              <button
                className="security-btn danger"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                style={{ fontFamily: 'var(--font-body)', padding: '0.65rem 1.5rem', fontSize: '0.9rem' }}
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
