import { useEffect, useState } from 'react';
import { listInterviews } from '../../api/interviews';
import { listPositions } from '../../api/positions';

/*
 * Vagas com o resumo de cada uma: total de entrevistas e a melhor pontuação
 * concluída. O backend não tem endpoint de estatística, então cada número é
 * uma listagem com per_page=1 lida pelo `total` / primeiro item.
 */
export function useVagasResumo() {
  const [state, setState] = useState({ loading: true, error: null, vagas: [] });

  useEffect(() => {
    let active = true;
    listPositions()
      .then(async ({ items }) => {
        const vagas = await Promise.all(items.map(async (vaga) => {
          const [todas, melhor] = await Promise.all([
            listInterviews({ positionId: vaga.id, perPage: 1 }),
            listInterviews({ positionId: vaga.id, status: 'done', sort: '-score', perPage: 1 }),
          ]);
          return { ...vaga, entrevistas: todas.total, melhor: melhor.items[0] ?? null };
        }));
        if (active) setState({ loading: false, error: null, vagas });
      })
      .catch((error) => {
        if (active) setState({ loading: false, error, vagas: [] });
      });
    return () => { active = false; };
  }, []);

  return state;
}
