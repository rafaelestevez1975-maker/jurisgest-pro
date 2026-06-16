import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import type { AppState, Cliente, Processo, Prazo, Publicacao, Peticao, Advogado, Feriado, ConfigEscritorio, CredencialTribunal } from './types';
import { INITIAL_STATE } from './data';
import { loadState, db } from './lib/db';

type Action =
  | { type: 'SET_STATE'; payload: AppState }
  | { type: 'ADD_CLIENTE'; payload: Cliente }
  | { type: 'UPDATE_CLIENTE'; payload: Cliente }
  | { type: 'DELETE_CLIENTE'; payload: string }
  | { type: 'ADD_PROCESSO'; payload: Processo }
  | { type: 'UPDATE_PROCESSO'; payload: Processo }
  | { type: 'DELETE_PROCESSO'; payload: string }
  | { type: 'ADD_PRAZO'; payload: Prazo }
  | { type: 'UPDATE_PRAZO'; payload: Prazo }
  | { type: 'DELETE_PRAZO'; payload: string }
  | { type: 'ADD_PUBLICACAO'; payload: Publicacao }
  | { type: 'UPDATE_PUBLICACAO'; payload: Publicacao }
  | { type: 'DELETE_PUBLICACAO'; payload: string }
  | { type: 'ADD_PETICAO'; payload: Peticao }
  | { type: 'UPDATE_PETICAO'; payload: Peticao }
  | { type: 'DELETE_PETICAO'; payload: string }
  | { type: 'ADD_ADVOGADO'; payload: Advogado }
  | { type: 'UPDATE_ADVOGADO'; payload: Advogado }
  | { type: 'DELETE_ADVOGADO'; payload: string }
  | { type: 'ADD_FERIADO'; payload: Feriado }
  | { type: 'DELETE_FERIADO'; payload: string }
  | { type: 'UPDATE_ESCRITORIO'; payload: ConfigEscritorio }
  | { type: 'ADD_CREDENCIAL'; payload: CredencialTribunal }
  | { type: 'UPDATE_CREDENCIAL'; payload: CredencialTribunal }
  | { type: 'IMPORT_CLIENTES'; payload: Cliente[] }
  | { type: 'IMPORT_PROCESSOS'; payload: Processo[] }
  | { type: 'IMPORT_PETICOES'; payload: Peticao[] }
  | { type: 'IMPORT_PUBLICACOES'; payload: Publicacao[] }
  | { type: 'SET_ANTHROPIC_KEY'; payload: string };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_STATE': return action.payload;
    case 'ADD_CLIENTE': return { ...state, clientes: [...state.clientes, action.payload] };
    case 'UPDATE_CLIENTE': return { ...state, clientes: state.clientes.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'DELETE_CLIENTE': return { ...state, clientes: state.clientes.filter(c => c.id !== action.payload) };
    case 'ADD_PROCESSO': return { ...state, processos: [...state.processos, action.payload] };
    case 'UPDATE_PROCESSO': return { ...state, processos: state.processos.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PROCESSO': return { ...state, processos: state.processos.filter(p => p.id !== action.payload) };
    case 'ADD_PRAZO': return { ...state, prazos: [...state.prazos, action.payload] };
    case 'UPDATE_PRAZO': return { ...state, prazos: state.prazos.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PRAZO': return { ...state, prazos: state.prazos.filter(p => p.id !== action.payload) };
    case 'ADD_PUBLICACAO': return { ...state, publicacoes: [...state.publicacoes, action.payload] };
    case 'UPDATE_PUBLICACAO': return { ...state, publicacoes: state.publicacoes.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PUBLICACAO': return { ...state, publicacoes: state.publicacoes.filter(p => p.id !== action.payload) };
    case 'ADD_PETICAO': return { ...state, peticoes: [...state.peticoes, action.payload] };
    case 'UPDATE_PETICAO': return { ...state, peticoes: state.peticoes.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PETICAO': return { ...state, peticoes: state.peticoes.filter(p => p.id !== action.payload) };
    case 'ADD_ADVOGADO': return { ...state, advogados: [...state.advogados, action.payload] };
    case 'UPDATE_ADVOGADO': return { ...state, advogados: state.advogados.map(a => a.id === action.payload.id ? action.payload : a) };
    case 'DELETE_ADVOGADO': return { ...state, advogados: state.advogados.filter(a => a.id !== action.payload) };
    case 'ADD_FERIADO': return { ...state, feriadosMunicipais: [...state.feriadosMunicipais, action.payload] };
    case 'DELETE_FERIADO': return { ...state, feriadosMunicipais: state.feriadosMunicipais.filter(f => f.id !== action.payload) };
    case 'UPDATE_ESCRITORIO': return { ...state, escritorio: action.payload };
    case 'ADD_CREDENCIAL': return { ...state, credenciais: [...state.credenciais, action.payload] };
    case 'UPDATE_CREDENCIAL': return { ...state, credenciais: state.credenciais.map(c => c.tribunal === action.payload.tribunal ? action.payload : c) };
    case 'IMPORT_CLIENTES': return { ...state, clientes: [...state.clientes, ...action.payload] };
    case 'IMPORT_PROCESSOS': return { ...state, processos: [...state.processos, ...action.payload] };
    case 'IMPORT_PETICOES': return { ...state, peticoes: [...state.peticoes, ...action.payload] };
    case 'IMPORT_PUBLICACOES': return { ...state, publicacoes: [...state.publicacoes, ...action.payload] };
    case 'SET_ANTHROPIC_KEY': return { ...state, anthropicApiKey: action.payload };
    default: return state;
  }
}

// Sync action → Supabase (fire-and-forget; optimistic UI via reducer)
function syncToSupabase(action: Action, nextState: AppState) {
  switch (action.type) {
    case 'ADD_CLIENTE':
    case 'UPDATE_CLIENTE':
      db.upsertCliente(action.payload); break;
    case 'DELETE_CLIENTE':
      db.deleteCliente(action.payload); break;

    case 'ADD_PROCESSO':
    case 'UPDATE_PROCESSO':
      db.upsertProcesso(action.payload); break;
    case 'DELETE_PROCESSO':
      db.deleteProcesso(action.payload); break;

    case 'ADD_PRAZO':
    case 'UPDATE_PRAZO':
      db.upsertPrazo(action.payload); break;
    case 'DELETE_PRAZO':
      db.deletePrazo(action.payload); break;

    case 'ADD_PUBLICACAO':
    case 'UPDATE_PUBLICACAO':
      db.upsertPublicacao(action.payload); break;
    case 'DELETE_PUBLICACAO':
      db.deletePublicacao(action.payload); break;

    case 'ADD_PETICAO':
    case 'UPDATE_PETICAO':
      db.upsertPeticao(action.payload); break;
    case 'DELETE_PETICAO':
      db.deletePeticao(action.payload); break;

    case 'ADD_ADVOGADO':
    case 'UPDATE_ADVOGADO':
      db.upsertAdvogado(action.payload); break;
    case 'DELETE_ADVOGADO':
      db.deleteAdvogado(action.payload); break;

    case 'ADD_FERIADO':
      db.upsertFeriado(action.payload); break;
    case 'DELETE_FERIADO':
      db.deleteFeriado(action.payload); break;

    case 'UPDATE_ESCRITORIO':
      db.upsertEscritorio(action.payload, nextState.anthropicApiKey); break;
    case 'SET_ANTHROPIC_KEY':
      db.upsertEscritorio(nextState.escritorio, action.payload); break;

    case 'ADD_CREDENCIAL':
    case 'UPDATE_CREDENCIAL':
      db.upsertCredencial(action.payload); break;

    case 'IMPORT_CLIENTES':
      action.payload.forEach(c => db.upsertCliente(c)); break;
    case 'IMPORT_PROCESSOS':
      action.payload.forEach(p => db.upsertProcesso(p)); break;
    case 'IMPORT_PETICOES':
      action.payload.forEach(p => db.upsertPeticao(p)); break;
    case 'IMPORT_PUBLICACOES':
      action.payload.forEach(p => db.upsertPublicacao(p)); break;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  loading: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, baseDispatch] = useReducer(reducer, INITIAL_STATE);
  const [loading, setLoading] = useState(true);

  // Load from Supabase on mount, fall back to localStorage
  useEffect(() => {
    loadState()
      .then(remote => {
        // If DB is empty (no clientes), seed with INITIAL_STATE sample data
        if (remote.clientes.length === 0 && remote.processos.length === 0) {
          const seed = INITIAL_STATE;
          baseDispatch({ type: 'SET_STATE', payload: seed });
          // Persist seed data to Supabase
          seed.clientes.forEach(c => db.upsertCliente(c));
          seed.processos.forEach(p => db.upsertProcesso(p));
          seed.prazos.forEach(p => db.upsertPrazo(p));
          seed.publicacoes.forEach(p => db.upsertPublicacao(p));
          seed.peticoes.forEach(p => db.upsertPeticao(p));
          seed.advogados.forEach(a => db.upsertAdvogado(a));
          seed.feriadosMunicipais.forEach(f => db.upsertFeriado(f));
          db.upsertEscritorio(seed.escritorio, seed.anthropicApiKey);
        } else {
          baseDispatch({ type: 'SET_STATE', payload: remote });
        }
      })
      .catch(() => {
        // offline: try localStorage fallback
        try {
          const saved = localStorage.getItem('jurisgest_data');
          if (saved) baseDispatch({ type: 'SET_STATE', payload: JSON.parse(saved) });
        } catch { /* use INITIAL_STATE */ }
      })
      .finally(() => setLoading(false));
  }, []);

  // Dispatch wrapper: update state optimistically, then sync to Supabase
  const dispatch: React.Dispatch<Action> = (action: Action) => {
    baseDispatch(action);
    // Compute next state for actions that need it (escritorio/apiKey updates)
    const nextState = reducer(state, action);
    syncToSupabase(action, nextState);
    // Also keep localStorage as offline cache
    try {
      localStorage.setItem('jurisgest_data', JSON.stringify(nextState));
    } catch { /* ignore */ }
  };

  return (
    <AppContext.Provider value={{ state, dispatch, loading }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function genId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}
