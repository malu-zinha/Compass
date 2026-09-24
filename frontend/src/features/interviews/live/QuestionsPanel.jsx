import { Chip, Skeleton } from '../../../components/ui';
import { CheckIcon } from '../../../components/icons';
import styles from './RecordPage.module.css';

/*
 * Perguntas cadastradas e sugestões da IA. Cada uma é um botão com
 * aria-pressed: pressionar marca como feita (e desmarca).
 */
export default function QuestionsPanel({ questions, onToggleAsked, loading = false, isLive = false }) {
  if (loading) {
    return <div className={styles.questionsLoading}>{[0, 1, 2].map((i) => <Skeleton key={i} variant="block" className={styles.questionSkeleton} />)}</div>;
  }
  if (questions.length === 0) {
    return (
      <p className={styles.hint}>
        {isLive ? 'Sugestões de perguntas aparecerão aqui...' : 'Aguardando sugestões de perguntas...'}
      </p>
    );
  }
  return (
    <ul className={styles.questions}>
      {questions.map((question) => (
        <li key={question.id}>
          <button
            type="button"
            className={styles.question}
            aria-pressed={Boolean(question.asked)}
            onClick={() => onToggleAsked(question)}
          >
            <span className={styles.questionHead}>
              <Chip tone={question.source === 'ai' ? 'info' : 'neutral'}>
                {question.source === 'ai' ? 'IA' : 'Cadastrada'}
              </Chip>
              <span className={styles.askedMark} aria-hidden="true"><CheckIcon size={14} /></span>
            </span>
            <span className={styles.questionText}>{question.text}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
