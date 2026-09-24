import { PageHeader } from '../../components/layout';
import { Tabs } from '../../components/ui';
import { useTabParam } from '../../lib/urlState';
import PerfilSection from './PerfilSection';
import PreferenciasSection from './PreferenciasSection';
import styles from './ContaPage.module.css';

const TABS = ['perfil', 'preferencias'];

/* Minha conta: perfil e preferências juntos, com a aba na URL (?aba=preferencias). */
export default function ContaPage() {
  const [tab, setTab] = useTabParam(TABS);
  return (
    <div className={styles.page}>
      <PageHeader title="Minha conta" />
      <Tabs
        label="Minha conta"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'perfil', label: 'Perfil', content: <PerfilSection /> },
          { id: 'preferencias', label: 'Preferências', content: <PreferenciasSection /> },
        ]}
      />
    </div>
  );
}
