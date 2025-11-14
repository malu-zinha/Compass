import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Header } from '../components/layout';
import { MicrophoneIcon, ChartIcon, BriefcaseIcon, FileTextIcon } from '../components/icons';
import './HomePage.css';

function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userFirstName, setUserFirstName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Pegar nome do usuário do localStorage
    const userName = localStorage.getItem('userName');
    if (userName) {
      // Pegar apenas o primeiro nome
      const firstName = userName.split(' ')[0];
      setUserFirstName(firstName);
    }
  }, []);

  return (
    <div className="home-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header title="Início" onMenuClick={() => setSidebarOpen(true)} />
      <div className="home-content">
        <div className="welcome-section">
          <h1 className="welcome-title">
            Bem-vindo ao Compass{userFirstName ? `, ${userFirstName}` : ''}
          </h1>
          <p className="welcome-subtitle">O que deseja fazer hoje?</p>
        </div>

        <div className="quick-actions">
          <div className="action-card" onClick={() => navigate('/nova-entrevista')}>
            <div className="action-icon" style={{ background: '#FFF4CD', color: '#6B5010' }}>
              <MicrophoneIcon size={32} color="#6B5010" />
            </div>
            <h3 className="action-title">Nova Entrevista</h3>
            <p className="action-description">Inicie uma nova entrevista com gravação e transcrição automática</p>
          </div>

          <div className="action-card" onClick={() => navigate('/ranking')}>
            <div className="action-icon" style={{ background: '#D2EAFF', color: '#092260' }}>
              <ChartIcon size={32} color="#092260" />
            </div>
            <h3 className="action-title">Ranking</h3>
            <p className="action-description">Veja o ranking e detalhes de todos os candidatos entrevistados</p>
          </div>

          <div className="action-card" onClick={() => navigate('/cargos')}>
            <div className="action-icon" style={{ background: '#FFE2DE', color: '#602309' }}>
              <BriefcaseIcon size={32} color="#602309" />
            </div>
            <h3 className="action-title">Cargos</h3>
            <p className="action-description">Gerencie os cargos e defina competências necessárias</p>
          </div>

          <div className="action-card" onClick={() => navigate('/perguntas')}>
            <div className="action-icon" style={{ background: '#E8F5E9', color: '#1B5E20' }}>
              <FileTextIcon size={32} color="#1B5E20" />
            </div>
            <h3 className="action-title">Perguntas</h3>
            <p className="action-description">Crie e organize perguntas para suas entrevistas</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;

