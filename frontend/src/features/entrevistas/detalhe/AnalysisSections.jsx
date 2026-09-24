import { Chip, ScoreMeter } from '../../../components/ui';
import { SUBSCORES } from '../../../lib/score';
import PointsList from '../PointsList';
import styles from './AnalysisSections.module.css';

const EMPTY = 'Nenhuma informação coletada';

// Ordem e rótulos das seções; o índice lateral da página usa a mesma lista.
export const SECTIONS = [
  { id: 'parecer', label: 'Parecer' },
  { id: 'competencias', label: 'Competências' },
  { id: 'pontos', label: 'Pontos fortes e de atenção' },
  { id: 'perguntas', label: 'Perguntas' },
  { id: 'perfil', label: 'Perfil' },
  { id: 'anotacoes', label: 'Anotações' },
];

function Section({ id, title, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className={styles.section}>
      <h2 id={`${id}-titulo`} className={styles.title}>{title}</h2>
      {children}
    </section>
  );
}

/*
 * A análise como leitura contínua: o parecer abre, e cada seção tem âncora
 * própria para o índice lateral.
 */
export default function AnalysisSections({ analysis, notes, questions }) {
  const data = analysis || {};
  const subscores = data.score?.subscores || {};
  const history = (data.experiences || []).filter((item) => item.company && item.role);
  const qaPairs = data.qa_pairs || [];
  const asked = (questions || []).filter((q) => q.asked);

  return (
    <div className={styles.sections}>
      <Section id="parecer" title="Parecer">
        <p className={styles.lead}>{data.summary || 'Sem informações específicas'}</p>
        {data.ideal_profile_fit && (
          <div className={styles.fit}>
            <h3 className={styles.subtitle}>Aderência ao perfil ideal</h3>
            <p className={styles.text}>{data.ideal_profile_fit}</p>
          </div>
        )}
      </Section>

      <Section id="competencias" title="Competências">
        {data.score ? (
          <div className={styles.bars}>
            {SUBSCORES.map(([key, label]) => (
              <ScoreMeter key={key} score={subscores[key]} label={label} variant="bar" />
            ))}
          </div>
        ) : <p className={styles.muted}>{EMPTY}</p>}
      </Section>

      <Section id="pontos" title="Pontos fortes e de atenção">
        <div className={styles.columns}>
          <div>
            <h3 className={styles.subtitle}>Fortes</h3>
            <PointsList items={data.positives || []} empty={EMPTY} />
          </div>
          <div>
            <h3 className={styles.subtitle}>De atenção</h3>
            <PointsList items={data.negatives || []} tone="negative" empty={EMPTY} />
          </div>
        </div>
      </Section>

      <Section id="perguntas" title="Perguntas">
        <h3 className={styles.subtitle}>Perguntas e respostas</h3>
        {qaPairs.length > 0 ? (
          <ol className={styles.qa}>
            {qaPairs.map((pair, idx) => (
              <li key={idx}>
                <p className={styles.question}>{pair.question}</p>
                <p className={styles.answer}>{pair.answer}</p>
              </li>
            ))}
          </ol>
        ) : <p className={styles.muted}>{EMPTY}</p>}
        <h3 className={styles.subtitle}>Perguntas feitas</h3>
        {asked.length > 0 ? (
          <ul className={styles.plain}>{asked.map((q) => <li key={q.id}>{q.text}</li>)}</ul>
        ) : <p className={styles.muted}>{EMPTY}</p>}
      </Section>

      <Section id="perfil" title="Perfil">
        <h3 className={styles.subtitle}>Habilidades</h3>
        {data.skills?.length ? (
          <ul className={styles.chips}>{data.skills.map((s) => <li key={s}><Chip>{s}</Chip></li>)}</ul>
        ) : <p className={styles.muted}>{EMPTY}</p>}
        {history.length > 0 && (
          <>
            <h3 className={styles.subtitle}>Histórico</h3>
            <ol className={styles.timeline}>
              {history.map((item, idx) => (
                <li key={idx}>
                  <p className={styles.question}>{item.role} · {item.company}</p>
                  {item.description && <p className={styles.answer}>{item.description}</p>}
                </li>
              ))}
            </ol>
          </>
        )}
      </Section>

      <Section id="anotacoes" title="Anotações">
        {notes ? <blockquote className={styles.notes}>{notes}</blockquote> : <p className={styles.muted}>Sem anotações</p>}
      </Section>
    </div>
  );
}
