import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Header } from '../components/layout';
import './ProfilePage.css';

export default function ProfilePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    nome: 'Nicolas Kleiton',
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
                <span className="avatar-initials">NK</span>
              </div>
              <button className="change-avatar-btn">
                📷 Alterar foto
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
                  ✏️ Editar
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
          </div>

          {/* Activity Stats */}
          <div className="profile-stats">
            <h2 className="stats-title">Estatísticas</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-icon" style={{ background: '#EDE9FF', color: '#371C68' }}>
                  🎤
                </div>
                <div className="stat-info">
                  <div className="stat-number">24</div>
                  <div className="stat-label">Entrevistas realizadas</div>
                </div>
              </div>

              <div className="stat-item">
                <div className="stat-icon" style={{ background: '#D2EAFF', color: '#092260' }}>
                  👥
                </div>
                <div className="stat-info">
                  <div className="stat-number">18</div>
                  <div className="stat-label">Candidatos aprovados</div>
                </div>
              </div>

              <div className="stat-item">
                <div className="stat-icon" style={{ background: '#FFE2DE', color: '#602309' }}>
                  💼
                </div>
                <div className="stat-info">
                  <div className="stat-number">5</div>
                  <div className="stat-label">Cargos gerenciados</div>
                </div>
              </div>

              <div className="stat-item">
                <div className="stat-icon" style={{ background: '#E8F5E9', color: '#1B5E20' }}>
                  ⭐
                </div>
                <div className="stat-info">
                  <div className="stat-number">4.8</div>
                  <div className="stat-label">Média de avaliação</div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="profile-security">
            <h2 className="security-title">Segurança</h2>
            <div className="security-actions">
              <button className="security-btn">
                🔒 Alterar senha
              </button>
              <button className="security-btn">
                🔐 Autenticação em dois fatores
              </button>
              <button className="security-btn danger">
                🗑️ Excluir conta
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

