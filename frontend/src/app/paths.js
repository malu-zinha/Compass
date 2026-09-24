/*
 * Todos os endereços do app num lugar só. Links e navegações usam estes
 * construtores em vez de strings soltas, então renomear uma rota é mudar uma
 * linha aqui. `ROUTE_PATTERNS` são os mesmos caminhos no formato do router.
 */

const query = (params) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : '';
};

export const paths = {
  landing: '/',
  login: '/login',
  cadastro: '/login?mode=register',

  inicio: '/inicio',

  entrevistas: '/entrevistas',
  entrevistasFiltradas: ({ vaga, status, q, ordem } = {}) => `/entrevistas${query({ vaga, status, q, ordem })}`,
  entrevista: (id) => `/entrevista/${id}`,

  vagas: '/vagas',
  novaVaga: '/vagas/nova',
  // A aba padrão (candidatos) não entra na URL.
  vaga: (id, aba) => `/vagas/${id}${query({ aba: aba === 'candidatos' ? undefined : aba })}`,
  editarVaga: (id) => `/vagas/${id}/editar`,
  comparar: (vagaId, ids) => `/vagas/${vagaId}/comparar?ids=${ids.join(',')}`,

  perguntas: '/perguntas',

  conta: (aba) => `/conta${query({ aba: aba === 'perfil' ? undefined : aba })}`,

  novaEntrevista: (vagaId) => `/nova-entrevista${query({ vaga: vagaId })}`,
  gravar: (id) => `/gravar/${id}`,
  enviar: '/enviar',
};

export const ROUTE_PATTERNS = {
  landing: '/',
  login: '/login',
  inicio: '/inicio',
  entrevistas: '/entrevistas',
  entrevista: '/entrevista/:id',
  vagas: '/vagas',
  novaVaga: '/vagas/nova',
  vaga: '/vagas/:id',
  editarVaga: '/vagas/:id/editar',
  comparar: '/vagas/:id/comparar',
  perguntas: '/perguntas',
  conta: '/conta',
  novaEntrevista: '/nova-entrevista',
  gravar: '/gravar/:id',
  enviar: '/enviar',
};
