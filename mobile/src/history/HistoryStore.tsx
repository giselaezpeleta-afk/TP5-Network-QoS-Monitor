import React, { createContext, useContext, useReducer } from 'react';
import { HistoryRow } from './model';

type HistoryState = {
  rows: HistoryRow[];
  total: number;
  threshold: number;
};
type HistoryAction = { type: 'loaded'; payload: HistoryState };
const initialState: HistoryState = { rows: [], total: 0, threshold: 500 };

function reducer(_state: HistoryState, action: HistoryAction): HistoryState {
  // Una consulta reemplaza datos, cantidad y umbral juntos: mapa y gráficos
  // nunca reciben una mezcla de resultados de dos consultas diferentes.
  return action.payload;
}

const HistoryContext = createContext<{
  state: HistoryState;
  dispatch: React.Dispatch<HistoryAction>;
} | null>(null);

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  // SQLite sigue siendo la persistencia, incluso con la interfaz cerrada.
  // Este store contiene solamente la consulta visible, acotada a 2.000 filas.
  return (
    <HistoryContext.Provider value={{ state, dispatch }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistoryStore() {
  const store = useContext(HistoryContext);
  if (!store) throw new Error('HistoryProvider debe envolver la interfaz.');
  return store;
}
