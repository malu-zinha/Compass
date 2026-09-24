import { Chip, ScoreMeter, Tabs } from '../../../components/ui';
import { SUBSCORES } from '../../../lib/score';
import PointsList from '../../entrevistas/PointsList';
import styles from './AnalysisPanel.module.css';

const EMPTY = 'Nenhuma informação coletada';

function Block({ title, children }) {
  return (
    <section className={styles.block}>
      <h3 className={styles.blockTitle}>{title}</h3>
      {children}
    </section>
  );
}

/*
 * A análise da entrevista em abas, no lugar dos 10 acordeões empilhados:
 * Resumo, Pontos, Perguntas, Perfil e Anotações.
 */
export default function AnalysisPanel({ analysis, notes, questions }) {
  const data = analysis || {};
  const subscores = data.score?.subscores || {};
  const history = (data.experiences || []).filter((item) => item.company && item.role);
  const qaPairs = data.qa_pairs || [];
  const asked = (questions || []).filter((q) => q.asked);

  const items = [
    {
      id: 'resumo',
      label: 'Resumo',
      content: (
        <>
          <Block title="Análise">
            <p className={styles.text}>{data.summary || 'Sem informações específicas'}</p>
          </Block>
          <Block title="Por competência">
            {data.score ? (
              <div className={styles.bars}>
                {SUBSCORES.map(([key, label]) => (
                  <ScoreMeter key={key} score={subscores[key]} label={label} variant="bar" />
                ))}
              </div>
            ) : <p className={styles.muted}>{EMPTY}</p>}
          </Block>
          <Block title="Aderência ao perfil ideal">
            <p className={styles.text}>{data.ideal_profile_fit || EMPTY}</p>
          </Block>
        </>
      ),
    },
    {
      id: 'pontos',
      label: 'Pontos',
      content: (
        <>
          <Block title="Pontos fortes">
            <PointsList items={data.positives || []} empty={EMPTY} />
          </Block>
          <Block title="Pontos de atenção">
            <PointsList items={data.negatives || []} tone="negative" empty={EMPTY} />
          </Block>
        </>
      ),
    },
    {
      id: 'perguntas',
      label: 'Perguntas',
      content: (
        <>
          <Block title="Perguntas e respostas">
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
          </Block>
          <Block title="Perguntas feitas">
            {asked.length > 0 ? (
              <ul className={styles.plain}>{asked.map((q) => <li key={q.id}>{q.text}</li>)}</ul>
            ) : <p className={styles.muted}>{EMPTY}</p>}
          </Block>
        </>
      ),
    },
    {
      id: 'perfil',
      label: 'Perfil',
      content: (
        <>
          <Block title="Habilidades">
            {data.skills?.length ? (
              <ul className={styles.chips}>{data.skills.map((s) => <li key={s}><Chip tone="info">{s}</Chip></li>)}</ul>
            ) : <p className={styles.muted}>{EMPTY}</p>}
          </Block>
          {history.length > 0 && (
            <Block title="Histórico">
              <ol className={styles.timeline}>
                {history.map((item, idx) => (
                  <li key={idx}>
                    <p className={styles.question}>{item.role} · {item.company}</p>
                    {item.description && <p className={styles.answer}>{item.description}</p>}
                  </li>
                ))}
              </ol>
            </Block>
          )}
        </>
      ),
    },
    {
      id: 'notas',
      label: 'Anotações',
      content: (
        <Block title="Anotações do entrevistador">
          {notes ? <blockquote className={styles.notes}>{notes}</blockquote> : <p className={styles.muted}>Sem anotações</p>}
        </Block>
      ),
    },
  ];

  return <Tabs label="Análise da entrevista" items={items} />;
}
