import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getInterview } from '../api/interviews';
import { paths } from './paths';

/*
 * Endereços antigos continuam funcionando: cada um redireciona (replace, sem
 * poluir o histórico) para o equivalente na organização nova.
 */

// Monta o destino a partir dos parâmetros da rota antiga, preservando a query.
export function ParamRedirect({ to }) {
  const params = useParams();
  const { search } = useLocation();
  return <Navigate to={to(params, search)} replace />;
}

// /comparar?ids= não dizia a vaga; descobre pela primeira entrevista.
export function LegacyCompareRedirect() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ids = (searchParams.get('ids') || '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0);

  useEffect(() => {
    let active = true;
    if (ids.length === 0) {
      navigate(paths.entrevistas, { replace: true });
      return undefined;
    }
    getInterview(ids[0])
      .then((interview) => {
        if (active) navigate(paths.comparar(interview.position_id, ids), { replace: true });
      })
      .catch(() => {
        if (active) navigate(paths.entrevistas, { replace: true });
      });
    return () => { active = false; };
    // ids vem da URL e só é lido uma vez, ao montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  return null;
}
