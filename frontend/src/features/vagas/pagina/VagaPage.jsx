import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deletePosition, getPosition } from '../../../api/positions';
import { paths } from '../../../app/paths';
import { PageHeader } from '../../../components/layout';
import { Button, Chip, ErrorPanel, Skeleton, Tabs, useConfirm, useToast } from '../../../components/ui';
import { PlusIcon } from '../../../components/icons';
import { vacanciesLabel } from '../../../lib/format';
import { useTabParam } from '../../../lib/urlState';
import QuestionList from '../../perguntas/QuestionList';
import CandidatosTab from './CandidatosTab';
import PerfilTab from './PerfilTab';
import styles from './VagaPage.module.css';

const TABS = ['candidatos', 'perguntas', 'perfil'];
const DELETE_MESSAGE = 'Excluir esta vaga também exclui todas as entrevistas, gravações e perguntas vinculadas. Deseja continuar?';

export default function VagaPage() {
  const { id } = useParams();
  const vagaId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useTabParam(TABS);
  const [state, setState] = useState({ loading: true, error: null, vaga: null });

  useEffect(() => {
    let active = true;
    setState({ loading: true, error: null, vaga: null });
    getPosition(vagaId)
      .then((vaga) => { if (active) setState({ loading: false, error: null, vaga }); })
      .catch((error) => { if (active) setState({ loading: false, error, vaga: null }); });
    return () => { active = false; };
  }, [vagaId]);

  const handleDelete = async () => {
    const ok = await confirm({ title: 'Excluir vaga', message: DELETE_MESSAGE, confirmLabel: 'Excluir', tone: 'danger' });
    if (!ok) return;
    try {
      await deletePosition(vagaId);
      toast.success(`Vaga "${state.vaga.name}" excluída.`);
      navigate(paths.vagas);
    } catch (error) {
      toast.error(error.detail || 'Não foi possível excluir a vaga.');
    }
  };

  const breadcrumbs = [{ label: 'Vagas', to: paths.vagas }];

  if (state.error) {
    return (
      <div className={styles.page}>
        <PageHeader title="Vaga não encontrada" breadcrumbs={breadcrumbs} />
        <ErrorPanel
          title="Vaga não encontrada"
          message={state.error.detail || 'Ela pode ter sido excluída.'}
          retryLabel="Voltar para vagas"
          onRetry={() => navigate(paths.vagas)}
        />
      </div>
    );
  }

  if (state.loading) {
    return (
      <div className={styles.page} aria-busy="true">
        <PageHeader title="Carregando vaga..." breadcrumbs={breadcrumbs} />
        <Skeleton variant="block" className={styles.headSkeleton} />
      </div>
    );
  }

  const { vaga } = state;
  const actions = (
    <>
      <Button as={Link} to={paths.editarVaga(vagaId)} variant="secondary">Editar</Button>
      <Button variant="ghost" className={styles.danger} onClick={handleDelete} aria-label="Excluir vaga">Excluir</Button>
    </>
  );

  return (
    <div className={styles.page}>
      <PageHeader title={vaga.name} breadcrumbs={breadcrumbs} actions={actions} />

      <header className={styles.head}>
        <div className={styles.headText}>
          <h2 className={styles.title}>{vaga.name}</h2>
          <p className={styles.meta}>
            {vaga.vacancies > 0 ? vacanciesLabel(vaga.vacancies) : 'Sem vagas abertas'}
          </p>
          {vaga.skills?.length > 0 && (
            <ul className={styles.chips} aria-label="Competências">
              {vaga.skills.map((s) => <li key={s}><Chip>{s}</Chip></li>)}
            </ul>
          )}
        </div>
        <Button as={Link} to={paths.novaEntrevista(vagaId)} variant="primary" icon={<PlusIcon size={16} />}>
          Nova entrevista para esta vaga
        </Button>
      </header>

      <Tabs
        label="Seções da vaga"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'candidatos', label: 'Candidatos', content: <CandidatosTab vagaId={vagaId} /> },
          {
            id: 'perguntas',
            label: 'Perguntas',
            content: <QuestionList positionId={vagaId} emptyText="Perguntas desta vaga aparecem, junto com as gerais, durante as entrevistas dela." />,
          },
          { id: 'perfil', label: 'Perfil da vaga', content: <PerfilTab vaga={vaga} /> },
        ]}
      />
    </div>
  );
}
