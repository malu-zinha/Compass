import React, { useState } from 'react';
import { Sidebar, Header } from '../components/layout';
import './SettingsPage.css';

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Configurações gerais
  const [generalSettings, setGeneralSettings] = useState({
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    dateFormat: 'DD/MM/YYYY',
    notifications: true,
    emailNotifications: true
  });

  // Configurações de privacidade
  const [privacySettings, setPrivacySettings] = useState({
    profileVisible: true,
    showEmail: false,
    showPhone: false,
    shareAnalytics: true
  });

  // Configurações de entrevista
  const [interviewSettings, setInterviewSettings] = useState({
    autoTranscription: true,
    autoSave: true,
    recordAudio: true,
    recordVideo: false,
    qualityAudio: 'high',
    suggestQuestions: true
  });

  const handleGeneralChange = (key, value) => {
    setGeneralSettings({ ...generalSettings, [key]: value });
  };

  const handlePrivacyChange = (key, value) => {
    setPrivacySettings({ ...privacySettings, [key]: value });
  };

  const handleInterviewChange = (key, value) => {
    setInterviewSettings({ ...interviewSettings, [key]: value });
  };

  const handleSaveSettings = () => {
    console.log('Configurações salvas:', {
      generalSettings,
      privacySettings,
      interviewSettings
    });
    // Aqui você salvaria no backend
  };

  return (
    <div className="settings-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header title="Configurações" onMenuClick={() => setSidebarOpen(true)} />
      
      <main className="settings-content">
        <div className="settings-container">
          
          {/* General Settings */}
          <div className="settings-section">
            <h2 className="section-title">Configurações Gerais</h2>
            
            <div className="settings-grid">
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Idioma</div>
                  <div className="setting-description">Idioma da interface do sistema</div>
                </div>
                <select 
                  className="setting-select"
                  value={generalSettings.language}
                  onChange={(e) => handleGeneralChange('language', e.target.value)}
                >
                  <option value="pt-BR">Português (BR)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Español</option>
                </select>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Fuso Horário</div>
                  <div className="setting-description">Fuso horário para exibição de datas</div>
                </div>
                <select 
                  className="setting-select"
                  value={generalSettings.timezone}
                  onChange={(e) => handleGeneralChange('timezone', e.target.value)}
                >
                  <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                  <option value="America/New_York">New York (GMT-5)</option>
                  <option value="Europe/London">London (GMT+0)</option>
                </select>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Formato de Data</div>
                  <div className="setting-description">Como as datas serão exibidas</div>
                </div>
                <select 
                  className="setting-select"
                  value={generalSettings.dateFormat}
                  onChange={(e) => handleGeneralChange('dateFormat', e.target.value)}
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Notificações</div>
                  <div className="setting-description">Receber notificações no sistema</div>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox"
                    checked={generalSettings.notifications}
                    onChange={(e) => handleGeneralChange('notifications', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Notificações por Email</div>
                  <div className="setting-description">Receber resumos por email</div>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox"
                    checked={generalSettings.emailNotifications}
                    onChange={(e) => handleGeneralChange('emailNotifications', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="settings-section">
            <h2 className="section-title">Privacidade</h2>
            
            <div className="settings-grid">
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Perfil Visível</div>
                  <div className="setting-description">Permitir que outros usuários vejam seu perfil</div>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox"
                    checked={privacySettings.profileVisible}
                    onChange={(e) => handlePrivacyChange('profileVisible', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Mostrar Email</div>
                  <div className="setting-description">Exibir email publicamente no perfil</div>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox"
                    checked={privacySettings.showEmail}
                    onChange={(e) => handlePrivacyChange('showEmail', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Mostrar Telefone</div>
                  <div className="setting-description">Exibir telefone publicamente no perfil</div>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox"
                    checked={privacySettings.showPhone}
                    onChange={(e) => handlePrivacyChange('showPhone', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Compartilhar Analytics</div>
                  <div className="setting-description">Ajudar a melhorar o produto com dados anônimos</div>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox"
                    checked={privacySettings.shareAnalytics}
                    onChange={(e) => handlePrivacyChange('shareAnalytics', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Interview Settings */}
          <div className="settings-section">
            <h2 className="section-title">Entrevistas</h2>
            
            <div className="settings-grid">
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Transcrição Automática</div>
                  <div className="setting-description">Transcrever automaticamente durante gravação</div>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox"
                    checked={interviewSettings.autoTranscription}
                    onChange={(e) => handleInterviewChange('autoTranscription', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Salvar Automaticamente</div>
                  <div className="setting-description">Salvar progresso automaticamente</div>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox"
                    checked={interviewSettings.autoSave}
                    onChange={(e) => handleInterviewChange('autoSave', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Gravar Áudio</div>
                  <div className="setting-description">Gravar áudio durante entrevistas</div>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox"
                    checked={interviewSettings.recordAudio}
                    onChange={(e) => handleInterviewChange('recordAudio', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Gravar Vídeo</div>
                  <div className="setting-description">Gravar vídeo durante entrevistas</div>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox"
                    checked={interviewSettings.recordVideo}
                    onChange={(e) => handleInterviewChange('recordVideo', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Qualidade do Áudio</div>
                  <div className="setting-description">Qualidade de gravação de áudio</div>
                </div>
                <select 
                  className="setting-select"
                  value={interviewSettings.qualityAudio}
                  onChange={(e) => handleInterviewChange('qualityAudio', e.target.value)}
                >
                  <option value="low">Baixa (8 kbps)</option>
                  <option value="medium">Média (16 kbps)</option>
                  <option value="high">Alta (32 kbps)</option>
                </select>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Sugerir Perguntas</div>
                  <div className="setting-description">Sugerir perguntas durante entrevista</div>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox"
                    checked={interviewSettings.suggestQuestions}
                    onChange={(e) => handleInterviewChange('suggestQuestions', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="settings-actions">
            <button className="save-settings-btn" onClick={handleSaveSettings}>
              Salvar Configurações
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

