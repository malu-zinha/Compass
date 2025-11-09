import React, { useEffect } from 'react';
import './InfoModal.css';

function InfoModal({ isOpen, onClose, candidateData }) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Informações</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="modal-body">
          <div className="modal-field">
            <label>Nome</label>
            <div className="field-value">{candidateData?.candidateName || '-'}</div>
          </div>
          
          <div className="modal-field">
            <label>Email</label>
            <div className="field-value">{candidateData?.candidateEmail || '-'}</div>
          </div>
          
          <div className="modal-field">
            <label>Número</label>
            <div className="field-value">{candidateData?.candidatePhone || '-'}</div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="modal-btn-voltar" onClick={onClose}>
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}

export default InfoModal;
