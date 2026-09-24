import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { listInterviews } from '../../../api/interviews';
import { getPosition } from '../../../api/positions';
import { useUserSettings } from '../../../auth/SettingsContext';
import { PageHeader } from '../../../components/layout';
import {
  Button, Card, Chip, EmptyState, ScoreMeter, Skeleton, StatusBadge, useToast,
} from '../../../components/ui';
import { CalendarIcon, ClockIcon, CompareIcon, InterviewsIcon } from '../../../components/icons';
import { formatDate, formatDuration } from '../../../lib/format';
import { PROCESSING_STATUSES } from '../../../lib/transcript';
import { vacanciesLabel } from './RankingSelectPage';
import PointsList from './PointsList';
import styles from './ResultsPage.module.css';

const PER_PAGE = 20;
const RANKING_SIZE = 5;
const MAX_COMPARE = 3;
const PENDING_STATUSES = ['draft', ...PROCESSING_STATUSES];

function pendingText(status) {
  if (status === 'error') return 'Falha no processamento';
  if (PENDING_STATUSES.includes(status)) return 'Aguardando análise';
  return null;
}

function InterviewCard({ interview, settings, showPosition, selecting, selected, selectable, onToggle }) {
  const pending = pendingText(interview.status);
  const canCompare = interview.status === 'done';
  return (
    <Card as="article" className={`${styles.card} ${selected ? styles.cardSelected : ''}`}>
      {selecting && canCompare && (
        <input
          type="checkbox"
          className={styles.check}
          aria-label={`Selecionar ${interview.candidate_name}`}
          checked={selected}
          disabled={!selectable}
          onChange={onToggle}
        />
      )}
      <div className={styles.cardHead}>
        <div className={styles.identity}>
          <h3 className={styles.name}>
            <Link to={`/entrevista/${interview.id}`} className={styles.stretched}>
              {interview.candidate_name}
            </Link>
          </h3>
          <span className={styles.meta}>
            {showPosition && `${interview.position_name} · `}{formatDate(interview.created_at, settings)}
          </span>
        </div>
        <ScoreMeter score={interview.score} label={`Pontuação de ${interview.candidate_name}`} size="sm" />
      </div>

      {pending ? (
        <div className={styles.pending}>
          <StatusBadge status={interview.status} />
          <span>{pending}</span>
        </div>
      ) : (
        <div className={styles.points}>
          <div>
            <h4 className={styles.pointsTitle}>Pontos fortes</h4>
            <PointsList items={interview.positives || []} limit={2} />
          </div>
          <div>
            <h4 className={styles.pointsTitle}>Pontos de atenção</h4>
            <PointsList items={interview.negatives || []} tone="negative" limit={2} />
          </div>
        </div>
      )}
    </Card>
  );
}

