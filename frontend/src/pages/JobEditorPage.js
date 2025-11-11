import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sidebar, Header } from '../components/layout';
import { createPosition, getPositions } from '../services/api';
import './JobEditorPage.css';

function JobEditorPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [jobName, setJobName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobVacancies, setJobVacancies] = useState('');
  const [competencies, setCompetencies] = useState([]);
  const [competencyInput, setCompetencyInput] = useState('');
  const [isAddingCompetency, setIsAddingCompetency] = useState(false);
  const [idealProfile, setIdealProfile] = useState('');
  
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  useEffect(() => {
    if (isEditing) {
      // Carregar dados do cargo para edição
      const savedJobs = localStorage.getItem('jobs');
      if (savedJobs) {
        const jobs = JSON.parse(savedJobs);
        const job = jobs.find(j => j.id === id);
        if (job) {
          setJobName(job.name);
          setJobDescription(job.description);
          setJobVacancies(job.vacancies.toString());
          setCompetencies(job.competencies || []);
          setIdealProfile(job.idealProfile || '');
        }
      }
    }
  }, [id, isEditing]);

  const handleAddCompetency = (e) => {
    if (e.key === 'Enter' && competencyInput && competencyInput.trim()) {
      e.preventDefault();
      if (!competencies.includes(competencyInput.trim())) {
        setCompetencies([...competencies, competencyInput.trim()]);
      }
      setCompetencyInput('');
      setIsAddingCompetency(false);
    }
    if (e.key === 'Escape') {
      setCompetencyInput('');
      setIsAddingCompetency(false);
    }
  };

  const handleAddCompetencyClick = () => {
    setIsAddingCompetency(true);
    setCompetencyInput('');
  };

  const handleCompetencyInputBlur = () => {
    if (competencyInput && competencyInput.trim() && !competencies.includes(competencyInput.trim())) {
      setCompetencies([...competencies, competencyInput.trim()]);
    }
    setCompetencyInput('');
    setIsAddingCompetency(false);
  };

  const handleRemoveCompetency = (index) => {
    setCompetencies(competencies.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!jobName || !jobDescription || competencies.length === 0) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (isEditing) {
        alert('Edição ainda não implementada no backend');
        return;
      }
      
      await createPosition({
        name: jobName,
        competencies: competencies,
        description: jobDescription
      });
      alert('Cargo salvo com sucesso!');
      navigate('/cargos');
    } catch (error) {
      console.error('Erro ao salvar cargo:', error);
      alert('Erro ao salvar cargo. Verifique se o backend está rodando.');
    }
  };

  return (
    <div className="job-editor-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header 
        title="Editar cargo"
        onMenuClick={() => setSidebarOpen(true)}
      />
      <div className="job-editor-content">
        <div className="editor-container">
          <h2 className="editor-title">Cargo 1</h2>

          <div className="editor-grid">
            <div className="editor-left">
              <div className="form-section">
                <div className="form-input-wrapper">
                  <label className="form-label">Nome</label>
                  <input
                    type="text"
                    className="form-input"
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                    placeholder="Nome do cargo"
                  />
                </div>
              </div>

              <div className="form-section">
                <div className="form-input-wrapper">
                  <label className="form-label">Descrição da vaga</label>
                  <textarea
                    className="form-textarea"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Descrição da vaga"
                    rows="4"
                  />
                </div>
              </div>

              <div className="form-section">
                <div className="competencies-section">
                  <label className="form-label">Competências necessárias</label>
                  <div className="competency-input-wrapper">
                    <div className="competencies-tags">
                      {competencies.map((comp, index) => (
                        <div key={index} className="competency-tag">
                          <span>{comp}</span>
                          <button
                            className="remove-tag-btn"
                            onClick={() => handleRemoveCompetency(index)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {isAddingCompetency && (
                        <div className="competency-tag editing">
                          <input
                            type="text"
                            className="competency-tag-input"
                            value={competencyInput}
                            onChange={(e) => setCompetencyInput(e.target.value)}
                            onKeyDown={handleAddCompetency}
                            onBlur={handleCompetencyInputBlur}
                            autoFocus
                            placeholder="Digite a competência"
                          />
                        </div>
                      )}
                      <button
                        className="add-competency-btn"
                        onClick={handleAddCompetencyClick}
                      >
                        Adicionar competência
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="form-input-wrapper">
                  <label className="form-label">Número de vagas disponíveis</label>
                  <input
                    type="number"
                    className="form-input"
                    value={jobVacancies}
                    onChange={(e) => setJobVacancies(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="editor-right">
              <div className="ideal-profile-section">
                <label className="form-label">
                  Descreva com suas palavras o "Perfil Ideal" para esta vaga:
                </label>
                <textarea
                  className="ideal-profile-textarea"
                  value={idealProfile}
                  onChange={(e) => setIdealProfile(e.target.value)}
                  placeholder="Descreva o perfil ideal..."
                />
              </div>
            </div>
          </div>

          <button className="save-job-btn" onClick={handleSave}>
            Salvar cargo
          </button>
        </div>
      </div>
    </div>
  );
}

export default JobEditorPage;

