import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useUserSettings } from '../../auth/SettingsContext';
import { PageHeader } from '../../components/layout';
import {
  Button, Card, EmptyState, ErrorPanel, ScoreMeter, Skeleton, StatusBadge,
} from '../../components/ui';
import {
  BriefcaseIcon, ChartIcon, ChevronRightIcon, InterviewsIcon, MicrophoneIcon, QuestionsIcon,
} from '../../components/icons';
import { formatDate } from '../../lib/format';
import { useHomeSummary } from './useHomeSummary';
import styles from './HomePage.module.css';

const SHORTCUTS = [
  { to: '/ranking', label: 'Ranking', text: 'Compare candidatos por cargo', Icon: ChartIcon },
  { to: '/cargos', label: 'Cargos', text: 'Vagas e competências', Icon: BriefcaseIcon },
  { to: '/perguntas', label: 'Perguntas', text: 'Banco por cargo', Icon: QuestionsIcon },
];

function Stat({ label, value, tone }) {
  return (
    <Card className={styles.stat}>
      <span className={styles.statLabel}>
        {tone && <span className={`${styles.dot} ${styles[tone]}`} aria-hidden="true" />}
        {label}
      </span>
      <span className={styles.statValue}>{value}</span>
    </Card>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const { loading, error, stats, recent } = useHomeSummary();
  const firstName = user?.name?.split(' ')[0];

  return (
    <div className={styles.page}>
      <PageHeader title="Início" />

      <section className={styles.welcome}>
        <div>
          <h2 className={styles.greeting}>{firstName ? `Olá, ${firstName}` : 'Olá'}</h2>
          <p className={styles.lead}>Aqui está o andamento das suas entrevistas.</p>
        </div>
        <Button as={Link} to="/nova-entrevista" variant="primary" size="lg" icon={<MicrophoneIcon size={18} />}>
          Começar entrevista
        </Button>
      </section>

      {error ? (
        <ErrorPanel message="Não foi possível carregar o painel." onRetry={() => window.location.reload()} />
      ) : (
        <>
          <section className={styles.stats} aria-label="Resumo" aria-busy={loading}>
            {loading ? (
              [0, 1, 2, 3].map((i) => <Skeleton key={i} variant="block" className={styles.statSkeleton} />)
            ) : (
              <>
                <Stat label="Concluídas" value={stats.done} tone="success" />
                <Stat label="Em processamento" value={stats.processing} tone="info" />
                <Stat label="Com falha" value={stats.failed} tone="danger" />
                <Stat label="Cargos" value={stats.positions} />
              </>
            )}
          </section>

          <div className={styles.columns}>
            <Card padding="none" as="section" aria-labelledby="recentes" className={styles.recent}>
              <div className={styles.recentHead}>
                <h2 id="recentes" className={styles.sectionTitle}>Últimas entrevistas</h2>
                <Link to="/entrevistas" className={styles.more}>Ver todas</Link>
              </div>
              {loading ? (
                <div className={styles.recentLoading}>
                  {[0, 1, 2].map((i) => <Skeleton key={i} variant="line" />)}
                </div>
              ) : recent.length === 0 ? (
                <EmptyState
                  icon={<InterviewsIcon size={24} />}
                  title="Nenhuma entrevista ainda"
                  description="Grave ao vivo ou envie um áudio para ver a análise aqui."
                  action={<Button as={Link} to="/nova-entrevista" variant="primary">Nova entrevista</Button>}
                />
              ) : (
                <ul className={styles.list}>
                  {recent.map((item) => (
                    <li key={item.id}>
                      <Link to={`/entrevista/${item.id}`} className={styles.row}>
                        <span className={styles.who}>
                          <span className={styles.name}>{item.candidate_name || 'Candidato sem nome'}</span>
                          <span className={styles.meta}>
                            {item.position_name} · {formatDate(item.created_at, settings)}
                          </span>
                        </span>
                        <StatusBadge status={item.status} className={item.status === 'done' ? styles.doneBadge : undefined} />
                        <ScoreMeter score={item.score} label={`Pontuação de ${item.candidate_name}`} size="sm" />
                        <ChevronRightIcon size={16} className={styles.chevron} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <nav aria-label="Atalhos" className={styles.shortcuts}>
              {SHORTCUTS.map(({ to, label, text, Icon }) => (
                <Card key={to} as={Link} to={to} variant="interactive" className={styles.shortcut}>
                  <span className={styles.shortcutIcon}><Icon size={20} /></span>
                  <span className={styles.who}>
                    <span className={styles.name}>{label}</span>
                    <span className={styles.meta}>{text}</span>
                  </span>
                  <ChevronRightIcon size={16} className={styles.chevron} />
                </Card>
              ))}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
