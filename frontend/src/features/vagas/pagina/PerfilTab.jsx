import { Link } from 'react-router-dom';
import { paths } from '../../../app/paths';
import { Button, Chip } from '../../../components/ui';
import { vacanciesLabel } from '../../../lib/format';
import styles from './VagaPage.module.css';

/* A vaga em modo leitura: o que a análise usa para pontuar cada entrevista. */
export default function PerfilTab({ vaga }) {
  return (
    <div className={styles.profile}>
      <dl className={styles.facts}>
        <div>
          <dt>Vagas abertas</dt>
          <dd>{vaga.vacancies > 0 ? vacanciesLabel(vaga.vacancies) : 'Nenhuma no momento'}</dd>
        </div>
      </dl>
      <section className={styles.block}>
        <h2 className={styles.sectionTitle}>Descrição</h2>
        <p className={styles.prose}>{vaga.description}</p>
      </section>
      <section className={styles.block}>
        <h2 className={styles.sectionTitle}>Competências</h2>
        <ul className={styles.chips}>{(vaga.skills ?? []).map((s) => <li key={s}><Chip>{s}</Chip></li>)}</ul>
      </section>
      <section className={styles.block}>
        <h2 className={styles.sectionTitle}>Perfil ideal</h2>
        {vaga.ideal_profile
          ? <p className={styles.prose}>{vaga.ideal_profile}</p>
          : <p className={styles.muted}>Ainda não descrito. Com ele, a análise diz o quanto cada candidata se aproxima do perfil.</p>}
      </section>
      <div>
        <Button as={Link} to={paths.editarVaga(vaga.id)} variant="secondary">Editar vaga</Button>
      </div>
    </div>
  );
}
