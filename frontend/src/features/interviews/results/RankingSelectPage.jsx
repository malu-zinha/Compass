import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPositions } from '../../../api/positions';
import { PageHeader } from '../../../components/layout';
import { Button, Card, Chip, EmptyState, Skeleton, useToast } from '../../../components/ui';
import { BriefcaseIcon, ChartIcon, ChevronRightIcon } from '../../../components/icons';
import styles from './RankingSelectPage.module.css';

export const vacanciesLabel = (n) => `${n} ${n === 1 ? 'vaga disponível' : 'vagas disponíveis'}`;

export default function RankingSelectPage() {
  const toast = useToast();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPositions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listPositions();
      setPositions(data.items);
    } catch (error) {
      console.error('Erro ao carregar cargos:', error);
      toast.error(error.detail || 'Erro ao carregar cargos. Verifique se o backend está rodando.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  return (
    <div className={styles.page}>
      <PageHeader title="Ranking" />
      <p className={styles.lead}>Escolha um cargo para comparar os candidatos, ou veja todos juntos.</p>

      <ul className={styles.grid} aria-busy={loading}>
        <li>
          <Card as={Link} to="/entrevistas" variant="interactive" className={`${styles.card} ${styles.all}`}>
            <span className={styles.icon}><ChartIcon size={22} /></span>
            <span className={styles.body}>
              <span className={styles.title}>Todos os candidatos</span>
              <span className={styles.text}>Ranking geral, de todos os cargos</span>
            </span>
            <ChevronRightIcon size={18} className={styles.chevron} />
          </Card>
        </li>
        {loading
          ? [0, 1, 2].map((i) => <li key={i}><Skeleton variant="block" className={styles.skeleton} /></li>)
          : positions.map((position) => (
            <li key={position.id}>
              <Card as={Link} to={`/entrevistas/${position.id}`} variant="interactive" className={styles.card}>
                <span className={styles.icon}><BriefcaseIcon size={22} /></span>
                <span className={styles.body}>
                  <span className={styles.title}>{position.name}</span>
                  {position.description && <span className={styles.text}>{position.description}</span>}
                  {position.vacancies > 0 && (
                    <Chip tone="info" className={styles.chip}>{vacanciesLabel(position.vacancies)}</Chip>
                  )}
                </span>
                <ChevronRightIcon size={18} className={styles.chevron} />
              </Card>
            </li>
          ))}
      </ul>

      {!loading && positions.length === 0 && (
        <EmptyState
          icon={<BriefcaseIcon size={24} />}
          title="Nenhum cargo cadastrado"
          description="Crie um cargo para agrupar entrevistas e ver o ranking por vaga."
          action={<Button as={Link} to="/cargos/novo" variant="primary">Criar cargo</Button>}
        />
      )}
    </div>
  );
}
