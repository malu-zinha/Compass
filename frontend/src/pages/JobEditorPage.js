import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import './JobEditorPage.css';

function JobEditorPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [jobName, setJobName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobVacancies, setJobVacancies] = useState('');
  const [competencies, setCompetencies] = useState([]);
  const [competencyInput, setCompetencyInput] = useState('');
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
    if (e.key === 'Enter' && competencyInput.trim()) {
      e.preventDefault();
      if (!competencies.includes(competencyInput.trim())) {
        setCompetencies([...competencies, competencyInput.trim()]);
      }
      setCompetencyInput('');
    }
  };

  const handleRemoveCompetency = (index) => {
    setCompetencies(competencies.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const savedJobs = localStorage.getItem('jobs');
    let jobs = savedJobs ? JSON.parse(savedJobs) : [];

    const jobData = {
      id: isEditing ? id : Date.now().toString(),
      name: jobName,
      description: jobDescription,
      vacancies: parseInt(jobVacancies) || 0,
      competencies: competencies,
      idealProfile: idealProfile
    };

    if (isEditing) {
      jobs = jobs.map(j => j.id === id ? jobData : j);
    } else {
      jobs.push(jobData);
    }

    localStorage.setItem('jobs', JSON.stringify(jobs));
    navigate('/cargos');
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
                <label className="form-label">Nome</label>
                <div className="form-input-wrapper">
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
                <label className="form-label">Descrição da vaga</label>
                <div className="form-input-wrapper">
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
                <label className="form-label">Competências necessárias</label>
                <div className="competencies-section">
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
                  </div>
                  <input
                    type="text"
                    className="competency-input"
                    value={competencyInput}
                    onChange={(e) => setCompetencyInput(e.target.value)}
                    onKeyDown={handleAddCompetency}
                    placeholder="Digite e pressione Enter para adicionar"
                  />
                </div>
              </div>

              <div className="form-section">
                <label className="form-label">Número de vagas disponíveis</label>
                <div className="form-input-wrapper">
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

