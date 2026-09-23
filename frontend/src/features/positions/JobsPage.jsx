import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout';
import { listPositions, deletePosition } from '../../api/positions';
import './JobsPage.css';
import { useToast, useConfirm } from '../../components/ui';

function JobsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listPositions();
      setJobs(data.items);
    } catch (error) {
      console.error('Erro ao carregar cargos:', error);
      toast.error(error.detail || 'Erro ao carregar cargos. Verifique se o backend está rodando.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleEditJob = (jobId) => {
    navigate(`/cargos/editar/${jobId}`);
  };

  const handleAddJob = () => {
    navigate('/cargos/novo');
  };

  const handleDeleteJob = async (jobId) => {
    const confirmed = await confirm({
      title: 'Excluir cargo',
      message: 'Excluir este cargo também exclui todas as entrevistas, gravações e perguntas vinculadas. Deseja continuar?',
      confirmLabel: 'Excluir',
      tone: 'danger',
    });
    if (confirmed) {
      try {
        await deletePosition(jobId);
        setJobs(jobs.filter(job => job.id !== jobId));
      } catch (error) {
        console.error('Erro ao deletar cargo:', error);
        toast.error(error.detail || 'Erro ao deletar cargo');
      }
    }
  };

  return (
    <div className="jobs-page">
      <PageHeader title="Cargos" />
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
