import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../../components/brand';
import { Button, Card, ScoreMeter, StatusBadge } from '../../components/ui';
import {
  BriefcaseIcon, ChartIcon, CompareIcon, FileTextIcon, MicrophoneIcon, QuestionsIcon,
} from '../../components/icons';
import ThemeSwitcher from '../../theme/ThemeSwitcher';
import styles from './LandingPage.module.css';

const FEATURES = [
  { Icon: MicrophoneIcon, title: 'Tempo real', text: 'Transcrição durante a entrevista, com perguntas sugeridas enquanto você conversa.' },
  { Icon: ChartIcon, title: 'Análise por competência', text: 'Pontuação técnica, de comunicação, cultura e experiência, com justificativa.' },
  { Icon: FileTextIcon, title: 'Resumo estruturado', text: 'Pontos fortes, pontos de atenção e as falas que sustentam cada um.' },
  { Icon: CompareIcon, title: 'Ranking por cargo', text: 'Compare candidatos do mesmo cargo lado a lado, com parecer da IA.' },
  { Icon: BriefcaseIcon, title: 'Gestão de cargos', text: 'Perfis de vaga com competências, que orientam a análise de cada entrevista.' },
  { Icon: QuestionsIcon, title: 'Banco de perguntas', text: 'Perguntas organizadas por cargo, prontas para a próxima entrevista.' },
];

const STEPS = [
  { title: 'Configure o cargo', text: 'Descreva a vaga e as competências que importam.' },
  { title: 'Faça a entrevista', text: 'Grave ao vivo ou envie o áudio de uma conversa.' },
  { title: 'Decida com dados', text: 'Veja pontuação, resumo e ranking dos candidatos.' },
];

/* Prévia ilustrativa do produto, feita com os mesmos componentes do app. */
const PREVIEW = [
  { name: 'Carla Mendes', score: 870, status: 'done' },
  { name: 'Rafael Lima', score: 640, status: 'done' },
  { name: 'Júlia Rocha', score: null, status: 'analyzing' },
];

export default function LandingPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Compass — entrevistas que viram decisões';
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          <Logo variant="full" />
        </Link>
        <nav className={styles.nav} aria-label="Conta">
          <ThemeSwitcher compact className={styles.theme} />
          <Button as={Link} to="/login" variant="ghost">Entrar</Button>
          <Button as={Link} to="/login?mode=register" variant="primary">Criar conta</Button>
        </nav>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Análise de entrevistas com IA</p>
            <h1 className={styles.heroTitle}>
              Entrevistas que viram <span className={styles.accent}>decisões</span>.
            </h1>
            <p className={styles.heroText}>
              O Compass transcreve, resume e pontua cada entrevista, e aponta quem se encaixa melhor em cada cargo.
            </p>
            <div className={styles.heroActions}>
              <Button as={Link} to="/login?mode=register" variant="primary" size="lg">Começar agora</Button>
              <Button as="a" href="#recursos" variant="secondary" size="lg">Ver recursos</Button>
            </div>
          </div>

          <Card variant="raised" padding="none" className={styles.preview} aria-hidden="true">
            <div className={styles.previewHead}>
              <span className={styles.previewTitle}>Desenvolvedora Frontend</span>
              <span className={styles.previewMeta}>Ranking · 3 candidatos</span>
            </div>
            <ol className={styles.previewList}>
              {PREVIEW.map((c, i) => (
                <li key={c.name} className={styles.previewRow}>
                  <span className={styles.previewRank}>{i + 1}</span>
                  <span className={styles.previewName}>{c.name}</span>
                  <StatusBadge status={c.status} />
                  <ScoreMeter score={c.score} label={`Pontuação de ${c.name}`} size="sm" />
                </li>
              ))}
            </ol>
          </Card>
        </section>

        <section id="recursos" className={styles.section} aria-labelledby="recursos-titulo">
          <h2 id="recursos-titulo" className={styles.sectionTitle}>Tudo o que a entrevista precisa</h2>
          <div className={styles.features}>
            {FEATURES.map(({ Icon, title, text }) => (
              <Card key={title} className={styles.feature}>
                <span className={styles.featureIcon}><Icon size={22} /></span>
                <h3 className={styles.featureTitle}>{title}</h3>
                <p className={styles.featureText}>{text}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="como-titulo">
          <h2 id="como-titulo" className={styles.sectionTitle}>Como funciona</h2>
          <ol className={styles.steps}>
            {STEPS.map((step, i) => (
              <li key={step.title} className={styles.step}>
                <span className={styles.stepNumber}>{String(i + 1).padStart(2, '0')}</span>
                <h3 className={styles.featureTitle}>{step.title}</h3>
                <p className={styles.featureText}>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.cta}>
          <h2 className={styles.ctaTitle}>Sua próxima contratação começa numa boa conversa.</h2>
          <Button as={Link} to="/login?mode=register" variant="primary" size="lg">Criar conta gratuita</Button>
        </section>
      </main>

      <footer className={styles.footer}>
        <Logo variant="mark" size={20} decorative />
        <span>Compass</span>
      </footer>
    </div>
  );
}
