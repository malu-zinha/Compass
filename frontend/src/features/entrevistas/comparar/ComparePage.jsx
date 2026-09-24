import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { compareInterviews } from '../../../api/comparisons';
import { getInterview } from '../../../api/interviews';
import { paths } from '../../../app/paths';
import { PageHeader } from '../../../components/layout';
import { Button, Chip, Skeleton, useToast } from '../../../components/ui';
import { ChartIcon } from '../../../components/icons';
import { scoreToPercent } from '../../../lib/format';
import { scoreBand, SUBSCORES } from '../../../lib/score';
import PointsList from '../PointsList';
import styles from './ComparePage.module.css';

const MIN_COMPARE = 2;
const MAX_COMPARE = 3;

function parseIds(value) {
  const ids = (value || '').split(',').map(Number).filter((id) => Number.isInteger(id) && id > 0);
  return [...new Set(ids)];
}

// Linhas da matriz: pontuação geral e as quatro competências.
const ROWS = [
  { key: 'overall', label: 'Geral', get: (i) => i.score },
  ...SUBSCORES.map(([key, label]) => ({ key, label, get: (i) => i.analysis?.score?.subscores?.[key] })),
];

function Cell({ value, best }) {
  const band = scoreBand(value);
  if (!band) return <td className={styles.cell}><span className={styles.muted}>—</span></td>;
  const percent = scoreToPercent(value);
  return (
    <td className={`${styles.cell} ${best ? styles.best : ''}`}>
      <span className={styles.value}>
        {percent}%
        {best && <span className={styles.bestTag}>maior</span>}
      </span>
      <span className={styles.track} aria-hidden="true">
        <span className={`${styles.fill} ${styles[band.tone]}`} style={{ width: `${percent}%` }} />
      </span>
    </td>
  );
}

export default function ComparePage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { id: vagaId } = useParams();
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
      navigate(paths.vaga(vagaId), { replace: true });
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
        navigate(paths.vaga(vagaId), { replace: true });
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ids, validIds, navigate, toast, vagaId]);

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

  const vagaName = interviews[0]?.position_name ?? 'Vaga';
  const breadcrumbs = [{ label: 'Vagas', to: paths.vagas }, { label: vagaName, to: paths.vaga(vagaId) }];
  const ranking = comparison ? [...comparison.ranking].sort((a, b) => a.rank - b.rank) : [];

  if (!validIds || loading) {
    return (
      <div className={styles.page} aria-busy="true">
        <PageHeader title="Comparar" breadcrumbs={breadcrumbs} />
        <Skeleton variant="block" className={styles.skeleton} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader title="Comparar" breadcrumbs={breadcrumbs} />

      <header className={styles.head}>
        <h2 className={styles.title}>{interviews.map((i) => i.candidate_name).join(' × ')}</h2>
        <p className={styles.lead}>Lado a lado, na vaga {vagaName}. O maior valor de cada linha está destacado.</p>
      </header>

      <section aria-labelledby="matriz">
        <h2 id="matriz" className={styles.sectionTitle}>Pontuação</h2>
        <div className={styles.tableWrap}>
          <table className={styles.matrix}>
            <caption className="sr-only">Pontuação geral e por competência de cada candidata</caption>
            <thead>
              <tr>
                <th scope="col" className={styles.rowHead}>Critério</th>
                {interviews.map((i) => (
                  <th key={i.id} scope="col">
                    <Link to={paths.entrevista(i.id)} className={styles.candidate}>{i.candidate_name}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => {
                const values = interviews.map(row.get);
                const max = Math.max(...values.filter((v) => v !== null && v !== undefined));
                const ties = values.filter((v) => v === max).length;
                return (
                  <tr key={row.key} className={row.key === 'overall' ? styles.overall : undefined}>
                    <th scope="row" className={styles.rowHead}>{row.label}</th>
                    {values.map((v, idx) => <Cell key={interviews[idx].id} value={v} best={v === max && ties < values.length} />)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="pontos" className={styles.pointsSection}>
        <h2 id="pontos" className={styles.sectionTitle}>Pontos fortes e de atenção</h2>
        <div className={styles.points} style={{ '--cols': interviews.length }}>
          {interviews.map((i) => (
            <article key={i.id} className={styles.pointsCol} aria-labelledby={`nome-${i.id}`}>
              <h3 id={`nome-${i.id}`} className={styles.pointsName}>{i.candidate_name}</h3>
              <PointsList items={i.analysis?.positives || []} empty="Nenhuma informação coletada" />
              <PointsList items={i.analysis?.negatives || []} tone="negative" empty="Nenhuma informação coletada" />
              {i.analysis?.skills?.length > 0 && (
                <ul className={styles.chips} aria-label={`Habilidades de ${i.candidate_name}`}>
                  {i.analysis.skills.map((s) => <li key={s}><Chip>{s}</Chip></li>)}
                </ul>
              )}
              {i.analysis?.ideal_profile_fit && <p className={styles.fit}>{i.analysis.ideal_profile_fit}</p>}
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="parecer" className={styles.verdict}>
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
                  <span className={styles.rank}>{item.rank}</span>
                  <span><strong>{nameOf(item.interview_id)}</strong> — {item.rationale}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    </div>
  );
}
