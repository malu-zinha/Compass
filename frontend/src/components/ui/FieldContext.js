import { createContext, useContext } from 'react';

export const FieldContext = createContext(null);
export const useField = () => useContext(FieldContext);
