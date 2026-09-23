import React, { useEffect, useState } from 'react';
import './InfoModal.css';

const FIELDS = [
  { name: 'candidate_name', label: 'Nome', dataKey: 'candidateName', type: 'text' },
  { name: 'candidate_email', label: 'Email', dataKey: 'candidateEmail', type: 'email' },
  { name: 'candidate_phone', label: 'Número', dataKey: 'candidatePhone', type: 'tel' },
];

const toForm = (candidateData) => Object.fromEntries(
  FIELDS.map(({ name, dataKey }) => [name, candidateData?.[dataKey] || '']),
);

// `onSave(data)` recebe { candidate_name, candidate_email, candidate_phone };
// se rejeitar, o modal continua em edição (quem chamou já avisou o erro).
// `actions` = [{ label, onClick, disabled }], renderizadas no rodapé.
function InfoModal({ isOpen, onClose, candidateData, onSave, actions = [] }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(() => toForm(candidateData));
  const [wasOpen, setWasOpen] = useState(isOpen);

  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (!isOpen) setIsEditing(false);
  }

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

  const startEditing = () => {
    setForm(toForm(candidateData));
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(form);
      setIsEditing(false);
    } catch {
      // Mantém o modo edição para o usuário corrigir e tentar de novo.
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (name) => (e) => {
    const { value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
          {FIELDS.map(({ name, label, dataKey, type }) => (
            <div className="modal-field" key={name}>
              <label>{label}</label>
              <div className="field-value">
                {isEditing ? (
                  <input
                    type={type}
                    aria-label={label}
                    value={form[name]}
                    onChange={handleChange(name)}
                  />
                ) : (
                  candidateData?.[dataKey] || '-'
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="modal-footer">
          {isEditing ? (
            <>
              <button className="modal-btn-voltar" onClick={() => setIsEditing(false)} disabled={isSaving}>
                Cancelar
              </button>
              <button className="modal-btn-voltar" onClick={handleSave} disabled={isSaving}>
                Salvar
              </button>
            </>
          ) : (
            <>
              {onSave && (
                <button className="modal-btn-voltar" onClick={startEditing}>
                  Editar
                </button>
              )}
              {actions.map((action) => (
                <button
                  key={action.label}
                  className="modal-btn-voltar"
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  {action.label}
                </button>
              ))}
              <button className="modal-btn-voltar" onClick={onClose}>
                Voltar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default InfoModal;
