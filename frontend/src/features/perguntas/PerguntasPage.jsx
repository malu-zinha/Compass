import { PageHeader } from '../../components/layout';
import QuestionList from './QuestionList';
import styles from './PerguntasPage.module.css';

/* Perguntas gerais: as que valem para toda entrevista. As de cada vaga ficam na página da vaga. */
export default function PerguntasPage() {
  return (
    <div className={styles.page}>
      <PageHeader title="Perguntas gerais" />
      <p className={styles.lead}>
        Estas perguntas aparecem em todas as entrevistas. As perguntas específicas de uma vaga ficam na aba
        Perguntas da própria vaga.
      </p>
      <QuestionList />
    </div>
  );
}
