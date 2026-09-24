import { Link } from 'react-router-dom';
import { paths } from '../../app/paths';
import { useAuth } from '../../auth/AuthContext';
import { useUserSettings } from '../../auth/SettingsContext';
import { PageHeader } from '../../components/layout';
import { Button, DataTable, EmptyState, ErrorPanel, ScoreMeter, Skeleton, StatusBadge } from '../../components/ui';
import { ChevronRightIcon, InterviewsIcon, MicrophoneIcon } from '../../components/icons';
import { formatDate } from '../../lib/format';
import { useVagasResumo } from '../vagas/useVagasResumo';
import { useHomeSummary } from './useHomeSummary';
import styles from './HomePage.module.css';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function AttentionRow({ interview, settings }) {
  const failed = interview.status === 'error';
  return (
    <li>
      <Link to={paths.entrevista(interview.id)} className={styles.attention}>
        <span className={`${styles.marker} ${failed ? styles.markerDanger : styles.markerInfo}`} aria-hidden="true" />
        <span className={styles.who}>
          <span className={styles.name}>{interview.candidate_name || 'Candidato sem nome'}</span>
          <span className={styles.meta}>{interview.position_name} · {formatDate(interview.created_at, settings)}</span>
        </span>
        <StatusBadge status={interview.status} />
        <span className={styles.action}>{failed ? 'Ver e reprocessar' : 'Acompanhar'}</span>
        <ChevronRightIcon size={16} className={styles.chevron} />
      </Link>
    </li>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const home = useHomeSummary();
  const vagas = useVagasResumo();
  const firstName = user?.name?.split(' ')[0];
  const today = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: settings.timezone }).format(new Date());

  const attention = [...home.failed, ...home.processing];

  const recentColumns = [
    { key: 'nome', header: 'Candidata', render: (i) => i.candidate_name || 'Candidato sem nome' },
    { key: 'vaga', header: 'Vaga', card: false, render: (i) => i.position_name },
    { key: 'data', header: 'Data', render: (i) => formatDate(i.created_at, settings) },
    {
      key: 'pontuacao',
      header: 'Pontuação',
      width: '160px',
      render: (i) => <ScoreMeter score={i.score} label={`Pontuação de ${i.candidate_name}`} variant="bar" showLabel={false} />,
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader title="Início" />

      <section className={styles.welcome}>
        <p className={styles.date}>{today}</p>
        <h2 className={styles.greeting}>{firstName ? `Olá, ${firstName}.` : 'Olá.'}</h2>
        {home.counts && (
          <p className={styles.counts}>
            {plural(home.counts.done, 'entrevista concluída', 'entrevistas concluídas')}
            {' · '}{plural(home.counts.processing, 'em processamento', 'em processamento')}
            {' · '}{plural(home.counts.failed, 'com falha', 'com falha')}
          </p>
        )}
      </section>

      {home.error ? (
        <ErrorPanel message="Não foi possível carregar o painel." onRetry={() => window.location.reload()} />
      ) : (
        <div className={styles.columns}>
          <div className={styles.main}>
            <section aria-labelledby="atencao">
              <h2 id="atencao" className={styles.sectionTitle}>Precisa de você</h2>
              {home.loading ? (
                <Skeleton variant="block" className={styles.skeleton} />
              ) : attention.length === 0 ? (
                <p className={styles.calm}>Nada pendente. Todas as entrevistas foram analisadas.</p>
              ) : (
                <ul className={styles.attentionList}>
                  {attention.map((i) => <AttentionRow key={i.id} interview={i} settings={settings} />)}
                </ul>
              )}
            </section>

            <section aria-labelledby="recentes">
              <div className={styles.sectionHead}>
                <h2 id="recentes" className={styles.sectionTitle}>Concluídas recentemente</h2>
                <Link to={paths.entrevistas} className={styles.more}>Ver todas</Link>
              </div>
              {home.loading ? (
                <Skeleton variant="block" className={styles.skeleton} />
              ) : (
                <DataTable
                  caption="Entrevistas concluídas recentemente"
                  columns={recentColumns}
                  rows={home.recent}
                  getRowKey={(i) => i.id}
                  rowHref={(i) => paths.entrevista(i.id)}
                  empty={(
                    <EmptyState
                      icon={<InterviewsIcon size={24} />}
                      title="Nenhuma entrevista ainda"
                      description="Grave ao vivo ou envie um áudio para ver a análise aqui."
                      action={<Button as={Link} to={paths.novaEntrevista()} variant="primary" icon={<MicrophoneIcon size={16} />}>Nova entrevista</Button>}
                    />
                  )}
                />
              )}
            </section>
          </div>

          <aside aria-labelledby="vagas-titulo" className={styles.side}>
            <div className={styles.sectionHead}>
              <h2 id="vagas-titulo" className={styles.sectionTitle}>Vagas</h2>
              <Link to={paths.vagas} className={styles.more}>Todas</Link>
            </div>
            {vagas.loading ? (
              <Skeleton variant="block" className={styles.skeleton} />
            ) : vagas.vagas.length === 0 ? (
              <p className={styles.calm}>Nenhuma vaga ainda. <Link to={paths.novaVaga}>Criar vaga</Link></p>
            ) : (
              <ul className={styles.vagas}>
                {vagas.vagas.map((v) => (
                  <li key={v.id}>
                    <Link to={paths.vaga(v.id)} className={styles.vaga}>
                      <span className={styles.vagaName}>{v.name}</span>
                      <span className={styles.meta}>{plural(v.entrevistas, 'entrevista', 'entrevistas')}</span>
                      {v.melhor && (
                        <span className={styles.leader}>
                          <span className={styles.meta}>Melhor: {v.melhor.candidate_name}</span>
                          <ScoreMeter score={v.melhor.score} label={`Melhor pontuação da vaga ${v.name}`} variant="bar" showLabel={false} />
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
