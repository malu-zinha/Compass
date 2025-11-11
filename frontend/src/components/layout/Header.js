import React from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../logo.svg';
import MenuIcon from '../icons/MenuIcon';
import CompareIcon from '../icons/CompareIcon';
import InfoIcon from '../icons/InfoIcon';
import PlusIcon from '../icons/PlusIcon';
import './Header.css';

function Header({ title, showComparar = false, showInfo = false, onInfoClick, onMenuClick, showMenu = true }) {
  const navigate = useNavigate();

  return (
    <header className="app-header">
      <div className="header-left">
        {showMenu && (
          <button className="menu-button" onClick={onMenuClick}>
            <MenuIcon size={24} color="#1a1a1a" />
          </button>
        )}
        <div className="header-logo">
          <img src={logo} alt="Compass" className="logo-image" />
        </div>
      </div>
      
      {title && (
        <h1 className="header-title">{title}</h1>
      )}
      
      <div className="header-actions">
        {showComparar && (
          <button className="header-btn btn-comparar">
            <CompareIcon size={16} color="#371C68" />
            <span>Comparar</span>
          </button>
        )}
        
        {showInfo && (
          <button className="header-btn btn-info" onClick={onInfoClick}>
            <InfoIcon size={16} color="#371C68" />
            <span>Informações</span>
          </button>
        )}
        
        <button 
          className="header-btn btn-nova-entrevista"
          onClick={() => navigate('/nova-entrevista')}
        >
          <PlusIcon size={16} color="#371C68" />
          <span>Nova entrevista</span>
        </button>
      </div>
    </header>
  );
}

export default Header;
