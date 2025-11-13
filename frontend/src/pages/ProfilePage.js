import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Header } from '../components/layout';
import './ProfilePage.css';

export default function ProfilePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    nome: 'Joaquim Germano',
    email: 'seuemail@gmail.com',
    cargo: 'Entrevistador',
    telefone: '(11) 98765-4321',
    empresa: 'Compass Tech',
    departamento: 'Recursos Humanos'
  });

  const [isEditing, setIsEditing] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = () => {
    setIsEditing(false);
    // Aqui você salvaria os dados no backend
    console.log('Dados salvos:', formData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Restaurar dados originais se necessário
  };

  return (
    <div className="profile-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header title="Perfil" onMenuClick={() => setSidebarOpen(true)} />
      
      <main className="profile-content">
        <div className="profile-container">
          {/* Profile Header */}
          <div className="profile-header">
            <div className="profile-avatar-section">
              <div className="profile-avatar">
                <span className="avatar-initials">JG</span>
              </div>
              <button className="change-avatar-btn">
                Alterar foto
              </button>
            </div>
            <div className="profile-header-info">
              <h1 className="profile-name">{formData.nome}</h1>
              <p className="profile-role">{formData.cargo}</p>
              <p className="profile-email">{formData.email}</p>
            </div>
          </div>

          {/* Profile Details */}
          <div className="profile-details">
            <div className="details-header">
              <h2 className="details-title">Informações Pessoais</h2>
              {!isEditing ? (
                <button className="edit-btn" onClick={() => setIsEditing(true)}>
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
                  <input
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    className="field-input"
                  />
                ) : (
                  <div className="field-value">{formData.nome}</div>
                )}
              </div>

              <div className="detail-field">
                <label className="field-label">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="field-input"
                  />
                ) : (
                  <div className="field-value">{formData.email}</div>
                )}
              </div>

              <div className="detail-field">
                <label className="field-label">Cargo</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="cargo"
                    value={formData.cargo}
                    onChange={handleInputChange}
                    className="field-input"
                  />
                ) : (
                  <div className="field-value">{formData.cargo}</div>
                )}
              </div>

              <div className="detail-field">
                <label className="field-label">Telefone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    className="field-input"
                  />
                ) : (
                  <div className="field-value">{formData.telefone}</div>
                )}
              </div>

              <div className="detail-field">
                <label className="field-label">Empresa</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="empresa"
                    value={formData.empresa}
                    onChange={handleInputChange}
                    className="field-input"
                  />
                ) : (
                  <div className="field-value">{formData.empresa}</div>
                )}
              </div>

              <div className="detail-field">
                <label className="field-label">Departamento</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="departamento"
                    value={formData.departamento}
                    onChange={handleInputChange}
                    className="field-input"
                  />
                ) : (
                  <div className="field-value">{formData.departamento}</div>
                )}
              </div>
            </div>

            <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(0, 0, 0, 0.08)', display: 'flex', justifyContent: 'center' }}>
              <button 
                className="security-btn danger"
                onClick={() => navigate('/')}
                style={{ fontFamily: 'Inter, sans-serif', padding: '0.65rem 1.5rem', fontSize: '0.9rem' }}
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

