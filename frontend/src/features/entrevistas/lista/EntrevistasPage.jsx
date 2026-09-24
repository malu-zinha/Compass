import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listInterviews } from '../../../api/interviews';
import { listPositions } from '../../../api/positions';
import { paths } from '../../../app/paths';
import { useUserSettings } from '../../../auth/SettingsContext';
import { PageHeader } from '../../../components/layout';
import {
  Button, DataTable, EmptyState, FilterBar, Input, ScoreMeter, SegmentedControl, Select, Skeleton, StatusBadge, useToast,
} from '../../../components/ui';
import { InterviewsIcon, PlusIcon } from '../../../components/icons';
import { formatDate, formatDuration } from '../../../lib/format';
import { useUrlFilters } from '../../../lib/urlState';
import styles from './EntrevistasPage.module.css';

const PER_PAGE = 100;

// Status da URL → status do backend.
const STATUS = {
  todas: undefined,
  concluidas: 'done',
  andamento: ['draft', 'recording', 'uploaded', 'transcribing', 'analyzing'],
  falha: 'error',
};

// O backend só ordena de forma decrescente, por data ou por pontuação.
const SORT = { recentes: '-created_at', pontuacao: '-score' };

const DEFAULTS = { vaga: '', status: 'todas', q: '', ordem: 'recentes' };

export default function EntrevistasPage() {
  const toast = useToast();
  const { settings } = useUserSettings();
  const [filters, setFilter] = useUrlFilters(DEFAULTS);
  const [positions, setPositions] = useState([]);
  const [list, setList] = useState({ loading: true, items: [], page: 1, pages: 1, total: 0 });
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    listPositions().then((d) => setPositions(d.items)).catch(() => setPositions([]));
  }, []);

  const query = useMemo(() => ({
    positionId: filters.vaga ? Number(filters.vaga) : undefined,
    status: STATUS[filters.status],
    sort: SORT[filters.ordem] ?? SORT.recentes,
  }), [filters.vaga, filters.status, filters.ordem]);

  useEffect(() => {
    let active = true;
    setList((l) => ({ ...l, loading: true }));
    listInterviews({ ...query, page: 1, perPage: PER_PAGE })
      .then((d) => { if (active) setList({ loading: false, items: d.items, page: d.page, pages: d.pages, total: d.total }); })
      .catch((error) => {
        if (!active) return;
        toast.error(error.detail || 'Erro ao carregar entrevistas.');
        setList({ loading: false, items: [], page: 1, pages: 1, total: 0 });
      });
    return () => { active = false; };
  }, [query, toast]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = await listInterviews({ ...query, page: list.page + 1, perPage: PER_PAGE });
      setList((prev) => {
        // Entrevistas criadas entre uma página e outra deslocam a lista; evita repetir linhas.
        const known = new Set(prev.items.map((i) => i.id));
        return { ...prev, items: [...prev.items, ...next.items.filter((i) => !known.has(i.id))], page: next.page, pages: next.pages };
      });
    } catch (error) {
      toast.error(error.detail || 'Erro ao carregar mais entrevistas.');
    } finally {
      setLoadingMore(false);
    }
  };

  // O backend não busca por nome: a busca filtra o que já foi carregado.
  const term = filters.q.trim().toLowerCase();
  const rows = term
    ? list.items.filter((i) => `${i.candidate_name} ${i.candidate_email}`.toLowerCase().includes(term))
    : list.items;

  const columns = [
    { key: 'nome', header: 'Candidata', render: (i) => i.candidate_name || 'Candidato sem nome' },
    { key: 'vaga', header: 'Vaga', render: (i) => i.position_name },
    { key: 'recentes', header: 'Data', sortable: true, render: (i) => formatDate(i.created_at, settings) },
    { key: 'duracao', header: 'Duração', card: false, render: (i) => formatDuration(i.audio_duration_seconds) },
    { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
    {
      key: 'pontuacao',
      header: 'Pontuação',
      sortable: true,
      width: '180px',
      render: (i) => <ScoreMeter score={i.score} label={`Pontuação de ${i.candidate_name}`} variant="bar" showLabel={false} />,
    },
  ];

  const summary = list.loading ? '' : term
    ? `${rows.length} de ${list.items.length} carregadas`
    : `${list.total} ${list.total === 1 ? 'entrevista' : 'entrevistas'}`;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Entrevistas"
        actions={<Button as={Link} to={paths.novaEntrevista()} variant="primary" icon={<PlusIcon size={16} />}>Nova entrevista</Button>}
      />

      <FilterBar summary={summary}>
        <Input
          type="search"
          aria-label="Buscar por nome ou e-mail"
          placeholder="Buscar nome ou e-mail"
          value={filters.q}
          onChange={(e) => setFilter('q', e.target.value)}
          className={styles.search}
        />
        <Select aria-label="Vaga" value={filters.vaga} onChange={(e) => setFilter('vaga', e.target.value)} className={styles.select}>
          <option value="">Todas as vagas</option>
          {positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <SegmentedControl
          label="Status"
          value={filters.status}
          onChange={(v) => setFilter('status', v)}
          options={[
            { value: 'todas', label: 'Todas' },
            { value: 'concluidas', label: 'Concluídas' },
            { value: 'andamento', label: 'Em andamento' },
            { value: 'falha', label: 'Com falha' },
          ]}
        />
      </FilterBar>

      {list.loading ? (
        <div className={styles.loading} aria-busy="true">{[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="block" className={styles.skeleton} />)}</div>
      ) : (
        <>
          <DataTable
            caption="Entrevistas"
            columns={columns}
            rows={rows}
            getRowKey={(i) => i.id}
            rowHref={(i) => paths.entrevista(i.id)}
            sort={{ key: filters.ordem, dir: 'desc' }}
            onSortChange={({ key }) => setFilter('ordem', key)}
            empty={(
              <EmptyState
                icon={<InterviewsIcon size={24} />}
                title={term || filters.vaga || filters.status !== 'todas' ? 'Nenhuma entrevista com esses filtros' : 'Nenhuma entrevista ainda'}
                description={term || filters.vaga || filters.status !== 'todas'
                  ? 'Tente outra vaga, status ou busca.'
                  : 'Grave ao vivo ou envie um áudio para começar.'}
              />
            )}
          />
          {list.page < list.pages && (
            <Button variant="secondary" onClick={loadMore} loading={loadingMore} className={styles.more}>Carregar mais</Button>
          )}
        </>
      )}
    </div>
  );
}