export default function ResultsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { positionId } = useParams();
  const { settings } = useUserSettings();
  const positionFilter = positionId ? Number(positionId) : undefined;
  const [position, setPosition] = useState(null);
  const [list, setList] = useState({ items: [], page: 1, pages: 1 });
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setSelecting(false);
    setSelected([]);
    Promise.all([
      listInterviews({ positionId: positionFilter, sort: '-created_at', page: 1, perPage: PER_PAGE }),
      listInterviews({ positionId: positionFilter, status: 'done', sort: '-score', perPage: RANKING_SIZE }),
    ])
      .then(([firstPage, top]) => {
        if (!active) return;
        setList({ items: firstPage.items, page: firstPage.page, pages: firstPage.pages });
        setRanking(top.items);
      })
      .catch((error) => {
        if (!active) return;
        console.error('Erro ao carregar entrevistas:', error);
        toast.error(error.detail || 'Erro ao carregar entrevistas. Verifique se o backend está rodando.');
        setList({ items: [], page: 1, pages: 1 });
        setRanking([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [positionFilter, toast]);

  useEffect(() => {
    if (!positionFilter) return undefined;
    let active = true;
    getPosition(positionFilter)
      .then((data) => { if (active) setPosition(data); })
      // Não bloqueia a página: sem o cargo, o título volta ao padrão.
      .catch((error) => console.error('Erro ao carregar cargo:', error));
    return () => { active = false; };
  }, [positionFilter]);

  const selectedPosition = positionFilter && position?.id === positionFilter ? position : null;

  const handleLoadMore = async () => {
    try {
      setLoadingMore(true);
      const next = await listInterviews({
        positionId: positionFilter, sort: '-created_at', page: list.page + 1, perPage: PER_PAGE,
      });
      setList((prev) => {
        // Entrevistas criadas entre uma página e outra deslocam a lista; evita repetir cartões.
        const known = new Set(prev.items.map((item) => item.id));
        return {
          items: [...prev.items, ...next.items.filter((item) => !known.has(item.id))],
          page: next.page,
          pages: next.pages,
        };
      });
    } catch (error) {
      console.error('Erro ao carregar mais entrevistas:', error);
      toast.error(error.detail || 'Erro ao carregar mais entrevistas. Tente novamente.');
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleSelecting = () => {
    setSelecting((prev) => !prev);
    setSelected([]);
  };

  const isSelected = (item) => selected.some((s) => s.id === item.id);

  // Até 3 entrevistas, todas do mesmo cargo da primeira escolhida.
  const canSelect = (item) => {
    if (isSelected(item)) return true;
    if (selected.length >= MAX_COMPARE) return false;
    return selected.length === 0 || selected[0].positionId === item.position_id;
  };

  const toggleSelected = (item) => {
    setSelected((prev) => (prev.some((s) => s.id === item.id)
      ? prev.filter((s) => s.id !== item.id)
      : [...prev, { id: item.id, positionId: item.position_id }]));
  };

  const title = selectedPosition ? `Ranking — ${selectedPosition.name}` : 'Entrevistas';

  return (
    <div className={styles.page}>
      <PageHeader
        title={title}
        actions={
          <Button
            variant={selecting ? 'ghost' : 'secondary'}
            icon={selecting ? undefined : <CompareIcon size={16} />}
            onClick={toggleSelecting}
          >
            {selecting ? 'Cancelar' : 'Comparar'}
          </Button>
        }
      />

      {selectedPosition && (
        <div className={styles.positionBar}>
          <span className={styles.positionName}>{selectedPosition.name}</span>
          {selectedPosition.vacancies > 0 && <Chip tone="info">{vacanciesLabel(selectedPosition.vacancies)}</Chip>}
          <Button as={Link} to="/ranking" variant="ghost" size="sm" className={styles.switch}>Trocar cargo</Button>
        </div>
      )}

      <div className={styles.layout}>
        <section aria-labelledby="entrevistados" className={styles.listCol}>
          <h2 id="entrevistados" className={styles.sectionTitle}>Entrevistados</h2>

          {loading ? (
            <div className={styles.cards} aria-busy="true">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="block" className={styles.cardSkeleton} />)}
            </div>
          ) : list.items.length === 0 ? (
            <EmptyState
              icon={<InterviewsIcon size={24} />}
              title="Nenhuma entrevista realizada"
              description="As entrevistas aparecem aqui assim que forem gravadas ou enviadas."
              action={<Button as={Link} to="/nova-entrevista" variant="primary">Nova entrevista</Button>}
            />
          ) : (
            <>
              <div className={styles.cards}>
                {list.items.map((item) => (
                  <InterviewCard
                    key={item.id}
                    interview={item}
                    settings={settings}
                    showPosition={!positionFilter}
                    selecting={selecting}
                    selected={isSelected(item)}
                    selectable={canSelect(item)}
                    onToggle={() => toggleSelected(item)}
                  />
                ))}
              </div>
              {list.page < list.pages && (
                <Button variant="secondary" onClick={handleLoadMore} loading={loadingMore} className={styles.more}>
                  Carregar mais
                </Button>
              )}
            </>
          )}
        </section>

        <aside aria-labelledby="ranking-titulo" className={styles.rankingCol}>
          <Card padding="none">
            <h2 id="ranking-titulo" className={`${styles.sectionTitle} ${styles.rankingTitle}`}>Top {RANKING_SIZE}</h2>
            {loading ? (
              <div className={styles.rankingLoading}>{[0, 1, 2].map((i) => <Skeleton key={i} variant="line" />)}</div>
            ) : ranking.length === 0 ? (
              <p className={styles.rankingEmpty}>Nenhum candidato com análise concluída.</p>
            ) : (
              <ol className={styles.ranking}>
                {ranking.map((item, index) => (
                  <li key={item.id}>
                    <Link to={`/entrevista/${item.id}`} className={styles.rankRow}>
                      <span className={`${styles.rank} ${index === 0 ? styles.first : ''}`}>{index + 1}</span>
                      <span className={styles.rankBody}>
                        <span className={styles.rankName}>{item.candidate_name}</span>
                        <ScoreMeter score={item.score} label={`Pontuação de ${item.candidate_name}`} variant="bar" showLabel={false} />
                        <span className={styles.rankMeta}>
                          <span><CalendarIcon size={14} />{formatDate(item.created_at, settings)}</span>
                          <span><ClockIcon size={14} />{formatDuration(item.audio_duration_seconds)}</span>
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </aside>
      </div>

      {selecting && (
        <div className={styles.compareBar} role="region" aria-label="Comparação">
          <span className={styles.compareText}>
            <strong>{selected.length}</strong> de {MAX_COMPARE} selecionadas · mesmo cargo
          </span>
          <Button
            variant="primary"
            disabled={selected.length < 2}
            onClick={() => navigate(`/comparar?ids=${selected.map((s) => s.id).join(',')}`)}
          >
            Comparar selecionados ({selected.length})
          </Button>
        </div>
      )}
    </div>
  );
}
