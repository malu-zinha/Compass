import { createContext, useContext } from 'react';

// Nós do cabeçalho do AppLayout onde cada página renderiza título e ações.
export const LayoutContext = createContext(null);
export const useLayoutSlots = () => useContext(LayoutContext);
