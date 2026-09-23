import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../brand';
import MenuIcon from '../icons/MenuIcon';
import CompareIcon from '../icons/CompareIcon';
import InfoIcon from '../icons/InfoIcon';
import PlusIcon from '../icons/PlusIcon';
import './Header.css';

function Header({
  title, showComparar = false, compareLabel = 'Comparar', onCompareClick,
  showInfo = false, onInfoClick, onMenuClick, showMenu = true,
}) {
  const navigate = useNavigate();

  return (
    <header className="app-header">
      <div className="header-left">
        {showMenu && (
          <button className="menu-button" onClick={onMenuClick}>
            <MenuIcon size={24} />
          </button>
        )}
        <div className="header-logo">
          <Logo variant="full" />
        </div>
      </div>
      
      {title && (
        <h1 className="header-title">{title}</h1>
      )}
      
      <div className="header-actions">
        {showComparar && (
          <button className="header-btn btn-comparar" onClick={onCompareClick}>
            <CompareIcon size={16} />
            <span>{compareLabel}</span>
          </button>
        )}
        
        {showInfo && (
          <button className="header-btn btn-info" onClick={onInfoClick}>
            <InfoIcon size={16} />
            <span>Informações</span>
          </button>
        )}
        
        <button 
          className="header-btn btn-nova-entrevista"
          onClick={() => navigate('/nova-entrevista')}
        >
          <PlusIcon size={16} />
          <span>Nova entrevista</span>
        </button>
      </div>
    </header>
  );
}

export default Header;
