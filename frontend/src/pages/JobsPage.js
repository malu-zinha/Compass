import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Header } from '../components/layout';
import { getPositions, deletePosition } from '../services/api';
import './JobsPage.css';

function JobsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const data = await getPositions();
      setJobs(data);
    } catch (error) {
      console.error('Erro ao carregar cargos:', error);
      alert('Erro ao carregar cargos. Verifique se o backend está rodando.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditJob = (jobId) => {
    navigate(`/cargos/editar/${jobId}`);
  };

  const handleAddJob = () => {
    navigate('/cargos/novo');
  };

  const handleDeleteJob = async (jobId) => {
    if (window.confirm('Tem certeza que deseja excluir este cargo?')) {
      try {
        await deletePosition(jobId);
        setJobs(jobs.filter(job => job.id !== jobId));
      } catch (error) {
        console.error('Erro ao deletar cargo:', error);
        alert('Erro ao deletar cargo');
      }
    }
  };

  return (
    <div className="jobs-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header 
        title="Cargos"
        onMenuClick={() => setSidebarOpen(true)}
      />
      <div className="jobs-content">
        <div className="jobs-section">
          <div className="jobs-header">
            <h2 className="section-title">Cargos</h2>
            <button className="add-job-btn" onClick={handleAddJob}>
              + Adicionar cargo
            </button>
          </div>

          <div className="jobs-grid">
            {loading ? (
              <div className="empty-message">
                <p>Carregando cargos...</p>
              </div>
            ) : jobs.length === 0 ? (
              <div className="empty-message">
                <p>Nenhum cargo cadastrado ainda</p>
              </div>
            ) : jobs.map((job) => (
              <div key={job.id} className="job-card">
                <button 
                  className="delete-job-btn"
                  onClick={() => handleDeleteJob(job.id)}
                  aria-label="Excluir cargo"
                >
                  ×
                </button>
                <h3 className="job-card-title">{job.name}</h3>
                
                <div className="job-vacancies-badge">
                  {job.vacancies} {job.vacancies === 1 ? 'vaga disponível' : 'vagas disponíveis'}
                </div>

                <p className="job-card-description">{job.description}</p>

                <button 
                  className="edit-job-btn"
                  onClick={() => handleEditJob(job.id)}
                >
                  Editar cargo
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default JobsPage;

