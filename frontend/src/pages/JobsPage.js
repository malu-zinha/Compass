import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import './JobsPage.css';

function JobsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [jobs, setJobs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Carregar cargos do localStorage
    const savedJobs = localStorage.getItem('jobs');
    if (savedJobs) {
      setJobs(JSON.parse(savedJobs));
    } else {
      // Mock data inicial
      const mockJobs = [
        {
          id: '1',
          name: 'Cientista de Dados',
          description: 'Um cientista de dados coleta, organiza e analisa grandes volumes de dados para extrair insights e apoiar decisões estratégicas. Ele usa estatística e aprendizado de máquina para transformar dados brutos em informações úteis.',
          competencies: ['Python', 'Frontend avançado', 'C++'],
          vacancies: 6
        }
      ];
      setJobs(mockJobs);
      localStorage.setItem('jobs', JSON.stringify(mockJobs));
    }
  }, []);

  const handleEditJob = (jobId) => {
    navigate(`/cargos/editar/${jobId}`);
  };

  const handleAddJob = () => {
    navigate('/cargos/novo');
  };

  return (
    <div className="jobs-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header 
        title="Cargos"
        onMenuClick={() => setSidebarOpen(true)}
      />
      <div className="jobs-content">
        <div className="jobs-header">
          <h2 className="jobs-title">Cargos</h2>
          <button className="add-job-btn" onClick={handleAddJob}>
            + Adicionar cargo
          </button>
        </div>

        <div className="jobs-grid">
          {jobs.map((job) => (
            <div key={job.id} className="job-card">
              <h3 className="job-card-title">{job.name}</h3>
              
              <div className="job-vacancies-badge">
                {job.vacancies} vagas disponíveis
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
  );
}

export default JobsPage;

