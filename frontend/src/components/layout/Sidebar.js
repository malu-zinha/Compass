import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../../logo.svg';
import HomeIcon from '../icons/HomeIcon';
import InterviewsIcon from '../icons/InterviewsIcon';
import JobsIcon from '../icons/JobsIcon';
import QuestionsIcon from '../icons/QuestionsIcon';
import SettingsIcon from '../icons/SettingsIcon';
import UserIcon from '../icons/UserIcon';
import LogoutIcon from '../icons/LogoutIcon';
import './Sidebar.css';

function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLinkClick = (path) => {
    navigate(path);
    onClose();
  };

  const menuItems = [
    { path: '/inicio', label: 'Início', icon: HomeIcon },
    { path: '/entrevistas', label: 'Entrevistas', icon: InterviewsIcon },
    { path: '/cargos', label: 'Cargos', icon: JobsIcon },
    { path: '/perguntas', label: 'Perguntas', icon: QuestionsIcon },
    { path: null, label: 'Configurações', icon: SettingsIcon }
  ];

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose}></div>}
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src={logo} alt="Compass" className="logo-image" />
          </div>
        </div>

        <button 
          className="sidebar-user"
          onClick={() => handleLinkClick('/perfil')}
        >
          <div className="user-icon">
            <UserIcon size={24} color="#1a1a1a" />
          </div>
          <div className="user-info">
            <div className="user-name">{localStorage.getItem('userName') || 'Entrevistador'}</div>
            <div className="user-role">Entrevistador</div>
          </div>
        </button>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.path || item.label}
                className={`sidebar-nav-item ${item.path && location.pathname === item.path ? 'active' : ''}`}
                onClick={() => item.path ? handleLinkClick(item.path) : null}
                disabled={!item.path}
              >
                <span className="nav-icon">
                  <IconComponent size={20} color="#1a1a1a" />
                </span>
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-email">
            {localStorage.getItem('userEmail') || 'trilha@gmail.com'}
            <span className="email-arrow">
              <LogoutIcon size={16} color="#1a1a1a" />
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

export default Sidebar;

