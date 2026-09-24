import { useEffect, useState } from 'react';
import { listInterviews } from '../../api/interviews';

const PROCESSING = ['uploaded', 'transcribing', 'analyzing'];

/*
 * O que o Início precisa: o que pede atenção (falhas e em processamento), as
 * últimas concluídas e as contagens. O backend não tem endpoint de
 * estatística; cada número é o `total` de uma listagem.
 */
export function useHomeSummary() {
  const [state, setState] = useState({ loading: true, error: null, failed: [], processing: [], recent: [], counts: null });

  useEffect(() => {
    let active = true;
    Promise.all([
      listInterviews({ status: 'error', sort: '-created_at', perPage: 5 }),
      listInterviews({ status: PROCESSING, sort: '-created_at', perPage: 5 }),
      listInterviews({ status: 'done', sort: '-created_at', perPage: 6 }),
    ])
      .then(([failed, processing, recent]) => {
        if (!active) return;
        setState({
          loading: false,
          error: null,
          failed: failed.items,
          processing: processing.items,
          recent: recent.items,
          counts: { failed: failed.total, processing: processing.total, done: recent.total },
        });
      })
      .catch((error) => {
        if (active) setState((s) => ({ ...s, loading: false, error }));
      });
    return () => { active = false; };
  }, []);

  return state;
}
