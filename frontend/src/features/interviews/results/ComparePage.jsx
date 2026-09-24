import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { compareInterviews } from '../../../api/comparisons';
import { getInterview } from '../../../api/interviews';
import { PageHeader } from '../../../components/layout';
import { Button, Card, Chip, ScoreMeter, Skeleton, useToast } from '../../../components/ui';
import { ChartIcon } from '../../../components/icons';
import { SUBSCORES } from '../../../lib/score';
import PointsList from '../../entrevistas/PointsList';
import styles from './ComparePage.module.css';
import { paths } from '../../../app/paths';

const MIN_COMPARE = 2;
const MAX_COMPARE = 3;

function parseIds(value) {
  const ids = (value || '').split(',').map(Number).filter((id) => Number.isInteger(id) && id > 0);
  return [...new Set(ids)];
}

function CompareColumn({ interview, leader }) {
  const analysis = interview.analysis || {};
  const subscores = analysis.score?.subscores || {};
  return (
    <Card as="article" className={`${styles.column} ${leader ? styles.leader : ''}`}>
      <header className={styles.columnHead}>
        <div className={styles.identity}>
          {leader && <Chip tone="info" className={styles.leaderChip}>Maior pontuação</Chip>}
          <h3 className={styles.name}>{interview.candidate_name}</h3>
          <span className={styles.meta}>{interview.position_name}</span>
        </div>
        <ScoreMeter score={interview.score} label={`Pontuação geral de ${interview.candidate_name}`} size="md" />
      </header>

      <section className={styles.block}>
        <h4 className={styles.blockTitle}>Por competência</h4>
        <div className={styles.bars}>
          {SUBSCORES.map(([key, label]) => (
            <ScoreMeter key={key} score={subscores[key]} label={label} variant="bar" />
          ))}
        </div>
      </section>

      <section className={styles.block}>
        <h4 className={styles.blockTitle}>Pontos fortes</h4>
        <PointsList items={analysis.positives || []} empty="Nenhuma informação coletada" />
      </section>

      <section className={styles.block}>
        <h4 className={styles.blockTitle}>Pontos de atenção</h4>
        <PointsList items={analysis.negatives || []} tone="negative" empty="Nenhuma informação coletada" />
      </section>

      <section className={styles.block}>
        <h4 className={styles.blockTitle}>Habilidades</h4>
        {analysis.skills?.length ? (
          <ul className={styles.chips}>{analysis.skills.map((s) => <li key={s}><Chip>{s}</Chip></li>)}</ul>
        ) : (
          <p className={styles.muted}>Nenhuma informação coletada</p>
        )}
      </section>

      <section className={styles.block}>
        <h4 className={styles.blockTitle}>Aderência ao perfil ideal</h4>
        <p className={styles.text}>{analysis.ideal_profile_fit || 'Nenhuma informação coletada'}</p>
      </section>
    </Card>
  );
}

export default function ComparePage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const idsParam = searchParams.get('ids');
  const ids = useMemo(() => parseIds(idsParam), [idsParam]);
  const validIds = ids.length >= MIN_COMPARE && ids.length <= MAX_COMPARE;
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comparison, setComparison] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!validIds) {
      navigate(paths.vagas, { replace: true });
      return undefined;
    }
    let active = true;
    setLoading(true);
    setComparison(null);
    Promise.all(ids.map((id) => getInterview(id)))
      .then((data) => { if (active) setInterviews(data); })
      .catch((error) => {
        if (!active) return;
        console.error('Erro ao carregar entrevistas para comparar:', error);
        toast.error(error.detail || 'Erro ao carregar as entrevistas. Tente novamente.');
        navigate(paths.vagas, { replace: true });
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ids, validIds, navigate, toast]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setComparison(await compareInterviews(ids));
    } catch (error) {
      console.error('Erro ao gerar parecer da IA:', error);
      toast.error(error.detail || 'Erro ao gerar o parecer da IA. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const nameOf = (interviewId) => (
    interviews.find((item) => item.id === interviewId)?.candidate_name || `Entrevista ${interviewId}`
  );

  const leaderId = interviews.reduce(
    (best, item) => ((item.score ?? -1) > (best?.score ?? -1) ? item : best),
    null,
  )?.id;
  const ranking = comparison ? [...comparison.ranking].sort((a, b) => a.rank - b.rank) : [];

  return (
    <div className={styles.page}>
      <PageHeader title="Comparar candidatos" />

      {!validIds || loading ? (
        <div className={styles.columns} aria-busy="true">
          {[0, 1, 2].slice(0, Math.max(ids.length, 2)).map((i) => (
            <Skeleton key={i} variant="block" className={styles.skeleton} />
          ))}
        </div>
      ) : (
        <>
          <section aria-labelledby="lado-a-lado">
            <h2 id="lado-a-lado" className="sr-only">Candidatos lado a lado</h2>
            <div className={styles.columns}>
              {interviews.map((item) => (
                <CompareColumn key={item.id} interview={item} leader={item.id === leaderId && item.score != null} />
              ))}
            </div>
          </section>

          <Card as="section" aria-labelledby="parecer" className={styles.verdict}>
            <div className={styles.verdictHead}>
              <div>
                <h2 id="parecer" className={styles.verdictTitle}>Parecer da IA</h2>
                <p className={styles.muted}>Uma leitura comparativa das entrevistas, com ranking justificado.</p>
              </div>
              <Button variant="primary" icon={<ChartIcon size={16} />} onClick={handleGenerate} loading={generating}>
                {generating ? 'Gerando parecer...' : comparison ? 'Gerar de novo' : 'Gerar parecer da IA'}
              </Button>
            </div>

            {comparison && (
              <div className={styles.verdictBody}>
                <p className={styles.summary}>{comparison.summary}</p>
                <ol className={styles.ranking}>
                  {ranking.map((item) => (
                    <li key={item.interview_id}>
                      <span className={`${styles.rank} ${item.rank === 1 ? styles.first : ''}`}>{item.rank}</span>
                      <span>
                        <strong>{nameOf(item.interview_id)}</strong> — {item.rationale}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
