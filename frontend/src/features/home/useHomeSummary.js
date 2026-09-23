import { useEffect, useState } from 'react';
import { listInterviews } from '../../api/interviews';
import { listPositions } from '../../api/positions';

const PROCESSING = ['uploaded', 'transcribing', 'analyzing'];

/*
 * Números do painel e as últimas entrevistas. Cada contagem é uma listagem com
 * per_page=1 lida só pelo `total` — o backend não tem endpoint de estatística,
 * e isso evita trazer páginas inteiras para contar.
 */
export function useHomeSummary() {
  const [state, setState] = useState({ loading: true, error: null, stats: null, recent: [] });

  useEffect(() => {
    let active = true;
    const count = (status) => listInterviews({ status, perPage: 1 }).then((p) => p.total);
    Promise.all([
      count('done'),
      count(PROCESSING),
      count('error'),
      listPositions().then((p) => p.total ?? p.items.length),
      listInterviews({ sort: '-created_at', perPage: 5 }).then((p) => p.items),
    ])
      .then(([done, processing, failed, positions, recent]) => {
        if (active) setState({ loading: false, error: null, stats: { done, processing, failed, positions }, recent });
      })
      .catch((error) => {
        if (active) setState({ loading: false, error, stats: null, recent: [] });
      });
    return () => { active = false; };
  }, []);

  return state;
}
