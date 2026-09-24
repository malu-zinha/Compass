import { Link } from 'react-router-dom';
import { paths } from '../../../app/paths';
import { PageHeader } from '../../../components/layout';
import { Button, Chip, DataTable, EmptyState, ErrorPanel, ScoreMeter, Skeleton } from '../../../components/ui';
import { BriefcaseIcon, PlusIcon } from '../../../components/icons';
import { vacanciesLabel } from '../../../lib/format';
import { useVagasResumo } from '../useVagasResumo';
import styles from './VagasPage.module.css';

const MAX_SKILLS = 3;

const COLUMNS = [
  {
    key: 'name',
    header: 'Vaga',
    render: (v) => (
      <span className={styles.vaga}>
        <span className={styles.name}>{v.name}</span>
        {v.description && <span className={styles.desc}>{v.description}</span>}
      </span>
    ),
  },
  {
    key: 'abertas',
    header: 'Abertas',
    render: (v) => (v.vacancies > 0 ? vacanciesLabel(v.vacancies) : <span className={styles.muted}>Nenhuma</span>),
  },
  { key: 'entrevistas', header: 'Entrevistas', align: 'end', render: (v) => v.entrevistas },
  {
    key: 'melhor',
    header: 'Melhor pontuação',
    width: '180px',
    render: (v) => (v.melhor ? (
      <span className={styles.best}>
        <ScoreMeter score={v.melhor.score} label={`Melhor pontuação: ${v.melhor.candidate_name}`} variant="bar" showLabel={false} />
        <span className={styles.bestName}>{v.melhor.candidate_name}</span>
      </span>
    ) : <span className={styles.muted}>—</span>),
  },
  {
    key: 'skills',
    header: 'Competências',
    card: false,
    render: (v) => (
      <span className={styles.skills}>
        {(v.skills ?? []).slice(0, MAX_SKILLS).map((s) => <Chip key={s}>{s}</Chip>)}
        {(v.skills?.length ?? 0) > MAX_SKILLS && <Chip>+{v.skills.length - MAX_SKILLS}</Chip>}
      </span>
    ),
  },
];

export default function VagasPage() {
  const { loading, error, vagas } = useVagasResumo();

  const novaVaga = (
    <Button as={Link} to={paths.novaVaga} variant="primary" icon={<PlusIcon size={16} />}>Nova vaga</Button>
  );

  return (
    <div className={styles.page}>
      <PageHeader title="Vagas" actions={novaVaga} />
      <p className={styles.lead}>
        Cada vaga reúne os candidatos entrevistados, o ranking e as perguntas daquele cargo.
      </p>

      {error ? (
        <ErrorPanel message="Não foi possível carregar as vagas." onRetry={() => window.location.reload()} />
      ) : loading ? (
        <div aria-busy="true" className={styles.loading}>
          {[0, 1, 2].map((i) => <Skeleton key={i} variant="block" className={styles.skeleton} />)}
        </div>
      ) : (
        <DataTable
          caption="Vagas"
          columns={COLUMNS}
          rows={vagas}
          getRowKey={(v) => v.id}
          rowHref={(v) => paths.vaga(v.id)}
          empty={(
            <EmptyState
              icon={<BriefcaseIcon size={24} />}
              title="Nenhuma vaga cadastrada ainda"
              description="Vagas agrupam as entrevistas e dizem à análise quais competências importam."
              action={<Button as={Link} to={paths.novaVaga} variant="primary">Criar a primeira vaga</Button>}
            />
          )}
        />
      )}
    </div>
  );
}
