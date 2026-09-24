import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { paths } from '../../app/paths';
import { Logo } from '../../components/brand';
import { Button, Chip, ScoreMeter, StatusBadge } from '../../components/ui';
import ThemeSwitcher from '../../theme/ThemeSwitcher';
import styles from './LandingPage.module.css';

const STEPS = [
  { title: 'Descreva a vaga', text: 'As competências e o perfil ideal que importam para aquele cargo.' },
  { title: 'Converse com a candidata', text: 'Ao vivo, com transcrição e perguntas sugeridas, ou enviando o áudio depois.' },
  { title: 'Decida com o parecer', text: 'Pontuação por competência, pontos fortes e de atenção, e o ranking da vaga.' },
];

/* Ilustrações feitas com as mesmas peças do app — decorativas para leitor de tela. */
function TranscriptIllustration() {
  return (
    <div className={styles.illo} aria-hidden="true">
      <p className={`${styles.bubble} ${styles.bubbleRight}`}>Qual projeto recente você mais gostou de fazer?</p>
      <p className={styles.bubble}>A migração do nosso design system para tokens, com modo escuro.</p>
      <div className={styles.suggestion}>
        <Chip tone="info">Sugestão</Chip>
        <span>Como você mediu o impacto dessa migração?</span>
      </div>
    </div>
  );
}

function AnalysisIllustration() {
  return (
    <div className={styles.illo} aria-hidden="true">
      <p className={styles.illoLead}>“Base técnica sólida e comunicação clara; falta vivência com testes de ponta a ponta.”</p>
      <ScoreMeter score={880} label="Técnico" variant="bar" />
      <ScoreMeter score={760} label="Comunicação" variant="bar" />
      <ScoreMeter score={520} label="Experiência" variant="bar" />
    </div>
  );
}

function RankingIllustration() {
  const rows = [
    { name: 'Carla Mendes', score: 870, status: 'done' },
    { name: 'Rafael Lima', score: 640, status: 'done' },
    { name: 'Júlia Rocha', score: null, status: 'analyzing' },
  ];
  return (
    <div className={styles.illo} aria-hidden="true">
      <p className={styles.illoTitle}>Desenvolvedora Frontend</p>
      <ol className={styles.illoRanking}>
        {rows.map((r, i) => (
          <li key={r.name}>
            <span className={styles.illoRank}>{i + 1}</span>
            <span className={styles.illoName}>{r.name}</span>
            {r.score ? <ScoreMeter score={r.score} label={r.name} variant="bar" showLabel={false} /> : <StatusBadge status={r.status} />}
          </li>
        ))}
      </ol>
    </div>
  );
}

const FEATURES = [
  {
    kicker: 'Durante a conversa',
    title: 'A entrevista é transcrita enquanto acontece.',
    text: 'Você presta atenção na pessoa, não nas anotações. As perguntas da vaga e as sugeridas pela IA ficam ao lado, e você marca o que já perguntou.',
    Illustration: TranscriptIllustration,
  },
  {
    kicker: 'Depois da conversa',
    title: 'Um parecer que dá para defender numa reunião.',
    text: 'Pontuação por competência, pontos fortes e de atenção, perguntas e respostas e a aderência ao perfil ideal — cada afirmação ligada ao que foi dito.',
    Illustration: AnalysisIllustration,
  },
  {
    kicker: 'Na hora de decidir',
    title: 'Cada vaga tem o seu ranking.',
    text: 'Os candidatos de um cargo aparecem ordenados, e dá para colocar até três lado a lado, competência por competência.',
    Illustration: RankingIllustration,
  },
];

export default function LandingPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Compass — entrevistas que viram decisões';
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to={paths.landing} className={styles.brand}>
          <Logo variant="full" />
        </Link>
        <nav className={styles.nav} aria-label="Página">
          <a href="#como-funciona" className={styles.navLink}>Como funciona</a>
          <a href="#recursos" className={styles.navLink}>Recursos</a>
        </nav>
        <div className={styles.account}>
          <ThemeSwitcher compact className={styles.theme} />
          <Button as={Link} to={paths.login} variant="ghost">Entrar</Button>
          <Button as={Link} to={paths.cadastro} variant="primary">Criar conta</Button>
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Análise de entrevistas</p>
          <h1 className={styles.heroTitle}>
            Entrevistas que viram <span className={styles.accent}>decisões</span>.
          </h1>
          <p className={styles.heroText}>
            O Compass transcreve, resume e pontua cada entrevista, e mostra quem se encaixa melhor em cada vaga.
          </p>
          <div className={styles.heroActions}>
            <Button as={Link} to={paths.cadastro} variant="primary" size="lg">Começar agora</Button>
            <Button as="a" href="#como-funciona" variant="secondary" size="lg">Como funciona</Button>
          </div>
        </section>

        <section id="como-funciona" className={styles.section} aria-labelledby="como-titulo">
          <h2 id="como-titulo" className={styles.sectionTitle}>Como funciona</h2>
          <ol className={styles.steps}>
            {STEPS.map((step, i) => (
              <li key={step.title} className={styles.step}>
                <span className={styles.stepNumber} aria-hidden="true">{i + 1}</span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepText}>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="recursos" className={styles.section} aria-labelledby="recursos-titulo">
          <h2 id="recursos-titulo" className="sr-only">Recursos</h2>
          {FEATURES.map(({ kicker, title, text, Illustration }, i) => (
            <article key={title} className={`${styles.feature} ${i % 2 ? styles.flip : ''}`}>
              <div className={styles.featureText}>
                <p className={styles.kicker}>{kicker}</p>
                <h3 className={styles.featureTitle}>{title}</h3>
                <p className={styles.featureBody}>{text}</p>
              </div>
              <Illustration />
            </article>
          ))}
        </section>

        <section className={styles.cta} aria-labelledby="cta-titulo">
          <h2 id="cta-titulo" className={styles.ctaTitle}>A próxima contratação começa numa boa conversa.</h2>
          <Button as={Link} to={paths.cadastro} variant="secondary" size="lg" className={styles.ctaButton}>
            Criar conta gratuita
          </Button>
        </section>
      </main>

      <footer className={styles.footer}>
        <Logo variant="full" size={20} decorative />
        <span>Entrevistas que viram decisões.</span>
      </footer>
    </div>
  );
}
