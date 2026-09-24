import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listInterviews } from '../../../api/interviews';
import { paths } from '../../../app/paths';
import { useUserSettings } from '../../../auth/SettingsContext';
import { Button, DataTable, EmptyState, ErrorPanel, ScoreMeter, Skeleton, StatusBadge } from '../../../components/ui';
import { InterviewsIcon } from '../../../components/icons';
import { formatDate, formatDuration } from '../../../lib/format';
import styles from './VagaPage.module.css';

const MAX_COMPARE = 3;
const NOT_DONE = ['draft', 'recording', 'uploaded', 'transcribing', 'analyzing', 'error'];

/*
 * Ranking da vaga (entrevistas concluídas, da maior pontuação para a menor)
 * com seleção para comparar, e as entrevistas ainda sem resultado numa lista
 * à parte — não entram no ranking porque não têm pontuação.
 */
export default function CandidatosTab({ vagaId }) {
  const navigate = useNavigate();
  const { settings } = useUserSettings();
  const [state, setState] = useState({ loading: true, error: null, ranking: [], pending: [] });
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      listInterviews({ positionId: vagaId, status: 'done', sort: '-score', perPage: 100 }),
      listInterviews({ positionId: vagaId, status: NOT_DONE, sort: '-created_at', perPage: 100 }),
    ])
      .then(([done, pending]) => {
        if (active) setState({ loading: false, error: null, ranking: done.items, pending: pending.items });
      })
      .catch((error) => {
        if (active) setState({ loading: false, error, ranking: [], pending: [] });
      });
    return () => { active = false; };
  }, [vagaId]);

  const toggle = (id) => setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  if (state.error) return <ErrorPanel message="Não foi possível carregar os candidatos." onRetry={() => window.location.reload()} />;
  if (state.loading) {
    return <div className={styles.loading} aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} variant="block" className={styles.rowSkeleton} />)}</div>;
  }

  const columns = [
    {
      key: 'nome',
      header: 'Candidata',
      render: (i) => (
        <span className={styles.candidate}>
          <span className={styles.rank} aria-hidden="true">{state.ranking.indexOf(i) + 1}</span>
          {i.candidate_name || 'Candidato sem nome'}
        </span>
      ),
    },
    { key: 'data', header: 'Data', render: (i) => formatDate(i.created_at, settings) },
    { key: 'duracao', header: 'Duração', card: false, render: (i) => formatDuration(i.audio_duration_seconds) },
    {
      key: 'pontuacao',
      header: 'Pontuação',
      width: '200px',
      render: (i) => <ScoreMeter score={i.score} label={`Pontuação de ${i.candidate_name}`} variant="bar" showLabel={false} />,
    },
    {
      key: 'comparar',
      header: 'Comparar',
      align: 'end',
      render: (i) => (
        <input
          type="checkbox"
          className={styles.check}
          aria-label={`Comparar ${i.candidate_name}`}
          checked={selected.includes(i.id)}
          disabled={!selected.includes(i.id) && selected.length >= MAX_COMPARE}
          onChange={() => toggle(i.id)}
        />
      ),
    },
  ];

  return (
    <div className={styles.tab}>
      <section aria-labelledby="ranking-titulo">
        <h2 id="ranking-titulo" className={styles.sectionTitle}>Ranking</h2>
        <DataTable
          caption="Ranking de candidatos da vaga"
          columns={columns}
          rows={state.ranking}
          getRowKey={(i) => i.id}
          rowHref={(i) => paths.entrevista(i.id)}
          rowClassName={(i) => (selected.includes(i.id) ? styles.selectedRow : undefined)}
          empty={(
            <EmptyState
              icon={<InterviewsIcon size={24} />}
              title="Nenhuma entrevista concluída"
              description="O ranking aparece assim que a primeira entrevista desta vaga for analisada."
              action={<Button as={Link} to={paths.novaEntrevista(vagaId)} variant="primary">Nova entrevista</Button>}
            />
          )}
        />
      </section>

      {state.pending.length > 0 && (
        <section aria-labelledby="andamento-titulo">
          <h2 id="andamento-titulo" className={styles.sectionTitle}>Sem resultado ainda</h2>
          <ul className={styles.pending}>
            {state.pending.map((i) => (
              <li key={i.id}>
                <Link to={paths.entrevista(i.id)} className={styles.pendingRow}>
                  <span>{i.candidate_name || 'Candidato sem nome'}</span>
                  <span className={styles.muted}>{formatDate(i.created_at, settings)}</span>
                  <StatusBadge status={i.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {state.ranking.length > 1 && (
        <div className={styles.compareBar} role="region" aria-label="Comparação">
          <span className={styles.compareText}>
            {selected.length === 0 ? 'Marque de 2 a 3 candidatas para comparar' : <><strong>{selected.length}</strong> de {MAX_COMPARE} selecionadas</>}
          </span>
          <Button variant="primary" disabled={selected.length < 2} onClick={() => navigate(paths.comparar(vagaId, selected))}>
            Comparar selecionadas{selected.length ? ` (${selected.length})` : ''}
          </Button>
        </div>
      )}
    </div>
  );
}
