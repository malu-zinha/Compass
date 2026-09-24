import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deletePosition, listPositions } from '../../api/positions';
import { PageHeader } from '../../components/layout';
import { Button, Card, Chip, EmptyState, Skeleton, useConfirm, useToast } from '../../components/ui';
import { BriefcaseIcon, PlusIcon } from '../../components/icons';
import { vacanciesLabel } from '../interviews/results/RankingSelectPage';
import styles from './JobsPage.module.css';

const MAX_SKILLS = 5;

export default function JobsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleDeleteJob = async (job) => {
    const confirmed = await confirm({
      title: 'Excluir cargo',
      message: 'Excluir este cargo também exclui todas as entrevistas, gravações e perguntas vinculadas. Deseja continuar?',
      confirmLabel: 'Excluir',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await deletePosition(job.id);
      setJobs((list) => list.filter((j) => j.id !== job.id));
      toast.success(`Cargo "${job.name}" excluído.`);
    } catch (error) {
      console.error('Erro ao deletar cargo:', error);
      toast.error(error.detail || 'Erro ao deletar cargo');
    }
  };

  const newButton = (
    <Button as={Link} to="/cargos/novo" variant="secondary" icon={<PlusIcon size={16} />}>
      Novo cargo
    </Button>
  );

  return (
    <div className={styles.page}>
      <PageHeader title="Cargos" actions={newButton} />

      {loading ? (
        <div className={styles.grid} aria-busy="true">
          {[0, 1, 2].map((i) => <Skeleton key={i} variant="block" className={styles.skeleton} />)}
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={<BriefcaseIcon size={24} />}
          title="Nenhum cargo cadastrado ainda"
          description="Cargos agrupam as entrevistas e dizem à análise quais competências importam."
          action={<Button as={Link} to="/cargos/novo" variant="primary">Criar o primeiro cargo</Button>}
        />
      ) : (
        <ul className={styles.grid}>
          {jobs.map((job) => {
            const skills = job.skills ?? [];
            return (
              <li key={job.id}>
                <Card as="article" className={styles.card} aria-labelledby={`cargo-${job.id}`}>
                  <div className={styles.cardHead}>
                    <h2 id={`cargo-${job.id}`} className={styles.title}>{job.name}</h2>
                    <Chip tone={job.vacancies > 0 ? 'info' : 'neutral'}>
                      {job.vacancies > 0 ? vacanciesLabel(job.vacancies) : 'Sem vagas abertas'}
                    </Chip>
                  </div>
                  <p className={styles.description}>{job.description}</p>
                  {skills.length > 0 && (
                    <ul className={styles.skills} aria-label="Competências">
                      {skills.slice(0, MAX_SKILLS).map((s) => <li key={s}><Chip>{s}</Chip></li>)}
                      {skills.length > MAX_SKILLS && <li><Chip>+{skills.length - MAX_SKILLS}</Chip></li>}
                    </ul>
                  )}
                  <div className={styles.actions}>
                    <Button as={Link} to={`/cargos/editar/${job.id}`} variant="secondary" size="sm">
                      Editar cargo
                    </Button>
                    <Button as={Link} to={`/entrevistas/${job.id}`} variant="ghost" size="sm">
                      Ver ranking
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={styles.delete}
                      onClick={() => handleDeleteJob(job)}
                      aria-label="Excluir cargo"
                    >
                      Excluir
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
