import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/*
 * Estado de tela que mora na URL: recarregar ou compartilhar o link mantém os
 * filtros e a aba. Valores iguais ao padrão não aparecem no endereço, e as
 * trocas usam `replace` para não encher o histórico do "voltar".
 */
export function useUrlFilters(defaults) {
  const [params, setParams] = useSearchParams();

  const filters = useMemo(
    () => Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, params.get(key) ?? value])),
    // defaults é um literal estável por tela; comparar pelo conteúdo evita recalcular a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params, JSON.stringify(defaults)],
  );

  const setFilter = useCallback((key, value) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === undefined || value === null || value === '' || String(value) === String(defaults[key])) next.delete(key);
      else next.set(key, String(value));
      return next;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setParams, JSON.stringify(defaults)]);

  return [filters, setFilter];
}

// Aba ativa em ?<name>=; ids desconhecidos caem na aba padrão.
export function useTabParam(ids, fallback = ids[0], name = 'aba') {
  const [filters, setFilter] = useUrlFilters({ [name]: fallback });
  const active = ids.includes(filters[name]) ? filters[name] : fallback;
  const setActive = useCallback((id) => setFilter(name, id), [setFilter, name]);
  return [active, setActive];
}
