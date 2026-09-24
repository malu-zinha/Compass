import { Link } from 'react-router-dom';
import { LogoMark } from '../../components/brand';
import { Button } from '../../components/ui';
import styles from './NotFoundPage.module.css';
import { paths } from '../../app/paths';

export default function NotFoundPage() {
  return (
    <main className={styles.page}>
      <div className={styles.mark} aria-hidden="true">
        <LogoMark size={96} />
      </div>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>Esta página saiu do mapa</h1>
      <p className={styles.text}>O endereço pode ter mudado ou nunca ter existido. A bússola aponta de volta para o início.</p>
      <Button as={Link} to={paths.inicio} variant="primary" size="lg">
        Voltar ao início
      </Button>
    </main>
  );
}
